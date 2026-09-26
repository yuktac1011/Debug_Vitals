"""
LLM client for the reasoning engine.

Wraps OpenAI API calls with:
- Explicit timeout (from settings)
- Exponential backoff retry (up to settings.openai_max_retries)
- Automatic fallback to template-based explanation on any failure

The caller never needs to handle LLM errors — this module guarantees
a string explanation is always returned, regardless of LLM availability.

A diagnosis is NEVER blocked by an LLM outage.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from app.config.settings import get_settings
from app.features.diagnosis.subfeatures.reasoning_engine.templates import render_explanation

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are an expert software reliability engineer analysing an AI
coding agent session to identify the root cause of failures.

You will be given:
1. A list of ranked root cause candidates with scores and reasons.
2. A brief summary of the session events.

Your job is to write a clear, concise (2–4 sentence) explanation of:
- What the most likely root cause is and why.
- How it connects to the observed failures.
- One concrete suggestion for how to fix or investigate it.

Do NOT include speculation beyond the provided data.
Do NOT reference internal IDs or scores directly.
Write for a developer audience — be precise and technical, not generic."""


async def generate_explanation(
    root_causes: List[Dict[str, Any]],
    session_id: str,
    total_events: int,
    graph_edge_count: int = 0,
) -> Tuple[str, str]:
    """
    Generate a natural-language explanation of the diagnosis.

    Attempts LLM generation first; falls back to template on any failure.

    Parameters
    ----------
    root_causes:
        Ranked root cause dicts (from ranker.to_dict()).
    session_id:
        For context in the prompt.
    total_events:
        For context.
    graph_edge_count:
        For context.

    Returns
    -------
    Tuple[str, str]
        (explanation_text, source) where source is "llm" or "template".
    """
    settings = get_settings()

    try:
        explanation = await _call_llm_with_retry(
            root_causes=root_causes,
            session_id=session_id,
            total_events=total_events,
            graph_edge_count=graph_edge_count,
            api_key=settings.openai_api_key.get_secret_value(),
            model=settings.openai_model,
            timeout=settings.openai_timeout_seconds,
            max_retries=settings.openai_max_retries,
        )
        return explanation, "llm"

    except Exception as exc:
        logger.warning(
            "LLM reasoning failed — using template fallback",
            error=str(exc),
            session_id=session_id,
        )
        fallback = render_explanation(
            root_causes=root_causes,
            session_id=session_id,
            total_events=total_events,
            graph_edge_count=graph_edge_count,
        )
        return fallback, "template"


async def _call_llm_with_retry(
    root_causes: List[Dict[str, Any]],
    session_id: str,
    total_events: int,
    graph_edge_count: int,
    api_key: str,
    model: str,
    timeout: float,
    max_retries: int,
) -> str:
    """
    Internal async function that calls the OpenAI API with retry.
    Raises on final failure so the caller can activate the fallback.
    """

    @retry(
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
        stop=stop_after_attempt(max_retries),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def _call() -> str:
        user_prompt = _build_prompt(root_causes, session_id, total_events, graph_edge_count)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": 400,
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

    return await _call()


def _build_prompt(
    root_causes: List[Dict[str, Any]],
    session_id: str,
    total_events: int,
    graph_edge_count: int,
) -> str:
    """Build the user-side prompt for the LLM call."""
    top3 = root_causes[:3]
    causes_text = "\n".join(
        f"  Rank {c.get('rank', i + 1)}: {c.get('reason', 'N/A')} "
        f"(score: {c.get('score', 0):.2f}, event_type: {c.get('event_type', 'unknown')})"
        for i, c in enumerate(top3)
    )
    return (
        f"Session ID: {session_id}\n"
        f"Total events analysed: {total_events}\n"
        f"Causal connections found: {graph_edge_count}\n\n"
        f"Top ranked root causes:\n{causes_text}\n\n"
        "Please provide a concise root cause explanation and one actionable fix suggestion."
    )
