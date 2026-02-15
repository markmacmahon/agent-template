"""Simulator handler for generating canned assistant responses."""

from typing import Any

from app.schemas import RunResult

# Canned responses for the ecommerce_support scenario
_ECOMMERCE_RESPONSES = [
    "Thank you for reaching out! I'd be happy to help you with your order. Could you provide your order number?",
    "I understand your concern. Let me look into that for you right away.",
    "Your order is currently being processed and should ship within 1-2 business days.",
    "I've checked our system and your refund has been initiated. Please allow 5-7 business days for it to appear.",
    "Is there anything else I can help you with today?",
]


class SimulatorHandler:
    """Generates deterministic simulated responses based on scenario config."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.scenario: str = config.get("scenario", "generic")
        self.disclaimer: bool = config.get("disclaimer", False)
        self.latency_ms: int = config.get("latency_ms", 0)

    def generate(self, user_message: str) -> RunResult:
        if self.scenario == "ecommerce_support":
            reply = self._ecommerce_reply(user_message)
        else:
            reply = self._generic_reply(user_message)

        if self.disclaimer:
            reply = f"[Simulated] {reply}"

        return RunResult(
            reply_text=reply,
            source="simulator",
            metadata={"scenario": self.scenario},
            pending=False,
        )

    def _generic_reply(self, user_message: str) -> str:
        if not user_message:
            return "I'm here to help. What can I do for you?"
        return f"Echo: {user_message}"

    def _ecommerce_reply(self, user_message: str) -> str:
        # Pick response deterministically based on message length
        idx = len(user_message) % len(_ECOMMERCE_RESPONSES)
        return _ECOMMERCE_RESPONSES[idx]
