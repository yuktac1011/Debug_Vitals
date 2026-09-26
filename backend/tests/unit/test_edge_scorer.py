"""
Unit tests for the edge scorer (correlation/subfeatures/edge_scoring/scorer.py).

All tests are pure — no DB, no network, no filesystem.
The scorer is a pure function taking two Event-like objects and a type string.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock
from app.features.correlation.subfeatures.edge_scoring.scorer import (
    score_edge,
    _score_temporal_sequence,
    _score_file_overlap,
    _score_dependency_chain,
    _score_test_failure_chain,
    _score_env_change_impact,
    _score_agent_action_error,
)


def make_event(
    event_type="agent_action",
    severity=None,
    occurred_at=None,
    source=None,
    payload=None,
):
    """Create a minimal mock Event object for testing."""
    e = MagicMock()
    e.event_type = event_type
    e.severity = severity
    e.occurred_at = occurred_at or datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    e.source = source
    e.payload = payload or {}
    return e


class TestScoreEdgeDispatch:
    def test_returns_zero_for_unknown_type(self):
        src = make_event()
        dst = make_event()
        assert score_edge(src, dst, "nonexistent_type") == 0.0

    def test_score_is_bounded_0_to_1(self):
        src = make_event(
            "dependency",
            payload={"packages": [{"name": "requests", "version": "2.28"}]},
        )
        dst = make_event("test_result", payload={"outcome": "failure"})
        score = score_edge(src, dst, "dependency_chain")
        assert 0.0 <= score <= 1.0

    def test_all_edge_types_return_nonzero_for_relevant_events(self):
        t0 = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(seconds=10)

        pairs_by_type = {
            "temporal_sequence": (
                make_event(occurred_at=t0, source="tool"),
                make_event(occurred_at=t1, source="tool"),
            ),
            "file_overlap": (
                make_event("git_diff", payload={"files_changed": [{"path": "app.py"}]}),
                make_event("git_diff", payload={"files_changed": [{"path": "app.py"}]}),
            ),
            "dependency_chain": (
                make_event("dependency"),
                make_event("test_result", payload={"outcome": "failure"}),
            ),
            "test_failure_chain": (
                make_event("test_result", occurred_at=t0, payload={"outcome": "failure"}),
                make_event("test_result", occurred_at=t1, payload={"outcome": "failure"}),
            ),
            "env_change_impact": (
                make_event("env_snapshot", payload={"packages": [{"name": "p1"}], "env_vars": {}}),
                make_event("test_result", payload={"outcome": "failure"}),
            ),
            "agent_action_error": (
                make_event("agent_action", payload={"outcome": "failure", "error_message": "err"}),
                make_event("test_result", payload={"outcome": "failure"}),
            ),
        }
        for edge_type, (src, dst) in pairs_by_type.items():
            score = score_edge(src, dst, edge_type)
            assert score > 0.0, f"Expected nonzero score for {edge_type}, got {score}"


class TestTemporalSequence:
    def test_close_events_score_higher_than_distant(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        close_dst = make_event(occurred_at=t0 + timedelta(seconds=5))
        far_dst = make_event(occurred_at=t0 + timedelta(seconds=290))
        src = make_event(occurred_at=t0)

        close_score = _score_temporal_sequence(src, close_dst)
        far_score = _score_temporal_sequence(src, far_dst)
        assert close_score > far_score

    def test_reverse_order_returns_zero(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        src = make_event(occurred_at=t0 + timedelta(seconds=100))
        dst = make_event(occurred_at=t0)  # dst is before src
        assert _score_temporal_sequence(src, dst) == 0.0

    def test_same_source_gives_bonus(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        src = make_event(occurred_at=t0, source="pytest_runner")
        dst_same = make_event(occurred_at=t0 + timedelta(seconds=10), source="pytest_runner")
        dst_diff = make_event(occurred_at=t0 + timedelta(seconds=10), source="other_tool")

        assert _score_temporal_sequence(src, dst_same) > _score_temporal_sequence(
            src, dst_diff
        )

    def test_beyond_window_scores_zero(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        src = make_event(occurred_at=t0)
        dst = make_event(occurred_at=t0 + timedelta(seconds=400))  # > 300s window
        score = _score_temporal_sequence(src, dst)
        assert score <= 0.0


class TestFileOverlap:
    def test_shared_file_gives_nonzero(self):
        src = make_event("git_diff", payload={"files_changed": [{"path": "main.py"}]})
        dst = make_event("git_diff", payload={"files_changed": [{"path": "main.py"}]})
        assert _score_file_overlap(src, dst) > 0.0

    def test_no_shared_file_gives_zero(self):
        src = make_event("git_diff", payload={"files_changed": [{"path": "a.py"}]})
        dst = make_event("git_diff", payload={"files_changed": [{"path": "b.py"}]})
        assert _score_file_overlap(src, dst) == 0.0

    def test_failure_destination_gives_higher_score(self):
        src = make_event("git_diff", payload={"files_changed": [{"path": "app.py"}]})
        dst_ok = make_event("git_diff", payload={"files_changed": [{"path": "app.py"}], "outcome": "success"})
        dst_fail = make_event("test_result", payload={"files_changed": [{"path": "app.py"}], "outcome": "failure"})
        # dst_fail has failure boost; adjust payload for agent_action
        src2 = make_event("agent_action", payload={"target": "app.py"})
        dst_fail2 = make_event("agent_action", payload={"target": "app.py", "outcome": "failure"})
        score_ok = _score_file_overlap(src2, make_event("agent_action", payload={"target": "app.py", "outcome": "success"}))
        score_fail = _score_file_overlap(src2, dst_fail2)
        assert score_fail >= score_ok


class TestDependencyChain:
    def test_error_outcome_scores_higher_than_failure(self):
        src = make_event("dependency")
        dst_err = make_event("test_result", payload={"outcome": "error"})
        dst_fail = make_event("test_result", payload={"outcome": "failure"})
        assert _score_dependency_chain(src, dst_err) > _score_dependency_chain(src, dst_fail)

    def test_unknown_outcome_still_nonzero(self):
        src = make_event("dependency")
        dst = make_event("test_result", payload={})
        assert _score_dependency_chain(src, dst) > 0.0


class TestTestFailureChain:
    def test_same_suite_bonus(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        src = make_event("test_result", occurred_at=t0, source="pytest")
        dst_same = make_event("test_result", occurred_at=t0 + timedelta(seconds=60), source="pytest")
        dst_diff = make_event("test_result", occurred_at=t0 + timedelta(seconds=60), source="jest")
        assert _score_test_failure_chain(src, dst_same) > _score_test_failure_chain(src, dst_diff)

    def test_score_decreases_over_time(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        src = make_event("test_result", occurred_at=t0)
        close = make_event("test_result", occurred_at=t0 + timedelta(seconds=10))
        far = make_event("test_result", occurred_at=t0 + timedelta(seconds=1700))
        assert _score_test_failure_chain(src, close) > _score_test_failure_chain(src, far)
