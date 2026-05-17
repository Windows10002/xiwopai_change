"""
阿里云 DashScope API Key：环境变量 > .env > .env.example（仅作本地兜底，勿把真实 Key 提交到 Git）。
"""

from __future__ import annotations

import os
from pathlib import Path

_LAST_API_ERROR: str | None = None
_KEY_SOURCE: str | None = None

_ROOT = Path(__file__).resolve().parent


def _parse_env_file(path: Path) -> None:
    if not path.is_file():
        return
    try:
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val
    except OSError:
        pass


def _load_dotenv_files() -> None:
    global _KEY_SOURCE
    env_file = _ROOT / ".env"
    example_file = _ROOT / ".env.example"

    _parse_env_file(env_file)
    key = (os.getenv("DASHSCOPE_API_KEY") or "").strip()
    if key:
        _KEY_SOURCE = ".env" if env_file.is_file() else "environment"
        return

    _parse_env_file(example_file)
    key = (os.getenv("DASHSCOPE_API_KEY") or "").strip()
    if key and example_file.is_file():
        _KEY_SOURCE = ".env.example"


def get_key_source() -> str | None:
    _load_dotenv_files()
    return _KEY_SOURCE


def get_dashscope_api_key() -> str:
    _load_dotenv_files()
    return (os.getenv("DASHSCOPE_API_KEY") or "").strip()


def set_last_api_error(msg: str | None) -> None:
    global _LAST_API_ERROR
    _LAST_API_ERROR = (msg or "").strip() or None


def get_last_api_error() -> str | None:
    return _LAST_API_ERROR


def configure_dashscope() -> bool:
    """将有效 Key 写入 dashscope.api_key；未配置时返回 False。"""
    import dashscope

    key = get_dashscope_api_key()
    if not key:
        dashscope.api_key = ""
        set_last_api_error("未配置 DASHSCOPE_API_KEY")
        return False
    dashscope.api_key = key
    set_last_api_error(None)
    return True


def user_facing_api_error() -> str:
    err = get_last_api_error() or ""
    if "No API-key" in err or "未配置 DASHSCOPE" in err:
        return (
            "未配置阿里云 API Key。\n"
            "请在项目根目录创建 .env（可复制 .env.example 为 .env），内容为：\n"
            "DASHSCOPE_API_KEY=你的sk-密钥\n"
            "保存后重新运行 python app.py。"
        )
    if "401" in err:
        return f"API Key 无效或未授权（{err}）。请检查密钥是否正确、是否有余额。"
    if err:
        return f"AI 批改失败：{err}"
    return "AI 未返回有效结果。请查看 python app.py 控制台日志。"


def startup_key_status() -> str:
    """供 app.py 启动时打印。"""
    if not get_dashscope_api_key():
        return (
            "[警告] 未配置 DASHSCOPE_API_KEY。\n"
            "       请把 .env.example 复制为 .env 并填入密钥，或设置环境变量后重启。"
        )
    src = get_key_source()
    if src == ".env.example":
        return (
            "[提示] 已从 .env.example 读取 API Key（可用）。\n"
            "       建议：复制为 .env 文件（copy .env.example .env），.env 不会提交到 Git。"
        )
    return "DashScope API Key: 已加载" + (f"（来自 {src}）" if src else "")
