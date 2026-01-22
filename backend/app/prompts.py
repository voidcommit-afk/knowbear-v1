"""Token-efficient prompt templates."""

PROMPTS: dict[str, str] = {
    "eli5": "Explain {topic} like I'm 5: simple words, short sentences, easy analogy. Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.",
    "eli10": "Explain {topic} for a 10-year-old: basic terms, clear examples. Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.",
    "eli12": "Explain {topic} for a 12-year-old: some technical terms, real-world examples. Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.",
    "eli15": "Explain {topic} for a 15-year-old: more depth, key concepts explained. Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.",
    "meme": "Explain {topic} as a funny one-liner meme with relatable analogy. Output in plain text only.",
    "technical": "Technical explanation of {topic}: key concepts, equations if relevant. Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.",
    "systemic": "Describe {topic} as an interconnected system: main components and relationships. Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.",
    "diagram": "Create Mermaid.js flowchart for {topic}: nodes=components, edges=relationships. Output ONLY valid mermaid code.",
    "classic60": "Explain {topic} to a 60-year-old using classic metaphors like a checkbook, newspaper, or TV Guide. Slower pace, clear language. Output in plain text only.",
    "gentle70": "Explain {topic} to a 70-year-old with extreme patience. Use familiar examples like a rotary phone, drive-in movies, or a party line. Output in plain text only.",
    "warm80": "Explain {topic} to an 80-year-old with the warmest possible tone. Use ultra-basic analogies like baking bread or gardening. Output in plain text only.",
}

JUDGE_PROMPT = """Rate these responses for "{topic}" on coherence (1-5), accuracy (1-5), conciseness (1-5).
{responses}
Output JSON: {{"best": 0|1, "reason": "brief"}}"""

# Model configs for Groq
FREE_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
PREMIUM_MODELS = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemini", "gemma2-9b-it"]
JUDGE_MODEL = "llama-3.1-8b-instant"
FAST_MODEL = "llama-3.1-8b-instant"

# Brief Dive Mode: High-quality, concise models
BRIEF_DIVE_MODELS = ["gemma2-9b-it", "gpt-oss-120b"]
BRIEF_DIVE_JUDGE = "gpt-oss-120b"
