"""π 助手大模型对话（Agnes OpenAI 兼容 API，与批改 DashScope 分离）。"""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from core.config import (
    AGNES_API_BASE,
    AGNES_API_KEY,
    AGNES_ASSISTANT_MODEL,
    ASSISTANT_LLM_MAX_ROUNDS_ADMIN,
    ASSISTANT_LLM_MAX_ROUNDS_DEFAULT,
    ASSISTANT_LLM_MAX_ROUNDS_TEACHER,
)
from core.pi_assistant_context import build_system_prompt
from core.sanitize import clip_text

logger = logging.getLogger(__name__)

DISCLAIMER = "仅供参考，以页面实际功能为准。"
ASSISTANT_PROVIDER = "agnes"


def llm_available() -> bool:
    return bool(AGNES_API_KEY)


def max_rounds_for_role(role: str) -> int:
    if role == "teacher":
        return ASSISTANT_LLM_MAX_ROUNDS_TEACHER
    if role == "admin":
        return ASSISTANT_LLM_MAX_ROUNDS_ADMIN
    return ASSISTANT_LLM_MAX_ROUNDS_DEFAULT


def normalize_messages(raw: list[Any]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        role = clip_text(item.get("role"), 16)
        content = clip_text(item.get("content"), 4000)
        if role not in {"user", "assistant"} or not content:
            continue
        out.append({"role": role, "content": content})
    return out[-20:]


def _parse_openai_message_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                parts.append(str(part.get("text", "")))
            elif isinstance(part, str):
                parts.append(part)
        return "".join(parts).strip()
    return str(content or "").strip()


def _call_agnes_chat(*, api_messages: list[dict[str, str]]) -> tuple[str | None, str | None]:
    import os

    url = f"{AGNES_API_BASE}/chat/completions"
    payload = {
        "model": os.getenv("AGNES_ASSISTANT_MODEL", AGNES_ASSISTANT_MODEL),
        "messages": api_messages,
        "temperature": float(os.getenv("ASSISTANT_LLM_TEMPERATURE", "0.35")),
        "max_tokens": int(os.getenv("ASSISTANT_LLM_MAX_TOKENS", "1200")),
    }
    body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body_bytes,
        method="POST",
        headers={
            "Authorization": f"Bearer {AGNES_API_KEY}",
            "Content-Type": "application/json",
        },
    )
    timeout = float(os.getenv("AGNES_API_TIMEOUT", "90"))

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8", errors="replace")[:400]
        except OSError:
            pass
        logger.warning("agnes assistant HTTP %s: %s", e.code, err_body)
        try:
            parsed = json.loads(err_body) if err_body else {}
            msg = parsed.get("error", {}).get("message") if isinstance(parsed.get("error"), dict) else None
            if not msg:
                msg = parsed.get("message")
        except json.JSONDecodeError:
            msg = None
        return None, msg or f"Agnes API 错误 HTTP {e.code}"
    except urllib.error.URLError as e:
        logger.warning("agnes assistant network error: %s", e)
        return None, "无法连接 Agnes API，请检查网络或 AGNES_API_BASE"
    except TimeoutError:
        return None, "Agnes API 请求超时"
    except OSError as e:
        logger.exception("agnes assistant request error")
        return None, str(e)[:200]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None, "Agnes API 返回非 JSON"

    if isinstance(data.get("error"), dict):
        return None, clip_text(data["error"].get("message"), 200) or "Agnes API 返回错误"

    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        return None, "Agnes API 返回无 choices"

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(message, dict):
        return None, "Agnes API 返回格式异常"

    text = _parse_openai_message_content(message.get("content"))
    if not text:
        return None, "模型返回为空"
    return text, None


def chat_completion(
    *,
    messages: list[dict[str, str]],
    role: str,
    path: str,
    extra_context: str = "",
) -> tuple[str | None, str | None]:
    """返回 (reply_text, error_message)。"""
    if not llm_available():
        return None, "未配置 π 助手 API Key（AGNES_API_KEY）"

    system = build_system_prompt(role=role or "guest", path=path or "/", extra_context=extra_context)
    api_messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for m in messages:
        api_messages.append({"role": m["role"], "content": m["content"]})

    return _call_agnes_chat(api_messages=api_messages)
