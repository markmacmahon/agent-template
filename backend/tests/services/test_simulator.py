import pytest

from app.services.simulator import SimulatorHandler


class TestSimulatorHandler:
    def test_echo_response(self):
        """Simulator echoes user message by default (generic scenario)."""
        handler = SimulatorHandler(config={})
        result = handler.generate("Hello there")
        assert result.source == "simulator"
        assert result.pending is False
        assert "Hello there" in result.reply_text

    def test_generic_scenario_default(self):
        """Default scenario is 'generic' which echoes."""
        handler = SimulatorHandler(config={"scenario": "generic"})
        result = handler.generate("Test message")
        assert result.source == "simulator"
        assert "Test message" in result.reply_text

    def test_ecommerce_support_scenario(self):
        """Ecommerce scenario returns canned support response."""
        handler = SimulatorHandler(config={"scenario": "ecommerce_support"})
        result = handler.generate("Where is my order?")
        assert result.source == "simulator"
        assert result.reply_text is not None
        assert len(result.reply_text) > 0

    def test_disclaimer_added_when_enabled(self):
        """When disclaimer=True, response includes disclaimer text."""
        handler = SimulatorHandler(config={"disclaimer": True})
        result = handler.generate("Hello")
        assert "[Simulated]" in result.reply_text

    def test_disclaimer_absent_when_disabled(self):
        """When disclaimer=False, no disclaimer in response."""
        handler = SimulatorHandler(config={"disclaimer": False})
        result = handler.generate("Hello")
        assert "[Simulated]" not in result.reply_text

    def test_disclaimer_absent_by_default(self):
        """Disclaimer is off by default."""
        handler = SimulatorHandler(config={})
        result = handler.generate("Hello")
        assert "[Simulated]" not in result.reply_text

    def test_metadata_contains_scenario(self):
        """Result metadata includes the scenario used."""
        handler = SimulatorHandler(config={"scenario": "ecommerce_support"})
        result = handler.generate("Hi")
        assert result.metadata["scenario"] == "ecommerce_support"

    def test_empty_message(self):
        """Simulator handles empty message gracefully."""
        handler = SimulatorHandler(config={})
        result = handler.generate("")
        assert result.reply_text is not None
        assert result.source == "simulator"
