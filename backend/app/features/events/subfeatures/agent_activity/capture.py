"""
Agent action capture — normalises raw agent action payloads into a
consistent internal schema for downstream correlation and diagnosis.

An "agent action" is any discrete step taken by the AI coding agent:
a tool call, a file edit, a shell command invocation, a search, etc.

The normalised form is:
{
    "action_type":   str,          # tool_call | file_edit | shell_command | search | other
    "tool_name":     str | None,   # e.g. "str_replace_editor", "bash", "browser"
    "target":        str | None,   # file path, URL, command string
    "parameters":    dict | None,  # cleaned parameters passed to the tool
    "outcome":       str | None,   # success | failure | partial | unknown
    "error_message": str | None,
    "raw":           dict          # original payload preserved for audit
}
"""

import re
from typing import Any, Dict, Optional


# Maps known tool/function names to canonical action_type strings.
_TOOL_TYPE_MAP: Dict[str, str] = {
    "str_replace_editor": "file_edit",
    "str_replace": "file_edit",
    "write_file": "file_edit",
    "read_file": "file_read",
    "bash": "shell_command",
    "shell": "shell_command",
    "execute_command": "shell_command",
    "browser": "web_browse",
    "web_fetch": "web_browse",
    "search": "search",
    "grep": "search",
    "glob": "search",
}

_MAX_TARGET_LEN = 4096
_MAX_PARAM_STR_LEN = 8192


def normalise_agent_action(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse and normalise an agent action payload.

    Accepts loosely-structured dicts from various agent frameworks and maps
    them to the canonical internal schema.  Unknown fields are preserved in
    ``raw`` for traceability.

    Parameters
    ----------
    payload:
        Raw event payload as received from the agent.

    Returns
    -------
    dict
        Normalised agent action in the canonical schema.
    """
    raw = dict(payload)

    # Attempt to detect action type
    raw_tool = (
        payload.get("tool_name")
        or payload.get("tool")
        or payload.get("function")
        or payload.get("name")
    )
    tool_name: Optional[str] = raw_tool if isinstance(raw_tool, str) else None
    if tool_name:
        tool_name = tool_name.strip()[:128]

    action_type = _resolve_action_type(tool_name, payload)
    target = _extract_target(payload, action_type)
    parameters = _clean_parameters(payload.get("parameters") or payload.get("args") or {})

    # Outcome detection
    outcome: Optional[str] = payload.get("outcome") or payload.get("status")
    if outcome and isinstance(outcome, str):
        outcome = outcome.lower().strip()
        if outcome not in ("success", "failure", "partial", "unknown"):
            outcome = "unknown"

    error_message: Optional[str] = payload.get("error") or payload.get("error_message")
    if isinstance(error_message, str):
        error_message = error_message[:2048]

    return {
        "action_type": action_type,
        "tool_name": tool_name,
        "target": target,
        "parameters": parameters,
        "outcome": outcome,
        "error_message": error_message,
        "raw": raw,
    }


def _resolve_action_type(tool_name: Optional[str], payload: Dict[str, Any]) -> str:
    """Map tool_name to a canonical action_type string."""
    if tool_name and isinstance(tool_name, str):
        normalised_name = tool_name.lower().replace("-", "_").replace(" ", "_")
        if normalised_name in _TOOL_TYPE_MAP:
            return _TOOL_TYPE_MAP[normalised_name]
        # Partial match — check for common substrings
        for key, val in _TOOL_TYPE_MAP.items():
            if key in normalised_name:
                return val

    # Fallback: look for explicit type hints in payload
    explicit = payload.get("action_type") or payload.get("type")
    if isinstance(explicit, str):
        return explicit.lower().strip()[:64]

    return "other"


def _extract_target(payload: Dict[str, Any], action_type: str) -> Optional[str]:
    """Extract the primary target (file, command, URL) from the payload."""
    candidates = [
        payload.get("path"),
        payload.get("file"),
        payload.get("target"),
        payload.get("command"),
        payload.get("url"),
        payload.get("query"),
    ]
    # For shell commands, prefer the raw command string
    if action_type == "shell_command":
        candidates.insert(0, payload.get("command") or payload.get("cmd"))

    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()[:_MAX_TARGET_LEN]

    return None


def _clean_parameters(params: Any) -> Optional[Dict[str, Any]]:
    """
    Return a cleaned copy of params, truncating long string values to prevent
    oversized payloads in the normalised record.
    """
    if not isinstance(params, dict):
        return {}
    cleaned: Dict[str, Any] = {}
    for k, v in params.items():
        if isinstance(k, str):
            key = k[:256]
            if isinstance(v, str):
                cleaned[key] = v[:_MAX_PARAM_STR_LEN]
            else:
                cleaned[key] = v
    return cleaned
