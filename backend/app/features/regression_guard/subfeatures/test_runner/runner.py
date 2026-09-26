"""
Test runner — executes generated regression tests inside an isolated container.
Delegates container execution to the verification docker_runner for resource-limit
consistency — all executed code goes through the same sandboxed path.
"""

import logging
import structlog
from typing import Any, Dict, Optional

from app.features.verification.subfeatures.container_runner.docker_runner import (
    ContainerResult,
    run_in_container,
)

logger = structlog.get_logger(__name__)


async def run_regression_test(
    test_code: str,
    framework: str,
    image: str,
    run_id: Optional[str] = None,
) -> ContainerResult:
    """
    Execute a generated regression test inside an isolated container.

    Parameters
    ----------
    test_code:
        The generated test source code.
    framework:
        Test framework identifier (e.g. "pytest", "jest").
    image:
        Approved Docker image to run in.
    run_id:
        Optional correlation ID.

    Returns
    -------
    ContainerResult
        The container execution result.
    """
    command = _build_run_command(test_code, framework)
    logger.info(
        "Running regression test",
        framework=framework,
        image=image,
        run_id=run_id,
    )
    return await run_in_container(
        image=image,
        command=command,
        run_id=run_id,
    )


def _build_run_command(test_code: str, framework: str) -> str:
    """
    Build the shell command that writes the test file and runs it.
    The test code is passed as a heredoc to avoid shell injection via file paths.
    The heredoc delimiter is randomised per call to prevent delimiter collisions.
    """
    import hashlib
    import time
    delimiter = "EOF_" + hashlib.md5(f"{time.time()}".encode()).hexdigest()[:8].upper()

    if framework == "pytest":
        return (
            f"cat > /tmp/test_regression.py << '{delimiter}'\n"
            f"{test_code}\n"
            f"{delimiter}\n"
            f"pip install pytest --quiet && python -m pytest /tmp/test_regression.py -v 2>&1"
        )
    elif framework == "jest":
        return (
            f"cat > /tmp/test_regression.test.js << '{delimiter}'\n"
            f"{test_code}\n"
            f"{delimiter}\n"
            f"npm install --save-dev jest --quiet 2>&1 && npx jest /tmp/test_regression.test.js 2>&1"
        )
    else:
        # Generic fallback: just write the file and print it
        return (
            f"cat > /tmp/test_regression.txt << '{delimiter}'\n"
            f"{test_code}\n"
            f"{delimiter}\n"
            f"echo 'Test written. No runner available for framework: {framework}'"
        )
