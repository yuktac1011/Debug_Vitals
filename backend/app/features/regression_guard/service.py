"""
Regression guard service — generates and optionally runs regression tests.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.diagnosis.repository import DiagnosisRepository
from app.features.regression_guard.schemas import (
    RegressionGuardRequest,
    RegressionGuardResponse,
    RegressionTestItem,
)
from app.features.regression_guard.subfeatures.test_generator.generator import (
    generate_regression_test,
)
from app.features.regression_guard.subfeatures.test_runner.runner import run_regression_test
from app.models.regression_test import RegressionTest
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


class RegressionGuardService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._diagnosis_repo = DiagnosisRepository(db)

    async def run_regression_guard(
        self,
        session_id: uuid.UUID,
        request: RegressionGuardRequest,
    ) -> RegressionGuardResponse:
        # Load the diagnosis to get root causes
        diagnosis = await self._diagnosis_repo.get_by_id(request.diagnosis_id)
        if diagnosis is None:
            raise NotFoundError(
                f"Diagnosis {request.diagnosis_id} not found."
            )
        if diagnosis.session_id != session_id:
            raise NotFoundError(
                f"Diagnosis {request.diagnosis_id} does not belong to session {session_id}."
            )

        root_causes = (diagnosis.root_causes or [])[: request.top_n_causes]

        # Detect language from diagnosis metadata if not overridden
        language = request.language or _detect_language_from_causes(root_causes)

        orm_tests = []
        for cause in root_causes:
            generated = generate_regression_test(
                root_cause=cause,
                diagnosis_id=str(diagnosis.id),
                session_id=str(session_id),
                language=language,
            )
            orm_test = RegressionTest(
                session_id=session_id,
                diagnosis_id=diagnosis.id,
                test_code=generated["test_code"],
                test_framework=generated["test_framework"],
                target_file_path=generated["target_file_path"],
                generation_status="generated",
                run_status=None,
                is_active=True,
                meta=generated["metadata"],
                created_at=datetime.now(timezone.utc),
            )
            self._db.add(orm_test)
            orm_tests.append(orm_test)

        await self._db.flush()
        await self._db.commit()

        tests_run = 0
        tests_passed = 0
        tests_failed = 0

        if request.run_immediately:
            for orm_test in orm_tests:
                try:
                    result = await run_regression_test(
                        test_code=orm_test.test_code or "",
                        framework=orm_test.test_framework or "pytest",
                        image=request.docker_image,
                        run_id=str(orm_test.id)[:8],
                    )
                    tests_run += 1
                    if result.timed_out:
                        orm_test.run_status = "timeout"
                    elif result.exit_code == 0:
                        orm_test.run_status = "passed"
                        tests_passed += 1
                    else:
                        orm_test.run_status = "failed"
                        tests_failed += 1
                    orm_test.run_output = (
                        (result.stdout + "\n" + result.stderr)[:16384]
                    )
                    orm_test.last_run_at = datetime.now(timezone.utc)
                    self._db.add(orm_test)
                except Exception as exc:
                    orm_test.run_status = "error"
                    orm_test.run_output = str(exc)[:2048]
                    self._db.add(orm_test)
                    logger.warning(
                        "Regression test run failed",
                        test_id=str(orm_test.id),
                        error=str(exc),
                    )

            await self._db.commit()

        for t in orm_tests:
            await self._db.refresh(t)

        return RegressionGuardResponse(
            session_id=session_id,
            diagnosis_id=diagnosis.id,
            tests_generated=len(orm_tests),
            tests_run=tests_run,
            tests_passed=tests_passed,
            tests_failed=tests_failed,
            tests=[RegressionTestItem.model_validate(t) for t in orm_tests],
        )


def _detect_language_from_causes(root_causes: list) -> str:
    """Best-effort language detection from cause payloads."""
    for cause in root_causes:
        payload = cause.get("payload", {})
        runtime = payload.get("runtime", {})
        lang = runtime.get("language")
        if lang:
            return lang.lower()
    return "python"
