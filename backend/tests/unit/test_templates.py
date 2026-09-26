"""
Unit tests for reasoning_engine/templates.py.
Pure function — no I/O.
"""

import pytest
from app.features.diagnosis.subfeatures.reasoning_engine.templates import (
    render_explanation,
    _score_to_confidence_label,
)


class TestRenderExplanation:
    def test_empty_causes_returns_no_cause_message(self):
        result = render_explanation([], session_id="sess-1", total_events=5)
        assert "could not identify" in result.lower()

    def test_agent_action_top_cause(self):
        causes = [
            {
                "event_type": "agent_action",
                "score": 0.85,
                "rank": 1,
                "reason": "failed bash command",
                "payload": {"tool_name": "bash", "target": "pytest tests/"},
            }
        ]
        result = render_explanation(causes, session_id="test-sess", total_events=20)
        assert "bash" in result
        assert "High" in result

    def test_dependency_top_cause(self):
        causes = [
            {
                "event_type": "dependency",
                "score": 0.65,
                "rank": 1,
                "reason": "dependency change",
                "payload": {"packages": [{"name": "requests"}, {"name": "numpy"}]},
            }
        ]
        result = render_explanation(causes, session_id="test", total_events=10)
        assert "dependency" in result.lower()
        assert "requests" in result

    def test_includes_event_count(self):
        causes = [{"event_type": "git_diff", "score": 0.5, "rank": 1, "reason": "code change", "payload": {}}]
        result = render_explanation(causes, session_id="s1", total_events=42)
        assert "42" in result

    def test_generic_fallback_for_unknown_type(self):
        causes = [{"event_type": "unknown_type", "score": 0.4, "rank": 1, "reason": "some reason", "payload": {}}]
        result = render_explanation(causes, session_id="s1", total_events=5)
        assert "unknown_type" in result

    def test_confidence_labels(self):
        assert _score_to_confidence_label(0.8) == "High"
        assert _score_to_confidence_label(0.5) == "Medium"
        assert _score_to_confidence_label(0.3) == "Low"

    def test_medium_confidence(self):
        causes = [{"event_type": "env_snapshot", "score": 0.55, "rank": 1, "reason": "env change", "payload": {}}]
        result = render_explanation(causes, session_id="s1", total_events=5)
        assert "Medium" in result
