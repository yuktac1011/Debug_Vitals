"""
Unit tests for the root cause ranker (diagnosis/subfeatures/root_cause_ranker/ranker.py).

All tests are pure — no DB, no network.
The ranker receives a NetworkX DiGraph and a dict of mock Event objects.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

import networkx as nx

from app.features.diagnosis.subfeatures.root_cause_ranker.ranker import (
    rank_root_causes,
    RankedCause,
    _failure_score,
    _temporal_centrality,
    _time_bounds,
    _collect_timestamps,
)


def make_event(
    event_type="agent_action",
    severity=None,
    occurred_at=None,
    payload=None,
    source=None,
):
    e = MagicMock()
    e.id = uuid.uuid4()
    e.event_type = event_type
    e.severity = severity
    e.occurred_at = occurred_at or datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    e.source = source
    e.payload = payload or {}
    return e


def build_graph_with_events(edges, node_events):
    """
    Build a simple DiGraph for testing.
    edges: list of (src_id, dst_id, weight) tuples
    node_events: dict of id → Event mock
    """
    G = nx.DiGraph()
    for node_id, event in node_events.items():
        G.add_node(
            node_id,
            event_type=event.event_type,
            occurred_at=event.occurred_at.isoformat(),
            severity=event.severity,
        )
    for src, dst, weight in edges:
        G.add_edge(src, dst, weight=weight, type="temporal_sequence", types=["temporal_sequence"])
    return G


class TestRankRootCauses:
    def test_empty_graph_returns_empty_list(self):
        G = nx.DiGraph()
        assert rank_root_causes(G, {}) == []

    def test_single_node_returns_single_result(self):
        event = make_event("agent_action", severity="error")
        nid = str(event.id)
        G = nx.DiGraph()
        G.add_node(nid, event_type="agent_action", occurred_at="2024-01-01T12:00:00+00:00", severity="error")
        results = rank_root_causes(G, {nid: event})
        assert len(results) == 1
        assert results[0].event_id == nid
        assert results[0].rank == 1

    def test_error_severity_scores_higher_than_info(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        e_error = make_event("agent_action", severity="error", occurred_at=t0)
        e_info = make_event("agent_action", severity="info", occurred_at=t0 + timedelta(seconds=60))

        nid_e = str(e_error.id)
        nid_i = str(e_info.id)

        G = build_graph_with_events(
            edges=[(nid_e, nid_i, 0.8)],
            node_events={nid_e: e_error, nid_i: e_info},
        )
        results = rank_root_causes(G, {nid_e: e_error, nid_i: e_info})
        # The error event should rank first
        assert results[0].event_id == nid_e

    def test_high_out_degree_ranks_higher(self):
        """A node with many outgoing edges should rank as a stronger root cause."""
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        root = make_event("agent_action", severity="warning", occurred_at=t0)
        leaf1 = make_event("test_result", severity=None, occurred_at=t0 + timedelta(seconds=30))
        leaf2 = make_event("test_result", severity=None, occurred_at=t0 + timedelta(seconds=60))
        leaf3 = make_event("ci_result", severity=None, occurred_at=t0 + timedelta(seconds=90))
        isolated = make_event("custom", severity=None, occurred_at=t0 + timedelta(seconds=10))

        events = {
            str(root.id): root,
            str(leaf1.id): leaf1,
            str(leaf2.id): leaf2,
            str(leaf3.id): leaf3,
            str(isolated.id): isolated,
        }
        G = build_graph_with_events(
            edges=[
                (str(root.id), str(leaf1.id), 0.9),
                (str(root.id), str(leaf2.id), 0.8),
                (str(root.id), str(leaf3.id), 0.7),
                # isolated has no edges
            ],
            node_events=events,
        )
        results = rank_root_causes(G, events)
        assert results[0].event_id == str(root.id)

    def test_top_n_limits_results(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        events = {}
        G = nx.DiGraph()
        for i in range(20):
            e = make_event(occurred_at=t0 + timedelta(seconds=i * 10))
            nid = str(e.id)
            events[nid] = e
            G.add_node(nid, event_type=e.event_type, occurred_at=e.occurred_at.isoformat(), severity=None)

        results = rank_root_causes(G, events, top_n=5)
        assert len(results) <= 5

    def test_ranked_causes_have_unique_ranks(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        events = {}
        G = nx.DiGraph()
        for i in range(5):
            e = make_event(severity="error" if i == 0 else "info", occurred_at=t0 + timedelta(seconds=i * 10))
            nid = str(e.id)
            events[nid] = e
            G.add_node(nid, event_type=e.event_type, occurred_at=e.occurred_at.isoformat(), severity=e.severity)

        results = rank_root_causes(G, events)
        ranks = [r.rank for r in results]
        assert ranks == sorted(ranks)
        assert len(ranks) == len(set(ranks))

    def test_to_dict_structure(self):
        event = make_event("agent_action", severity="error")
        nid = str(event.id)
        G = nx.DiGraph()
        G.add_node(nid, event_type="agent_action", occurred_at="2024-01-01T12:00:00+00:00", severity="error")
        results = rank_root_causes(G, {nid: event})
        d = results[0].to_dict()
        assert "event_id" in d
        assert "score" in d
        assert "rank" in d
        assert "reason" in d
        assert "contributing_factors" in d
        assert isinstance(d["score"], float)


class TestFailureScore:
    def test_error_severity_max_signal(self):
        e = make_event(severity="error", payload={"outcome": "failure"})
        score = _failure_score(e)
        assert score > 0.8

    def test_no_severity_no_outcome_returns_zero(self):
        e = make_event(severity=None, payload={})
        assert _failure_score(e) == 0.0

    def test_critical_with_error_outcome_caps_at_1(self):
        e = make_event(severity="critical", payload={"outcome": "error"})
        assert _failure_score(e) <= 1.0

    def test_warning_returns_partial_score(self):
        e = make_event(severity="warning", payload={})
        score = _failure_score(e)
        assert 0.0 < score < 0.5


class TestTemporalCentrality:
    def test_event_at_midpoint_scores_highest(self):
        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        events = {
            "e1": make_event(occurred_at=t0),
            "e2": make_event(occurred_at=t0 + timedelta(seconds=150)),  # midpoint
            "e3": make_event(occurred_at=t0 + timedelta(seconds=300)),
        }
        timestamps = {k: v.occurred_at.timestamp() for k, v in events.items()}
        t_min, t_max = _time_bounds(timestamps)

        score_early = _temporal_centrality("e1", timestamps, t_min, t_max)
        score_mid = _temporal_centrality("e2", timestamps, t_min, t_max)
        score_late = _temporal_centrality("e3", timestamps, t_min, t_max)
        assert score_mid >= score_early
        assert score_mid >= score_late

    def test_single_event_returns_neutral(self):
        timestamps = {"e1": 1000.0}
        t_min, t_max = _time_bounds(timestamps)
        score = _temporal_centrality("e1", timestamps, t_min, t_max)
        assert score == 0.5  # neutral for single point


class TestBuildGraph:
    """Integration-style test: build_correlation_graph end-to-end with mock events."""

    def test_graph_built_from_events(self):
        from app.features.correlation.subfeatures.graph_builder.builder import build_correlation_graph

        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        events = [
            make_event("dependency", occurred_at=t0, payload={"packages": [{"name": "foo"}]}),
            make_event("test_result", occurred_at=t0 + timedelta(seconds=10), payload={"outcome": "failure"}),
            make_event("ci_result", occurred_at=t0 + timedelta(seconds=20), payload={"conclusion": "failure"}),
        ]
        G = build_correlation_graph(events)
        assert G.number_of_nodes() == 3
        assert G.number_of_edges() >= 1

    def test_graph_has_no_self_loops(self):
        from app.features.correlation.subfeatures.graph_builder.builder import build_correlation_graph

        t0 = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
        events = [make_event(occurred_at=t0 + timedelta(seconds=i)) for i in range(5)]
        G = build_correlation_graph(events)
        assert list(nx.selfloop_edges(G)) == []
