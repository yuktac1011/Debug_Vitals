"""
Git diff parser — normalises raw git diff payloads into a structured schema
suitable for correlation and root-cause analysis.

The normalised form is:
{
    "files_changed": [
        {
            "path":      str,              # file path relative to repo root
            "old_path":  str | None,       # set on renames
            "change_type": str,            # added | modified | deleted | renamed | copied
            "additions": int,
            "deletions": int,
            "hunks": [
                {
                    "header":   str,        # e.g. "@@ -10,7 +10,9 @@"
                    "lines":    list[str],  # raw diff lines for this hunk
                }
            ],
        }
    ],
    "total_additions": int,
    "total_deletions": int,
    "commit_sha":  str | None,
    "parent_sha":  str | None,
    "raw":         dict
}
"""

import re
from typing import Any, Dict, List, Optional, Tuple

_HUNK_HEADER_RE = re.compile(r"^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@")
_SHA_RE = re.compile(r"^[0-9a-f]{7,40}$", re.IGNORECASE)

_CHANGE_TYPE_MAP = {
    "A": "added",
    "M": "modified",
    "D": "deleted",
    "R": "renamed",
    "C": "copied",
}


def normalise_git_diff(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalise a git diff payload into the canonical internal schema.

    Accepts two formats:
    1. ``unified_diff``: a raw unified diff string (``payload["diff"]``)
    2. ``structured``: a pre-structured list in ``payload["files"]``

    Falls back gracefully if neither is present, preserving the raw payload.

    Parameters
    ----------
    payload:
        Raw event payload as received from the git_watcher or agent.

    Returns
    -------
    dict
        Normalised diff in the canonical schema.
    """
    raw = dict(payload)
    files_changed: List[Dict[str, Any]] = []

    if "diff" in payload and isinstance(payload["diff"], str):
        files_changed = _parse_unified_diff(payload["diff"])
    elif "files" in payload and isinstance(payload["files"], list):
        files_changed = _normalise_structured_files(payload["files"])

    total_additions = sum(f.get("additions", 0) for f in files_changed)
    total_deletions = sum(f.get("deletions", 0) for f in files_changed)

    commit_sha = _extract_sha(payload.get("commit_sha") or payload.get("sha") or payload.get("commit"))
    parent_sha = _extract_sha(payload.get("parent_sha") or payload.get("parent"))

    return {
        "files_changed": files_changed,
        "total_additions": total_additions,
        "total_deletions": total_deletions,
        "commit_sha": commit_sha,
        "parent_sha": parent_sha,
        "raw": raw,
    }


def _extract_sha(value: Any) -> Optional[str]:
    if isinstance(value, str) and _SHA_RE.match(value.strip()):
        return value.strip().lower()
    return None


def _parse_unified_diff(diff_text: str) -> List[Dict[str, Any]]:
    """
    Parse a unified diff string into per-file structured records.
    Handles standard ``git diff`` output with ``diff --git`` headers.
    """
    files: List[Dict[str, Any]] = []
    current_file: Optional[Dict[str, Any]] = None
    current_hunk: Optional[Dict[str, Any]] = None
    additions = 0
    deletions = 0

    for line in diff_text.splitlines():
        # New file section
        if line.startswith("diff --git "):
            if current_file is not None:
                if current_hunk:
                    current_file["hunks"].append(current_hunk)
                current_file["additions"] = additions
                current_file["deletions"] = deletions
                files.append(current_file)
            # Extract paths from "diff --git a/path b/path"
            parts = line[len("diff --git "):].split(" b/", 1)
            path = parts[1] if len(parts) == 2 else parts[0].lstrip("a/")
            current_file = {
                "path": path,
                "old_path": None,
                "change_type": "modified",
                "additions": 0,
                "deletions": 0,
                "hunks": [],
            }
            current_hunk = None
            additions = 0
            deletions = 0

        elif line.startswith("new file mode") and current_file:
            current_file["change_type"] = "added"

        elif line.startswith("deleted file mode") and current_file:
            current_file["change_type"] = "deleted"

        elif line.startswith("rename to ") and current_file:
            current_file["change_type"] = "renamed"
            current_file["path"] = line[len("rename to "):]

        elif line.startswith("rename from ") and current_file:
            current_file["old_path"] = line[len("rename from "):]

        elif _HUNK_HEADER_RE.match(line) and current_file:
            if current_hunk is not None:
                current_file["hunks"].append(current_hunk)
            current_hunk = {"header": line, "lines": []}

        elif current_hunk is not None:
            if line.startswith("+") and not line.startswith("+++"):
                additions += 1
                current_hunk["lines"].append(line)
            elif line.startswith("-") and not line.startswith("---"):
                deletions += 1
                current_hunk["lines"].append(line)
            elif line.startswith(" "):
                current_hunk["lines"].append(line)

    # Flush the last file
    if current_file is not None:
        if current_hunk:
            current_file["hunks"].append(current_hunk)
        current_file["additions"] = additions
        current_file["deletions"] = deletions
        files.append(current_file)

    return files


def _normalise_structured_files(files: List[Any]) -> List[Dict[str, Any]]:
    """Normalise a pre-structured list from GitHub-style API responses."""
    result = []
    for f in files:
        if not isinstance(f, dict):
            continue
        result.append(
            {
                "path": str(f.get("filename") or f.get("path") or ""),
                "old_path": f.get("previous_filename"),
                "change_type": _CHANGE_TYPE_MAP.get(
                    str(f.get("status", "M")).upper(), "modified"
                ),
                "additions": int(f.get("additions", 0)),
                "deletions": int(f.get("deletions", 0)),
                "hunks": [],  # not available in structured format
            }
        )
    return result
