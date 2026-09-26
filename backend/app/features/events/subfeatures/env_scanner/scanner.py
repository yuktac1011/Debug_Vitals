"""
Environment scanner — normalises raw environment snapshot payloads.

An env snapshot captures the state of the execution environment at a point in
time: installed packages, environment variables, Python/Node/etc. versions,
OS details, active processes, etc.

The normalised form is:
{
    "runtime": {
        "language": str | None,       # python | node | go | rust | ...
        "version":  str | None,       # e.g. "3.11.6"
    },
    "packages": [
        {"name": str, "version": str | None}
    ],
    "env_vars": {str: str},           # only non-sensitive vars (keys filtered)
    "os": {
        "name":    str | None,
        "version": str | None,
        "arch":    str | None,
    },
    "active_services": list[str],
    "raw": dict
}

Sensitive environment variable keys (tokens, passwords, secrets) are stripped
from the normalised form — they must never be stored in the event payload.
"""

import re
from typing import Any, Dict, List, Optional


# Patterns that indicate a sensitive env var — strip value, keep key as "<redacted>"
_SENSITIVE_KEY_RE = re.compile(
    r"(password|passwd|secret|token|key|auth|credential|private|api_key|apikey"
    r"|access_key|secret_access|bearer|jwt)",
    re.IGNORECASE,
)

_RUNTIME_VERSION_RE = re.compile(r"\d+\.\d+(?:\.\d+)?")


def normalise_env_snapshot(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalise an environment snapshot payload.

    Parameters
    ----------
    payload:
        Raw event payload from the environment scanner tool.

    Returns
    -------
    dict
        Normalised env snapshot in the canonical schema.
    """
    raw = dict(payload)

    runtime = _extract_runtime(payload)
    packages = _extract_packages(payload)
    env_vars = _extract_env_vars(payload)
    os_info = _extract_os(payload)
    active_services = _extract_services(payload)

    return {
        "runtime": runtime,
        "packages": packages,
        "env_vars": env_vars,
        "os": os_info,
        "active_services": active_services,
        "raw": raw,
    }


def _extract_runtime(payload: Dict[str, Any]) -> Dict[str, Optional[str]]:
    runtime = payload.get("runtime") or {}
    language = runtime.get("language") or payload.get("language")
    version = runtime.get("version") or payload.get("runtime_version") or payload.get("version")

    # Attempt to infer language from common keys
    if not language:
        for lang in ("python", "node", "ruby", "java", "go", "rust", "php"):
            if lang in payload:
                language = lang
                version = version or str(payload[lang])
                break

    return {
        "language": str(language)[:64] if language else None,
        "version": _clean_version(version),
    }


def _clean_version(v: Any) -> Optional[str]:
    if not v:
        return None
    s = str(v).strip()
    match = _RUNTIME_VERSION_RE.search(s)
    return match.group(0)[:32] if match else s[:32]


def _extract_packages(payload: Dict[str, Any]) -> List[Dict[str, Optional[str]]]:
    """
    Extract installed package list from various formats:
    - List of {"name": ..., "version": ...} dicts
    - Dict of {name: version}
    - Raw pip/npm freeze output string
    """
    raw_packages = (
        payload.get("packages")
        or payload.get("dependencies")
        or payload.get("installed_packages")
    )

    if raw_packages is None:
        return []

    if isinstance(raw_packages, dict):
        return [
            {"name": str(k)[:256], "version": str(v)[:64] if v else None}
            for k, v in raw_packages.items()
        ]

    if isinstance(raw_packages, list):
        result = []
        for item in raw_packages:
            if isinstance(item, dict):
                result.append(
                    {
                        "name": str(item.get("name", ""))[:256],
                        "version": str(item.get("version", ""))[:64]
                        if item.get("version")
                        else None,
                    }
                )
            elif isinstance(item, str):
                # Handle "package==version" or "package>=version" strings
                parts = re.split(r"[=><~^!]", item, maxsplit=1)
                name = parts[0].strip()
                ver = parts[1].strip() if len(parts) > 1 else None
                result.append({"name": name[:256], "version": ver[:64] if ver else None})
        return result

    if isinstance(raw_packages, str):
        # Parse requirements.txt / pip freeze format
        result = []
        for line in raw_packages.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = re.split(r"[=><~^!]", line, maxsplit=1)
            name = parts[0].strip()
            ver = parts[1].strip() if len(parts) > 1 else None
            result.append({"name": name[:256], "version": ver[:64] if ver else None})
        return result

    return []


def _extract_env_vars(payload: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract environment variables, redacting sensitive keys.
    Accepts payload["env_vars"] or payload["environment"].
    """
    raw_env = payload.get("env_vars") or payload.get("environment") or {}
    if not isinstance(raw_env, dict):
        return {}

    cleaned: Dict[str, str] = {}
    for k, v in raw_env.items():
        if not isinstance(k, str):
            continue
        sanitised_key = k[:256]
        if _SENSITIVE_KEY_RE.search(k):
            cleaned[sanitised_key] = "<redacted>"
        else:
            cleaned[sanitised_key] = str(v)[:1024] if v is not None else ""
    return cleaned


def _extract_os(payload: Dict[str, Any]) -> Dict[str, Optional[str]]:
    os_info = payload.get("os") or payload.get("operating_system") or {}
    if not isinstance(os_info, dict):
        os_info = {}
    return {
        "name": str(os_info.get("name", ""))[:64] or None,
        "version": str(os_info.get("version", ""))[:64] or None,
        "arch": str(os_info.get("arch") or os_info.get("architecture") or "")[:32] or None,
    }


def _extract_services(payload: Dict[str, Any]) -> List[str]:
    services = payload.get("active_services") or payload.get("services") or []
    if isinstance(services, list):
        return [str(s)[:128] for s in services if s]
    return []
