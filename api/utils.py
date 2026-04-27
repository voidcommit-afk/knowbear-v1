"""Input validation and sanitization utilities."""

import re
import html

MAX_TOPIC_LENGTH = 200
CONTROL_CHARS_PATTERN = re.compile(r"[\x00-\x1f\x7f]")
UNSAFE_MARKUP_PATTERN = re.compile(r"[<>]")


def sanitize_topic(topic: str) -> str:
    """Sanitize and validate topic input."""
    if not topic or not isinstance(topic, str):
        raise ValueError("Topic required")
    topic = topic.strip()
    if len(topic) > MAX_TOPIC_LENGTH:
        raise ValueError(f"Topic exceeds {MAX_TOPIC_LENGTH} chars")
    if CONTROL_CHARS_PATTERN.search(topic):
        raise ValueError("Invalid control characters in topic")
    if UNSAFE_MARKUP_PATTERN.search(topic):
        raise ValueError("Invalid characters in topic")
    return html.escape(topic)

LEVELS = ["eli5", "eli12", "eli15", "meme"]
