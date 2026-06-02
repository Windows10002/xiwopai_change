"""Flask 应用入口。"""
from __future__ import annotations

import logging

from flask import Flask

from core.config import FLASK_DEBUG, FLASK_PORT, GRADING_DISPUTES_DB, MAX_UPLOAD_BYTES, SECRET_KEY, UPLOAD_FOLDER
from core.logging_config import setup_logging

logger = logging.getLogger(__name__)


def create_app() -> Flask:
    setup_logging()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES

    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

    try:
        from core.disputes_service import DisputesStore

        app.config["DISPUTES_STORE"] = DisputesStore(GRADING_DISPUTES_DB)
    except ImportError:
        app.config["DISPUTES_STORE"] = None
        logger.warning("DisputesStore not loaded")

    from routes.api_auth import auth_bp
    from routes.api_disputes import disputes_bp
    from routes.api_feedback import feedback_bp
    from routes.api_grade import grade_bp
    from routes.api_health import health_bp
    from routes.api_insights import insights_bp
    from routes.api_uploads import uploads_bp
    from routes.spa import spa_bp

    for bp in (auth_bp, grade_bp, feedback_bp, insights_bp, disputes_bp, health_bp, uploads_bp, spa_bp):
        app.register_blueprint(bp)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=FLASK_DEBUG, port=FLASK_PORT)
