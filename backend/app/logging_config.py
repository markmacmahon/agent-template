"""Central logging configuration helpers for the backend service."""

from __future__ import annotations

import logging
import os
from typing import Optional

LOG_LEVEL_ENV = "LOG_LEVEL"
DEFAULT_LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"

LOG_LEVELS = {
    "CRITICAL": logging.CRITICAL,
    "ERROR": logging.ERROR,
    "WARNING": logging.WARNING,
    "INFO": logging.INFO,
    "DEBUG": logging.DEBUG,
}


def _resolve_level(level_name: Optional[str] = None) -> int:
    if not level_name:
        level_name = os.getenv(LOG_LEVEL_ENV, DEFAULT_LOG_LEVEL)
    normalized = level_name.strip().upper()
    return LOG_LEVELS.get(normalized, logging.INFO)


def configure_logging(level_name: Optional[str] = None) -> int:
    """Configure root logging handler with a consistent formatter."""
    level = _resolve_level(level_name)
    root_logger = logging.getLogger()
    formatter = logging.Formatter(LOG_FORMAT)

    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)
        root_logger.addHandler(handler)
    else:
        for handler in root_logger.handlers:
            handler.setFormatter(formatter)

    root_logger.setLevel(level)
    return level


def get_logger(name: str) -> logging.Logger:
    """Return a module-scoped logger."""
    return logging.getLogger(name)
