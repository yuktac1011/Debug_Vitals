"""
Root cause ranker — scores events as likely root causes of observed failures.

This is a pure-function module with no I/O, designed to be unit-testable
in complete isolation from the database and network.

Algorithm overview:
──────────────────
The ranker receives:
  - ``G``: the correlation graph (nx.DiGraph) from the graph builder
  - ``events_by_id``: mapping of event_id → Event, for attribute lookup

It produces a ranked list of (event_id, score, reason) tuples.

Scoring factors (all additive, capped at 1.0):
  1. In-degree score:       events with many predecessors pointing to them
                            are more likely to be effects, not causes.
                            We want high OUT-degree: many things that happened
                            after and are explained by this event.

  2. Out-degree score:      events with high weighted out-degree have strong
                            downstream consequences — high causal potential.

  3. Failure signal:        events with severity=error|critical, or with
                            an explicit failure outcome, score higher.

  4. Edge weight sum:       sum of weights on outgoing edges — stronger causal
                            links to downstream events.

  5. Temporal centrality:   events that occur in the middle of the failure
                            timeline (not too early, not too late) score higher.
                            This prevents blaming unrelated preamble events.

  6. Event type bonus:      certain event types are intrinsically more likely
                            to be root causes:
                              agent_action +0.15 (agent mistakes are common causes)
                              dependency   +0.10 (dependency changes break things)
                              env_snapshot +0.08 (env drift is a common silent cause)

  7. PageRank score:        NetworkX PageRank on the graph — events that are
                            pointed to by other high-confidence events get a boost.

The final score for each event is a weighted sum of the above factors.
Factor weights are tunable constants defined below.
"""

import logging
import structlog
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple

import networkx as nx

from app.models.event import Event

logger = structlog.get_logger(__name__)

# ── Factor weights — tune these constants to adjust ranking behaviour ──────────
_W_OUT_DEGREE = 0.20
_W_FAILURE_SIGNAL = 0.25
_W_EDGE_WEIGHT_SUM = 0.20
_W_TEMPORAL_CENTRALITY = 0.10
_W_TYPE_BONUS = 0.10
_W_PAGERANK = 0.15

# Cap so that in-degree doesn't destroy a genuine root cause
_W_IN_DEGREE_PENALTY = 0.10

_EVENT_TYPE_BONUS: Dict[str, float] = {
    "agent_action": 0.15,
    "dependency": 0.10,
    "env_snapshot": 0.08,
    "git_diff": 0.05,
    "test_result": 0.03,
    "ci_result": 0.03,
}

_FAILURE_SIGNALS = {"error", "critical"}
_FAILURE_OUTCOMES = {"failure", "error", "failed", "timed_out"}


# ── Public interface ───────────────────────────────────────────────────────────

class RankedCause:
    """Represents a single ranked root cause candidate."""

    def __init__(
        self,
        event_id: str,
        score: float,
        rank: int,
        reason: str,
        contributing_factors: Dict[str, float],
    ) -> None:
        self.event_id = event_id
        self.score = score
        self.rank = rank
        self.reason = reason
        self.contributing_factors = contributing_factors

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "score": round(self.score, 4),
            "rank": self.rank,
            "reason": self.reason,
            "contributing_factors": {
                k: round(v, 4) for k, v in self.contributing_factors.items()
            },
        }


def rank_root_causes(
    G: nx.DiGraph,
    events_by_id: Dict[str, Event],
    top_n: int = 10,
) -> List[RankedCause]:
    """
    Rank events in G as root-cause candidates.

    Parameters
    ----------
    G:
        Directed correlation graph from graph_builder.builder.
    events_by_id:
        Dict mapping node IDs (str UUIDs) to Event ORM objects.
    top_n:
        Number of top candidates to return.

    Returns
    -------
    List[RankedCause]
        Ranked list, most likely root cause first.
    """
    if G.number_of_nodes() == 0:
        logger.warning("rank_root_causes called on empty graph")
        return []

    # ── Compute per-node metrics ───────────────────────────────────────────────
    pagerank_scores = _safe_pagerank(G)
    max_out_degree = max((G.out_degree(n) for n in G.nodes), default=1) or 1
    max_edge_weight_sum = _max_out_weight(G) or 1.0

    # Timestamps for temporal centrality
    timestamps = _collect_timestamps(G, events_by_id)
    t_min, t_max = _time_bounds(timestamps)

    candidates: List[RankedCause] = []

    for node_id in G.nodes:
        event = events_by_id.get(node_id)
        if event is None:
            continue

        factors: Dict[str, float] = {}

        # Factor 1: normalised out-degree
        out_deg = G.out_degree(node_id)
        factors["out_degree"] = _W_OUT_DEGREE * (out_deg / max_out_degree)

        # Factor 2: failure signal
        factors["failure_signal"] = _W_FAILURE_SIGNAL * _failure_score(event)

        # Factor 3: outgoing edge weight sum
        out_weight = sum(
            G[node_id][nbr].get("weight", 0.0) for nbr in G.successors(node_id)
        )
        factors["edge_weight_sum"] = _W_EDGE_WEIGHT_SUM * (
            out_weight / max_edge_weight_sum
        )

        # Factor 4: temporal centrality
        factors["temporal_centrality"] = _W_TEMPORAL_CENTRALITY * _temporal_centrality(
            node_id, timestamps, t_min, t_max
        )

        # Factor 5: event type bonus
        type_bonus = _EVENT_TYPE_BONUS.get(event.event_type, 0.0)
        factors["type_bonus"] = _W_TYPE_BONUS * type_bonus

        # Factor 6: PageRank score (already normalised by nx)
        factors["pagerank"] = _W_PAGERANK * pagerank_scores.get(node_id, 0.0)

        # Factor 7: in-degree penalty (high in-degree = more likely to be an effect)
        in_deg = G.in_degree(node_id)
        max_in = max((G.in_degree(n) for n in G.nodes), default=1) or 1
        factors["in_degree_penalty"] = -_W_IN_DEGREE_PENALTY * (in_deg / max_in)

        total_score = min(1.0, max(0.0, sum(factors.values())))

        reason = _build_reason(event, factors, out_deg, in_deg)
        candidates.append(
            RankedCause(
                event_id=node_id,
                score=total_score,
                rank=0,  # assigned after sorting
                reason=reason,
                contributing_factors=factors,
            )
        )

    # Sort descending by score
    candidates.sort(key=lambda c: c.score, reverse=True)
    for i, candidate in enumerate(candidates[:top_n]):
        candidate.rank = i + 1

    logger.info(
        "Root causes ranked",
        total_candidates=len(candidates),
        top_n=top_n,
        top_score=candidates[0].score if candidates else 0,
    )
    return candidates[:top_n]


# ── Private helpers ────────────────────────────────────────────────────────────

def _safe_pagerank(G: nx.DiGraph) -> Dict[str, float]:
    """Run PageRank; return uniform distribution on failure (e.g. disconnected graph)."""
    try:
        return nx.pagerank(G, alpha=0.85, weight="weight")
    except Exception:
        n = G.number_of_nodes()
        return {node: 1.0 / n for node in G.nodes} if n > 0 else {}


def _max_out_weight(G: nx.DiGraph) -> float:
    """Max total outgoing edge weight across all nodes."""
    max_w = 0.0
    for node in G.nodes:
        w = sum(G[node][nbr].get("weight", 0.0) for nbr in G.successors(node))
        max_w = max(max_w, w)
    return max_w


def _failure_score(event: Event) -> float:
    """
    0.0–1.0 score based on failure signals in the event.
    """
    score = 0.0
    if event.severity in _FAILURE_SIGNALS:
        score += 0.6
    elif event.severity == "warning":
        score += 0.2

    payload = event.payload or {}
    outcome = (
        payload.get("outcome")
        or payload.get("status")
        or payload.get("conclusion")
        or payload.get("result")
    )
    if outcome in _FAILURE_OUTCOMES:
        score += 0.4
    elif outcome in ("warning", "partial"):
        score += 0.1

    return min(1.0, score)


def _collect_timestamps(
    G: nx.DiGraph, events_by_id: Dict[str, Event]
) -> Dict[str, float]:
    """Map node_id → unix timestamp (or 0 if unknown)."""
    result: Dict[str, float] = {}
    for node_id in G.nodes:
        event = events_by_id.get(node_id)
        if event and event.occurred_at:
            result[node_id] = event.occurred_at.timestamp()
        else:
            result[node_id] = 0.0
    return result


def _time_bounds(timestamps: Dict[str, float]) -> Tuple[float, float]:
    vals = [v for v in timestamps.values() if v > 0]
    if not vals:
        return 0.0, 1.0
    return min(vals), max(vals)


def _temporal_centrality(
    node_id: str,
    timestamps: Dict[str, float],
    t_min: float,
    t_max: float,
) -> float:
    """
    Events in the middle third of the timeline get score 1.0.
    Events at the very start or very end get lower scores.
    Rationale: root causes typically precede effects but are not necessarily
    the very first event (preamble) or the very last (effect, not cause).
    """
    t = timestamps.get(node_id, 0.0)
    if t_max == t_min:
        return 0.5  # single point in time — neutral

    normalised = (t - t_min) / (t_max - t_min)  # 0.0 → 1.0

    # Score peaks at 0.3 (early-middle), drops off at extremes
    # Using a triangle function: peak at 0.3, zero at 0.0 and 1.0
    if normalised <= 0.3:
        return normalised / 0.3
    else:
        return max(0.0, 1.0 - (normalised - 0.3) / 0.7)


def _build_reason(
    event: Event,
    factors: Dict[str, float],
    out_deg: int,
    in_deg: int,
) -> str:
    """Build a concise human-readable reason string for the ranked cause."""
    parts = []
    if factors.get("failure_signal", 0) > 0.1:
        severity = event.severity or "unknown severity"
        parts.append(f"event has {severity} severity")
    if factors.get("out_degree", 0) > 0.05:
        parts.append(f"directly precedes {out_deg} downstream event(s)")
    if factors.get("edge_weight_sum", 0) > 0.05:
        parts.append("has strong causal edges to subsequent failures")
    if factors.get("type_bonus", 0) > 0:
        parts.append(f"event type '{event.event_type}' is a known failure source")
    if not parts:
        parts.append("correlated with downstream events via temporal proximity")
    return "; ".join(parts).capitalize() + "."
