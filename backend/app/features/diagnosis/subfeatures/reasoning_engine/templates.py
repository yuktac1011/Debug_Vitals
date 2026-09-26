"""
Fallback explanation templates for when the LLM is unavailable.

Templates are keyed by event_type of the top-ranked root cause.
They produce deterministic, readable plain-language explanations
from structured data — no LLM required.

Design:
- One template per event type (plus a catch-all "generic").
- Templates receive a context dict with keys: event, root_causes, session.
- Templates return a string explanation.
"""

from typing import Any, Dict, List, Optional


def render_explanation(
    root_causes: List[Dict[str, Any]],
    session_id: str,
    total_events: int,
    graph_edge_count: int = 0,
) -> str:
    """
    Generate a plain-language explanation from ranked root causes.

    Parameters
    ----------
    root_causes:
        Ordered list of root cause dicts (output of ranker.to_dict()).
    session_id:
        Session identifier for reference in the explanation.
    total_events:
        Total number of events analysed.
    graph_edge_count:
        Number of causal edges in the correlation graph.

    Returns
    -------
    str
        Human-readable explanation suitable for display in the UI.
    """
    if not root_causes:
        return (
            f"Analysis of session {session_id} examined {total_events} event(s) "
            f"but could not identify a likely root cause. "
            "All events appear to be low-severity or lack causal connections. "
            "Consider adding more detailed event logging to improve diagnosis accuracy."
        )

    top = root_causes[0]
    top_type = top.get("event_type") or "unknown"
    top_score = top.get("score", 0.0)
    top_reason = top.get("reason", "")

    renderer = _TEMPLATE_MAP.get(top_type, _render_generic)
    explanation = renderer(top, root_causes, total_events, graph_edge_count)

    confidence = _score_to_confidence_label(top_score)
    suffix = (
        f" The analysis examined {total_events} event(s) and found "
        f"{graph_edge_count} causal connection(s)."
    )

    return f"[{confidence} confidence] {explanation}{suffix}"


# ── Per-type templates ─────────────────────────────────────────────────────────

def _render_agent_action(
    top: Dict[str, Any],
    all_causes: List[Dict[str, Any]],
    total_events: int,
    edge_count: int,
) -> str:
    tool = top.get("payload", {}).get("tool_name") or "an agent tool"
    target = top.get("payload", {}).get("target") or "unknown target"
    outcome = top.get("payload", {}).get("outcome") or "failure"
    return (
        f"The most likely root cause is a failed action by the AI agent using {tool} "
        f"on '{target}' (outcome: {outcome}). "
        f"This action has the strongest causal link to subsequent failures in the session."
    )


def _render_dependency(
    top: Dict[str, Any],
    all_causes: List[Dict[str, Any]],
    total_events: int,
    edge_count: int,
) -> str:
    packages = top.get("payload", {}).get("packages", [])
    package_names = ", ".join(
        p.get("name", "?") for p in packages[:3] if isinstance(p, dict)
    )
    return (
        f"The most likely root cause is a dependency change event "
        + (f"involving package(s): {package_names}. " if package_names else ". ")
        + "This change preceded test or build failures with a high causal score."
    )


def _render_env_snapshot(
    top: Dict[str, Any],
    all_causes: List[Dict[str, Any]],
    total_events: int,
    edge_count: int,
) -> str:
    return (
        "The most likely root cause is an environment state change. "
        "One or more environment variables or installed packages were modified "
        "immediately before failures began. "
        "Review recent environment changes to identify the problematic modification."
    )


def _render_git_diff(
    top: Dict[str, Any],
    all_causes: List[Dict[str, Any]],
    total_events: int,
    edge_count: int,
) -> str:
    files = top.get("payload", {}).get("files_changed", [])
    file_list = ", ".join(
        f.get("path", "?") for f in files[:3] if isinstance(f, dict)
    )
    return (
        f"The most likely root cause is a code change "
        + (f"to file(s): {file_list}. " if file_list else ". ")
        + "This diff correlates strongly with subsequent test or build failures."
    )


def _render_test_result(
    top: Dict[str, Any],
    all_causes: List[Dict[str, Any]],
    total_events: int,
    edge_count: int,
) -> str:
    return (
        "The most likely root cause is an initial test failure that propagated through "
        "the test suite. The first failing test appears to have triggered a cascade of "
        "related failures."
    )


def _render_generic(
    top: Dict[str, Any],
    all_causes: List[Dict[str, Any]],
    total_events: int,
    edge_count: int,
) -> str:
    event_type = top.get("event_type", "unknown")
    return (
        f"The most likely root cause is a '{event_type}' event with high causal centrality. "
        "This event has strong directed connections to downstream failures in the session graph."
    )


def _score_to_confidence_label(score: float) -> str:
    if score >= 0.75:
        return "High"
    if score >= 0.45:
        return "Medium"
    return "Low"


# Dispatcher map — event_type → template function
_TEMPLATE_MAP = {
    "agent_action": _render_agent_action,
    "dependency": _render_dependency,
    "env_snapshot": _render_env_snapshot,
    "git_diff": _render_git_diff,
    "test_result": _render_test_result,
}
