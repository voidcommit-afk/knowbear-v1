"""Token-efficient prompt templates."""

PROMPTS: dict[str, str] = {
    "eli5": "Explain {topic} like I'm 5: simple words, short sentences, easy analogy.",
    "eli10": "Explain {topic} for a 10-year-old: basic terms, clear examples.",
    "eli12": "Explain {topic} for a 12-year-old: some technical terms, real-world examples.",
    "eli15": "Explain {topic} for a 15-year-old: more depth, key concepts explained.",
    "meme": "Explain {topic} as a funny one-liner meme with relatable analogy.",
    "technical": "Technical explanation of {topic}: key concepts, equations if relevant.",
    "systemic": "Describe {topic} as an interconnected system: main components and relationships.",
    "diagram": "Create Mermaid.js flowchart for {topic}: nodes=components, edges=relationships. Output ONLY valid mermaid code.",
}

JUDGE_PROMPT = """Rate these responses for "{topic}" on coherence (1-5), accuracy (1-5), conciseness (1-5).
{responses}
Output JSON: {{"best": 0|1, "reason": "brief"}}"""

# Model configs for Groq
FREE_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
PREMIUM_MODELS = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"]
JUDGE_MODEL = "llama-3.1-8b-instant"
FAST_MODEL = "llama-3.1-8b-instant"
