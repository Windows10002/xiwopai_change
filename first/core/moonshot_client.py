"""Moonshot（Kimi）OpenAI 兼容 API：批改视觉与文本分析。"""
from __future__ import annotations

import logging
import os
from typing import Any

from core.config import (
    MOONSHOT_API_BASE,
    MOONSHOT_API_KEY,
    MOONSHOT_TEXT_MODEL,
    MOONSHOT_VISION_MODEL,
)

logger = logging.getLogger(__name__)

_client: Any = None


def moonshot_configured() -> bool:
    return bool(MOONSHOT_API_KEY)


def get_openai_client():
    global _client
    if _client is not None:
        return _client
    if not MOONSHOT_API_KEY:
        raise RuntimeError("未配置 MOONSHOT_API_KEY")
    try:
        from openai import OpenAI
    except ImportError as e:
        raise RuntimeError("请安装 openai：pip install openai") from e
    _client = OpenAI(api_key=MOONSHOT_API_KEY, base_url=MOONSHOT_API_BASE)
    return _client


def dashscope_content_to_openai(content: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """将 dashscope MultiModal 的 content 转为 OpenAI 多模态格式。"""
    out: list[dict[str, Any]] = []
    for item in content:
        if not isinstance(item, dict):
            continue
        if "image" in item:
            url = str(item["image"] or "").strip()
            if url:
                out.append({"type": "image_url", "image_url": {"url": url}})
        elif "text" in item:
            text = str(item["text"] or "")
            if text:
                out.append({"type": "text", "text": text})
    return out


def moonshot_vision_chat(
    content: list[dict[str, Any]],
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout: float | None = None,
) -> tuple[str | None, str | None]:
    """
    视觉多模态对话（作业图片 + 文本 Prompt）。
    content 与 dashscope MultiModalConversation 一致：[{image: data_url}, {text: ...}, ...]
    """
    if not moonshot_configured():
        return None, "未配置 MOONSHOT_API_KEY（Moonshot / Kimi 批改）"

    openai_content = dashscope_content_to_openai(content)
    if not openai_content:
        return None, "未提供有效的图片或文本内容"

    temp = temperature if temperature is not None else float(os.getenv("MOONSHOT_TEMPERATURE", "0.05"))
    tokens = max_tokens if max_tokens is not None else int(os.getenv("MOONSHOT_MAX_TOKENS", "8192"))
    req_timeout = timeout if timeout is not None else float(os.getenv("MOONSHOT_TIMEOUT", "120"))
    model = os.getenv("MOONSHOT_VISION_MODEL", MOONSHOT_VISION_MODEL)

    try:
        client = get_openai_client()
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": openai_content}],
            temperature=temp,
            max_tokens=tokens,
            timeout=req_timeout,
        )
    except Exception as e:
        logger.exception("moonshot vision chat failed")
        return None, str(e)[:300]

    if not completion.choices:
        return None, "Kimi API 返回无 choices"
    message = completion.choices[0].message
    text = (message.content or "").strip() if message else ""
    if not text:
        return None, "Kimi 模型返回为空"
    return text, None


def moonshot_text_chat(
    prompt: str,
    *,
    system: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout: float | None = None,
) -> tuple[str | None, str | None]:
    """纯文本对话（学情批量分析等）。"""
    if not moonshot_configured():
        return None, "未配置 MOONSHOT_API_KEY"

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    temp = temperature if temperature is not None else float(os.getenv("MOONSHOT_TEXT_TEMPERATURE", "0.3"))
    tokens = max_tokens if max_tokens is not None else int(os.getenv("MOONSHOT_TEXT_MAX_TOKENS", "4096"))
    req_timeout = timeout if timeout is not None else float(os.getenv("MOONSHOT_TIMEOUT", "90"))
    model = os.getenv("MOONSHOT_TEXT_MODEL", MOONSHOT_TEXT_MODEL)

    try:
        client = get_openai_client()
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temp,
            max_tokens=tokens,
            timeout=req_timeout,
        )
    except Exception as e:
        logger.exception("moonshot text chat failed")
        return None, str(e)[:300]

    if not completion.choices:
        return None, "Kimi API 返回无 choices"
    text = (completion.choices[0].message.content or "").strip()
    if not text:
        return None, "Kimi 模型返回为空"
    return text, None
