import importlib
import logging

import pytest


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    """Ensure LOG_LEVEL env is clean for each test."""
    monkeypatch.delenv("LOG_LEVEL", raising=False)
    yield


def test_configure_logging_uses_environment_level(monkeypatch, caplog):
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    from app import logging_config

    importlib.reload(logging_config)

    logging_config.configure_logging()
    logger = logging_config.get_logger("tests.logging.debug")

    caplog.set_level(logging.DEBUG)
    logger.debug("debug enabled")

    assert "debug enabled" in caplog.text


def test_configure_logging_filters_below_level(monkeypatch, caplog):
    monkeypatch.setenv("LOG_LEVEL", "ERROR")
    from app import logging_config

    importlib.reload(logging_config)

    logging_config.configure_logging()
    logger = logging_config.get_logger("tests.logging.errors")

    caplog.set_level(logging.ERROR)

    logger.info("this should be ignored")
    assert "this should be ignored" not in caplog.text

    logger.error("critical failure")
    assert "critical failure" in caplog.text
