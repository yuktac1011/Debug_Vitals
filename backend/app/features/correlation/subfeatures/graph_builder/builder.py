"""
Correlation graph builder.

Constructs a directed acyclic graph (DAG) of events where edges represent
causal or temporal relationships between events.  This graph is the foundation
of the diagnosis step: the root-cause ranker walks it to score events.

Node model:
    Each node is an event ID (UUID string).
    Node attributes store a lightweight summary: event_type, occurred_at, severity.

Edge model:
    A directed edge A → B means "event A causally or temporally precedes and
    likely influences event B."
    Edge attributes:
        weight  — float [0, 1]; higher = stronger causal link
        type    — str; one of the EDGE_TYPES below
        scorer  — str; which scoring rule produced this edge

Edge types:
    temporal_sequence  — A happened just before B; same source / same file
    file_overlap       — A and B both modified the same file
    dependency_chain   — A is a dependency install; B is a test or build failure
    test_failure_chain — A is a test failure; B is a subsequent failure
    env_change_impact  — A is an env change; B is a failure after it
    agent_action_error — A is a failed agent action; B is the error event

Scoring is delegated to edge_scoring/scorer.py to keep this module focused
on graph topology.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional, Sequence, Tuple

import networkx as nx

from app.models.event import Event

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

EDGE_TYPES = {
    "temporal_sequence",
    "file_overlap",
    "dependency_chain",
    "test_failure_chain",
    "env_change_impact",
    "agent_action_error",
}

# Time window in seconds within which two events are considered temporally related
_TEMPORAL_WINDOW_SECONDS = 300  # 5 minutes


def build_correlation_graph(events: Sequence[Event]) -> nx.DiGraph:
    """
    Build a directed correlation graph from a list of events.

    The algorithm runs in three passes:
    1. Add all events as nodes.
    2. Apply intra-type linking rules (test_failure_chain, dependency_chain, etc.)
    3. Apply temporal proximity linking for events within the time window.

    Edge weights are computed by edge_scoring.scorer and stored on each edge.

    Parameters
    ----------
    events:
        Ordered sequence of Event ORM objects (should be sorted by occurred_at).

    Returns
    -------
    nx.DiGraph
        Populated correlation graph.  Nodes are event ID strings.
    """
    from app.features.correlation.subfeatures.edge_scoring.scorer import score_edge

    G = nx.DiGraph()

    # ── Pass 1: Add nodes ──────────────────────────────────────────────────────
    for event in events:
        node_id = str(event.id)
        G.add_node(
            node_id,
            event_type=event.event_type,
            occurred_at=event.occurred_at.isoformat() if event.occurred_at else None,
            severity=event.severity,
            source=event.source,
            summary=event.summary,
            payload=event.payload or {},
        )

    logger.debug("Graph nodes added", count=len(G.nodes))

    # ── Pass 2: Domain-specific linking ───────────────────────────────────────
    event_list = list(events)
    for i, event_a in enumerate(event_list):
        for j in range(i + 1, len(event_list)):
            event_b = event_list[j]
            edge_type = _classify_edge(event_a, event_b)
            if edge_type is None:
                continue

            weight = score_edge(event_a, event_b, edge_type)
            if weight > 0:
                _add_edge(G, event_a, event_b, edge_type, weight, "domain_rule")

    # ── Pass 3: Temporal proximity linking ────────────────────────────────────
    for i, event_a in enumerate(event_list):
        for j in range(i + 1, len(event_list)):
            event_b = event_list[j]
            if event_a.occurred_at is None or event_b.occurred_at is None:
                continue
            delta = (event_b.occurred_at - event_a.occurred_at).total_seconds()
            if delta < 0:
                continue
            if delta > _TEMPORAL_WINDOW_SECONDS:
                # Events are time-ordered; once we exceed the window, skip ahead
                break
            # Only add temporal edge if no domain edge already exists
            if not G.has_edge(str(event_a.id), str(event_b.id)):
                weight = score_edge(event_a, event_b, "temporal_sequence")
                if weight > 0:
                    _add_edge(
                        G, event_a, event_b, "temporal_sequence", weight, "temporal_proximity"
                    )

    logger.info(
        "Correlation graph built",
        nodes=G.number_of_nodes(),
        edges=G.number_of_edges(),
    )
    return G


def graph_to_dict(G: nx.DiGraph) -> Dict[str, Any]:
    """
    Serialise the graph to a JSON-friendly dict for storage in the Diagnosis record.
    """
    return {
        "nodes": [
            {"id": n, **G.nodes[n]}
            for n in G.nodes
        ],
        "edges": [
            {
                "source": u,
                "target": v,
                **G.edges[u, v],
            }
            for u, v in G.edges
        ],
    }


# ── Private helpers ────────────────────────────────────────────────────────────

def _add_edge(
    G: nx.DiGraph,
    src: Event,
    dst: Event,
    edge_type: str,
    weight: float,
    scorer: str,
) -> None:
    """Add or strengthen an existing edge."""
    u, v = str(src.id), str(dst.id)
    if G.has_edge(u, v):
        # Accumulate weight if edge already exists (capped at 1.0)
        G[u][v]["weight"] = min(1.0, G[u][v]["weight"] + weight)
        G[u][v]["types"] = list(set(G[u][v].get("types", []) + [edge_type]))
    else:
        G.add_edge(u, v, weight=weight, type=edge_type, types=[edge_type], scorer=scorer)


def _classify_edge(a: Event, b: Event) -> Optional[str]:
    """
    Apply domain rules to determine if a directed edge A → B should exist,
    and if so, which type.

    Returns None if no edge should be created by domain rules.
    """
    a_type = a.event_type
    b_type = b.event_type
    a_payload = a.payload or {}
    b_payload = b.payload or {}

    # dependency_chain: a dependency install precedes a test/build failure
    if a_type == "dependency" and b_type in ("test_result", "ci_result"):
        return "dependency_chain"

    # test_failure_chain: two consecutive test failures in same source
    if a_type == "test_result" and b_type == "test_result":
        a_outcome = _get_outcome(a_payload)
        b_outcome = _get_outcome(b_payload)
        if a_outcome == "failure" and b_outcome == "failure":
            return "test_failure_chain"

    # env_change_impact: env change precedes any failure
    if a_type == "env_snapshot" and b_type in ("test_result", "ci_result", "agent_action"):
        if _get_outcome(b_payload) in ("failure", "error"):
            return "env_change_impact"

    # agent_action_error: failed agent action precedes any error event
    if a_type == "agent_action":
        a_outcome = _get_outcome(a_payload)
        if a_outcome in ("failure", "error") and b_type in (
            "test_result", "ci_result", "agent_action"
        ):
            return "agent_action_error"

    # file_overlap: two events that touch the same file
    a_files = _extract_files(a_type, a_payload)
    b_files = _extract_files(b_type, b_payload)
    if a_files and b_files and a_files & b_files:
        return "file_overlap"

    return None


def _get_outcome(payload: Dict[str, Any]) -> Optional[str]:
    return (
        payload.get("outcome")
        or payload.get("status")
        or payload.get("result")
        or payload.get("conclusion")
    )


def _extract_files(event_type: str, payload: Dict[str, Any]) -> set:
    """Extract file paths touched by this event for overlap detection."""
    files = set()
    if event_type == "git_diff":
        for f in payload.get("files_changed", []):
            if isinstance(f, dict) and f.get("path"):
                files.add(f["path"])
    elif event_type == "agent_action":
        target = payload.get("target")
        if isinstance(target, str):
            files.add(target)
    return files
