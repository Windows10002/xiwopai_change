"""上传文件名与图片校验。"""
from __future__ import annotations

import uuid
from pathlib import Path

from core.config import ALLOWED_UPLOAD_EXT

# 常见图片魔数（前缀匹配）
_IMAGE_MAGIC = (
    (b"\xff\xd8\xff", {".jpg", ".jpeg"}),
    (b"\x89PNG\r\n\x1a\n", {".png"}),
    (b"GIF87a", {".gif"}),
    (b"GIF89a", {".gif"}),
    (b"BM", {".bmp"}),
    (b"RIFF", {".webp"}),  # WebP: RIFF....WEBP
)


def opaque_stored_filename(original: str) -> str:
    """始终使用 UUID 文件名，避免可猜测路径。"""
    ext = Path(original or "").suffix.lower()
    if ext not in ALLOWED_UPLOAD_EXT:
        ext = ".jpg"
    return f"{uuid.uuid4().hex}{ext}"


def validate_image_upload(file_storage, *, max_bytes: int) -> tuple[str | None, str | None]:
    """
    校验扩展名、大小与魔数。
    返回 (error_message, ext)；成功时 error_message 为 None。
    """
    filename = file_storage.filename or ""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_UPLOAD_EXT:
        return "图片格式不支持，请上传 JPG、PNG、WebP、BMP 或 GIF。", None

    stream = file_storage.stream
    pos = stream.tell()
    head = stream.read(16)
    stream.seek(pos)

    if len(head) < 4:
        return "无法读取图片内容。", None

    if ext == ".webp":
        if not (head.startswith(b"RIFF") and len(head) >= 12):
            # 需要更多字节确认 WEBP
            more = stream.read(4)
            stream.seek(pos)
            chunk = head + more
            if b"WEBP" not in chunk:
                return "文件内容与 WebP 格式不符。", None
        elif b"WEBP" not in head:
            more = stream.read(8)
            stream.seek(pos)
            if b"WEBP" not in (head + more):
                return "文件内容与 WebP 格式不符。", None
    else:
        matched = False
        for magic, exts in _IMAGE_MAGIC:
            if ext in exts and head.startswith(magic):
                matched = True
                break
        if not matched and ext != ".webp":
            return "文件内容与扩展名不匹配。", None

    stream.seek(0, 2)
    size = stream.tell()
    stream.seek(pos)
    if size > max_bytes:
        mb = max(1, max_bytes // (1024 * 1024))
        return f"图片过大，单张不超过 {mb} MB。", None

    return None, ext
