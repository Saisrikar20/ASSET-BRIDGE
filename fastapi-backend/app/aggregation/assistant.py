"""
Backward compatibility bridge for app.aggregation.assistant.
Re-exports the AI Assistant engine from app.ai_bot.
"""
from app.ai_bot.assistant import (
    GuideIn,
    answer_question,
    ensure_knowledge_fresh,
    retrieve_statutory,
    generate_action_links,
    load_chunks,
    bm25,
    tokens,
    call_nvidia,
    call_gemini,
    call_openai,
    extractive_multisource,
    build_multisource_prompt,
    Chunk
)

__all__ = [
    "GuideIn",
    "answer_question",
    "ensure_knowledge_fresh",
    "retrieve_statutory",
    "generate_action_links",
    "load_chunks",
    "bm25",
    "tokens",
    "call_nvidia",
    "call_gemini",
    "call_openai",
    "extractive_multisource",
    "build_multisource_prompt",
    "Chunk",
]
