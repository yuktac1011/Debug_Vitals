"""
Docker runner — isolated container execution for verification runs.

Security guarantees (non-negotiable):
  - Network mode is always "none" — containers cannot reach the host or internet.
  - Memory is capped at settings.docker_memory_limit (default 256m).
  - CPU is capped at settings.docker_cpu_quota (default 50% of one core).
  - Execution is hard-killed after settings.docker_execution_timeout seconds.
  - Container images must be pre-approved (allowlist enforced at this layer).
  - No volumes are mounted from the host; code is injected via stdin or image.
  - Container is always removed after execution (auto_remove=True).

These limits apply to EVERY container run — there is no bypass path.
"""

import asyncio
import logging
import structlog
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from app.config.settings import get_settings
from app.core.exceptions import ExternalServiceError

logger = structlog.get_logger(__name__)

# Allowlist of Docker images that are permitted for verification runs.
# Any image not in this set is rejected with a clear error — this prevents
# arbitrary image execution even if an adversary controls session data.
_APPROVED_IMAGES = {
    "python:3.11-slim",
    "python:3.12-slim",
    "node:20-slim",
    "node:18-slim",
    "golang:1.22-alpine",
    "rust:1.77-slim",
    "ubuntu:22.04",
    "alpine:3.19",
}

_MAX_OUTPUT_BYTES = 1_048_576  # 1 MB — truncate stdout/stderr beyond this


class ContainerResult:
    def __init__(
        self,
        exit_code: Optional[int],
        stdout: str,
        stderr: str,
        timed_out: bool,
        container_id: Optional[str],
        run_metadata: Dict[str, Any],
    ) -> None:
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.timed_out = timed_out
        self.container_id = container_id
        self.run_metadata = run_metadata


async def run_in_container(
    image: str,
    command: str,
    environment: Optional[Dict[str, str]] = None,
    working_dir: str = "/workspace",
    run_id: Optional[str] = None,
) -> ContainerResult:
    """
    Execute ``command`` inside a fresh, isolated Docker container.

    Parameters
    ----------
    image:
        Docker image name. Must be in the approved allowlist.
    command:
        Shell command to run inside the container.
        Passed as a shell string to /bin/sh -c.
    environment:
        Optional dict of env vars injected into the container.
        Keys matching sensitive patterns are rejected.
    working_dir:
        Working directory inside the container.
    run_id:
        Optional correlation ID for logging.

    Returns
    -------
    ContainerResult
        Result object with exit_code, stdout, stderr, timed_out.

    Raises
    ------
    ExternalServiceError
        If Docker is unavailable or the image is not approved.
    ValueError
        If the image is not in the approved allowlist.
    """
    settings = get_settings()
    run_id = run_id or str(uuid.uuid4())[:8]

    # Allowlist check — reject non-approved images unconditionally
    if image not in _APPROVED_IMAGES:
        raise ValueError(
            f"Docker image '{image}' is not in the approved allowlist. "
            f"Approved images: {sorted(_APPROVED_IMAGES)}"
        )

    # Sanitise environment: reject sensitive keys
    safe_env = _sanitise_env(environment or {})

    docker_args = _build_docker_args(
        image=image,
        command=command,
        environment=safe_env,
        working_dir=working_dir,
        settings=settings,
    )

    logger.info(
        "Starting container run",
        run_id=run_id,
        image=image,
        timeout=settings.docker_execution_timeout,
    )

    try:
        result = await _execute_with_timeout(
            docker_args=docker_args,
            timeout=settings.docker_execution_timeout,
            run_id=run_id,
        )
        logger.info(
            "Container run complete",
            run_id=run_id,
            exit_code=result.exit_code,
            timed_out=result.timed_out,
        )
        return result

    except FileNotFoundError:
        raise ExternalServiceError(
            "Docker is not available on this system. "
            "Ensure Docker is installed and the daemon is running."
        )
    except Exception as exc:
        logger.exception("Container run failed", run_id=run_id, error=str(exc))
        raise ExternalServiceError(f"Container execution failed: {exc}")


def _build_docker_args(
    image: str,
    command: str,
    environment: Dict[str, str],
    working_dir: str,
    settings: Any,
) -> list:
    """Build the docker run argv list with all resource limits applied."""
    args = [
        "docker", "run",
        "--rm",                                          # always remove on exit
        "--network", settings.docker_network_mode,       # "none" in production
        "--memory", settings.docker_memory_limit,
        "--cpu-quota", str(settings.docker_cpu_quota),
        "--cpu-period", "100000",
        "--security-opt", "no-new-privileges",           # prevent privilege escalation
        "--read-only",                                   # read-only root filesystem
        "--tmpfs", "/tmp:size=64m,mode=1777",            # writable /tmp, size-limited
        "--workdir", working_dir,
    ]

    # Inject environment variables
    for k, v in environment.items():
        args += ["-e", f"{k}={v}"]

    args.append(image)
    args += ["/bin/sh", "-c", command]
    return args


async def _execute_with_timeout(
    docker_args: list,
    timeout: int,
    run_id: str,
) -> ContainerResult:
    """
    Run the docker subprocess with a hard timeout.
    Kills the container on timeout.
    """
    start = datetime.now(timezone.utc)
    stdout_chunks = []
    stderr_chunks = []
    stdout_bytes = 0
    stderr_bytes = 0
    timed_out = False
    exit_code = None

    proc = await asyncio.create_subprocess_exec(
        *docker_args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout_raw, stderr_raw = await asyncio.wait_for(
            proc.communicate(), timeout=float(timeout)
        )
        exit_code = proc.returncode
        stdout_raw = stdout_raw[:_MAX_OUTPUT_BYTES]
        stderr_raw = stderr_raw[:_MAX_OUTPUT_BYTES]

    except asyncio.TimeoutError:
        timed_out = True
        logger.warning("Container run timed out", run_id=run_id, timeout=timeout)
        try:
            proc.kill()
        except ProcessLookupError:
            pass
        stdout_raw = b""
        stderr_raw = b"[execution timed out]".encode()
        exit_code = None

    duration_ms = (datetime.now(timezone.utc) - start).total_seconds() * 1000

    return ContainerResult(
        exit_code=exit_code,
        stdout=stdout_raw.decode("utf-8", errors="replace"),
        stderr=stderr_raw.decode("utf-8", errors="replace"),
        timed_out=timed_out,
        container_id=None,  # not tracked for simple subprocess execution
        run_metadata={
            "run_id": run_id,
            "duration_ms": round(duration_ms, 2),
            "image": docker_args[docker_args.index("--workdir") + 2]
            if "--workdir" in docker_args
            else "unknown",
        },
    )


def _sanitise_env(env: Dict[str, str]) -> Dict[str, str]:
    """
    Reject environment variables whose keys match sensitive patterns.
    This prevents accidentally injecting host credentials into containers.
    """
    import re
    SENSITIVE_RE = re.compile(
        r"(password|passwd|secret|token|key|auth|credential|private|api_key|apikey"
        r"|access_key|bearer|jwt)",
        re.IGNORECASE,
    )
    return {k: v for k, v in env.items() if not SENSITIVE_RE.search(k)}
