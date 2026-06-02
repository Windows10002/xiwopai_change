"""React SPA 静态托管。"""
from __future__ import annotations

from flask import Blueprint, abort, send_file, send_from_directory

from core.config import FRONTEND_DIST

spa_bp = Blueprint("spa", __name__)

SPA_ROUTES = (
    "/",
    "/login",
    "/math",
    "/english",
    "/settings",
    "/wrong-book",
    "/student-analytics",
    "/class-analytics",
    "/feedback-dashboard",
)


def _spa_index_path() -> str:
    return str(FRONTEND_DIST / "index.html")


def spa_built() -> bool:
    return (FRONTEND_DIST / "index.html").is_file()


def _serve_spa():
    if not spa_built():
        abort(
            404,
            description="未找到前端构建。请在项目下执行: cd frontend && npm install && npm run build",
        )
    return send_file(_spa_index_path())


@spa_bp.route("/assets/<path:filename>")
def frontend_vite_assets(filename):
    if not spa_built():
        abort(404)
    assets_dir = FRONTEND_DIST / "assets"
    if not assets_dir.is_dir():
        abort(404)
    return send_from_directory(assets_dir, filename)


for _path in SPA_ROUTES:
    spa_bp.add_url_rule(_path, endpoint=f"spa_{_path.strip('/').replace('-', '_') or 'index'}", view_func=_serve_spa)
