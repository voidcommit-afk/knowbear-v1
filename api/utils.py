"""Input validation and sanitization utilities."""

import re
import html

MAX_TOPIC_LENGTH = 200
ALLOWED_PATTERN = re.compile(r"^[\w\s\-.,!?'\"()]+$", re.UNICODE)


def sanitize_topic(topic: str) -> str:
    """Sanitize and validate topic input."""
    if not topic or not isinstance(topic, str):
        raise ValueError("Topic required")
    topic = topic.strip()
    if len(topic) > MAX_TOPIC_LENGTH:
        raise ValueError(f"Topic exceeds {MAX_TOPIC_LENGTH} chars")
    if not ALLOWED_PATTERN.match(topic):
        raise ValueError("Invalid characters in topic")
    return html.escape(topic)

LEVELS = ["eli5", "eli12", "eli15", "meme"]
