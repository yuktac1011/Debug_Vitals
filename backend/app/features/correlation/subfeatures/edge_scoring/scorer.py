"""
Edge scoring — computes the weight of a directed edge in the correlation graph.

Weights are floats in [0.0, 1.0]:
  0.0 = no meaningful relationship
  1.0 = maximum causal confidence

Design principles:
- Pure functions only; no I/O, no side effects, fully unit-testable.
- Each scoring rule is a separate function, named after the edge type.
- The main entry point `score_edge` dispatches to the appropriate rule.
- Rules are composable: the dispatcher can accumulate partial scores.
- Scores are capped at 1.0 after all contributions.

Scoring factors per edge type:
  temporal_sequence  — recency (closer in time = higher score), same-source bonus
  file_overlap       — number of shared files, severity bonus if one event is an error
  dependency_chain   — always non-zero when link exists; severity of failure boosts it
  test_failure_chain — proximity in time + same test suite bonus
  env_change_impact  — severity of change (how many env vars / packages changed)
  agent_action_error — severity of the error + whether target matches a later failure
"""

from datetime import datetime
from typing import Any, Dict, Optional

from app.models.event import Event


def score_edge(src: Event, dst: Event, edge_type: str) -> float:
    """
    Compute the weight of a directed edge from `src` to `dst`.

    Parameters
    ----------
    src:
        The earlier (cause-side) event.
    dst:
        The later (effect-side) event.
    edge_type:
        One of the EDGE_TYPES constants from graph_builder.builder.

    Returns
    -------
    float
        Weight in [0.0, 1.0].  0.0 means the edge should not be added.
    """
    scorer = _SCORER_MAP.get(edge_type)
    if scorer is None:
        return 0.0
    score = scorer(src, dst)
    return min(1.0, max(0.0, score))


# ── Individual scoring rules ───────────────────────────────────────────────────

def _score_temporal_sequence(src: Event, dst: Event) -> float:
    """
    Events closer together in time get a higher score.
    Base score decays linearly over a 5-minute window.
    Bonus if both events share the same source (same tool / same agent step).
    """
    if src.occurred_at is None or dst.occurred_at is None:
        return 0.1  # unknown time → minimal score

    delta_seconds = (dst.occurred_at - src.occurred_at).total_seconds()
    if delta_seconds < 0:
        return 0.0  # dst is before src — no forward edge

    WINDOW = 300.0  # 5 minutes
    decay_score = max(0.0, 1.0 - (delta_seconds / WINDOW))

    # Same-source bonus (e.g. both from "pytest_runner")
    source_bonus = 0.15 if (src.source and src.source == dst.source) else 0.0

    # Severity escalation bonus: lower severity → higher severity is notable
    severity_bonus = 0.0
    if _severity_rank(dst.severity) > _severity_rank(src.severity):
        severity_bonus = 0.10

    return decay_score + source_bonus + severity_bonus


def _score_file_overlap(src: Event, dst: Event) -> float:
    """
    Higher score when more files overlap.
    Error/failure event on an overlapping file further boosts the score.
    """
    src_files = _extract_files(src)
    dst_files = _extract_files(dst)
    if not src_files or not dst_files:
        return 0.0

    overlap = src_files & dst_files
    if not overlap:
        return 0.0

    # Jaccard similarity of file sets as base
    union_size = len(src_files | dst_files)
    base_score = len(overlap) / union_size if union_size > 0 else 0.0

    # Boost if the destination event is a failure/error on an overlapping file
    dst_payload = dst.payload or {}
    outcome = (
        dst_payload.get("outcome")
        or dst_payload.get("status")
        or dst_payload.get("conclusion")
    )
    failure_boost = 0.3 if outcome in ("failure", "error", "failed") else 0.0

    return base_score + failure_boost


def _score_dependency_chain(src: Event, dst: Event) -> float:
    """
    A dependency install event followed by a test or build failure.
    Base score 0.6; boosted if the destination is an error (not just a failure).
    """
    dst_payload = dst.payload or {}
    outcome = (
        dst_payload.get("outcome")
        or dst_payload.get("status")
        or dst_payload.get("conclusion")
        or dst_payload.get("result")
    )
    if outcome in ("error",):
        return 0.85
    if outcome in ("failure", "failed"):
        return 0.65
    return 0.40  # unknown outcome; link exists but confidence is lower


def _score_test_failure_chain(src: Event, dst: Event) -> float:
    """
    Consecutive test failures.
    Penalises if the failures are far apart in time (likely unrelated).
    Bonus if they are in the same test suite (same source).
    """
    if src.occurred_at is None or dst.occurred_at is None:
        return 0.4

    delta = (dst.occurred_at - src.occurred_at).total_seconds()
    if delta < 0:
        return 0.0

    # Score decays more slowly than temporal_sequence — failures within 30 min are related
    WINDOW = 1800.0
    decay_score = max(0.0, 0.7 * (1.0 - delta / WINDOW))

    same_suite = 0.2 if (src.source and src.source == dst.source) else 0.0
    return decay_score + same_suite


def _score_env_change_impact(src: Event, dst: Event) -> float:
    """
    An env snapshot change followed by a failure.
    Score is proportional to how significant the env change was.
    """
    src_payload = src.payload or {}
    packages_changed = len(src_payload.get("packages", []))
    env_vars_changed = len(src_payload.get("env_vars", {}))

    # Base: 0.5; significant changes raise it
    change_magnitude = min(1.0, (packages_changed + env_vars_changed) / 20)
    base = 0.5 + (0.3 * change_magnitude)

    # Bonus if destination is a hard error
    dst_payload = dst.payload or {}
    outcome = dst_payload.get("outcome") or dst_payload.get("status")
    error_boost = 0.15 if outcome in ("error", "failure", "failed") else 0.0

    return base + error_boost


def _score_agent_action_error(src: Event, dst: Event) -> float:
    """
    A failed agent action followed by a downstream event.
    Higher score when the agent action explicitly reported an error.
    """
    src_payload = src.payload or {}
    has_error_msg = bool(
        src_payload.get("error_message") or src_payload.get("error")
    )
    outcome = src_payload.get("outcome") or src_payload.get("status")

    base = 0.7 if outcome in ("failure", "error", "failed") else 0.4
    error_bonus = 0.2 if has_error_msg else 0.0

    # Target overlap: if agent acted on the same file that later fails
    src_target = src_payload.get("target")
    dst_payload = dst.payload or {}
    dst_target = dst_payload.get("target") or dst_payload.get("path")
    target_overlap = 0.1 if (
        src_target and dst_target and src_target == dst_target
    ) else 0.0

    return base + error_bonus + target_overlap


# ── Helpers ────────────────────────────────────────────────────────────────────

_SEVERITY_ORDER = {
    None: 0,
    "debug": 1,
    "info": 2,
    "warning": 3,
    "error": 4,
    "critical": 5,
}


def _severity_rank(severity: Optional[str]) -> int:
    return _SEVERITY_ORDER.get(severity, 0)


def _extract_files(event: Event) -> set:
    """Extract file paths from an event's payload for overlap detection."""
    payload = event.payload or {}
    files = set()
    if event.event_type == "git_diff":
        for f in payload.get("files_changed", []):
            if isinstance(f, dict) and f.get("path"):
                files.add(f["path"])
    elif event.event_type == "agent_action":
        target = payload.get("target")
        if isinstance(target, str):
            files.add(target)
    return files


# Dispatcher map — must be defined after all scorer functions
_SCORER_MAP = {
    "temporal_sequence": _score_temporal_sequence,
    "file_overlap": _score_file_overlap,
    "dependency_chain": _score_dependency_chain,
    "test_failure_chain": _score_test_failure_chain,
    "env_change_impact": _score_env_change_impact,
    "agent_action_error": _score_agent_action_error,
}
