"""Enhanced prompt templates with Chain of Thought and Few-Shot examples."""

PROMPTS: dict[str, str] = {
    "eli5": """Think step-by-step: 1. Analyze audience (5-year-old). 2. Select a sensory, vivid analogy. 3. Draft explanation.

Explain {topic} like I'm 5: simple words, short sentences, easy analogy. Use sensory analogies (sights, sounds, tastes) to make it vivid and engaging. End with a simple, engaging question for the child.

Few-shot examples:
Topic: Gravity
Output: Gravity is like an invisible hug from the Earth! It keeps you from floating away into the sky like a balloon. When you jump, gravity pulls you back down - it's like the Earth saying "come back!" That's why when you drop a ball, it falls down instead of up. Can you feel gravity when you jump on your bed?

Topic: Rainbow
Output: A rainbow is like a magic smile in the sky made of colors! When the sun shines through raindrops, the light breaks into all the pretty colors you see - red, orange, yellow, green, blue, and purple. It's like when you blow bubbles and see shiny colors dancing on them! Have you ever tried to touch a rainbow?

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",

    "eli10": """Think step-by-step: 1. Analyze audience (10-year-old). 2. Select relatable examples. 3. Draft explanation.

Explain {topic} for a 10-year-old: basic terms, clear examples from everyday life. Include one 'Did you know?' fun fact to spark curiosity.

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",

    "eli12": """Think step-by-step: 1. Analyze audience (12-year-old). 2. Balance simplicity with some technical depth. 3. Draft explanation.

Explain {topic} for a 12-year-old: some technical terms with clear definitions, real-world examples they can relate to.

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",

    "eli15": """Think step-by-step: 1. Analyze audience (15-year-old). 2. Introduce key concepts with appropriate depth. 3. Draft explanation.

Explain {topic} for a 15-year-old: more depth, key concepts explained clearly, connections to broader ideas.

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",

    "meme": """Think step-by-step: 1. Identify the core concept. 2. Find a humorous, relatable angle. 3. Craft punchy one-liner.

Explain {topic} as a funny one-liner meme with relatable analogy. Make it punchy and shareable.

Output in plain text only.""",

    "technical": """Think step-by-step: 1. Analyze the technical depth needed. 2. Identify key equations and concepts. 3. Draft structured explanation.

Technical explanation of {topic}: key concepts, fundamental principles, and equations with step-by-step derivations where applicable. Include a Limitations/Edge Cases section to provide a balanced technical view.

Few-shot examples:
Topic: Newton's Second Law
Output: Newton's Second Law states that Force equals mass times acceleration (F = ma). This fundamental principle describes how the motion of an object changes when forces are applied. Starting from the definition of acceleration (a = Δv/Δt), and considering that force causes a change in momentum (p = mv), we can derive: F = Δp/Δt = Δ(mv)/Δt = m(Δv/Δt) = ma. This assumes constant mass. The law applies in inertial reference frames and breaks down at relativistic speeds or quantum scales. Limitations/Edge Cases: The equation assumes constant mass, which doesn't hold for systems like rockets that eject mass. At speeds approaching the speed of light, relativistic mechanics must be used instead.

Topic: Binary Search Algorithm
Output: Binary search is an efficient algorithm for finding a target value in a sorted array with O(log n) time complexity. The algorithm works by repeatedly dividing the search interval in half. Starting with the entire array, compare the target with the middle element. If they match, return the position. If the target is less than the middle element, repeat the search on the left half; otherwise, search the right half. Time complexity analysis: T(n) = T(n/2) + O(1), which solves to O(log n) by the Master theorem. Space complexity is O(1) for iterative implementation, O(log n) for recursive due to call stack. Limitations/Edge Cases: Requires a pre-sorted array, making it unsuitable for frequently changing datasets. Performance degrades if sorting cost exceeds binary search benefits. For small datasets (n < 10), linear search may be faster due to lower overhead.

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",

    "systemic": """Think step-by-step: 1. Identify main system components. 2. Map relationships and feedback loops. 3. Draft interconnected description.

Describe {topic} as an interconnected system: main components, relationships between them, feedback loops, and emergent properties.

Few-shot examples:
Topic: Water Cycle
Output: The water cycle is a closed system with interconnected processes that continuously circulate water through Earth's atmosphere, land, and oceans. The main components are: evaporation (water transforms from liquid to vapor using solar energy), condensation (water vapor cools and forms clouds), precipitation (water returns to Earth as rain or snow), and collection (water gathers in rivers, lakes, and oceans). These components form feedback loops: more evaporation leads to more clouds, which causes more precipitation, returning water to collection points where evaporation begins again. The system exhibits emergent properties like regional climate patterns and the distribution of freshwater resources. Energy input from the sun drives the entire cycle, while gravity pulls water downward.

Topic: Supply Chain
Output: A supply chain is a dynamic system connecting raw material extraction, manufacturing, distribution, and consumption. The main components include: suppliers (provide raw materials), manufacturers (transform materials into products), distributors (warehouse and transport goods), retailers (sell to end consumers), and customers (create demand). These components interact through information flows (orders, forecasts), material flows (physical goods movement), and financial flows (payments, credit). Feedback loops exist at multiple levels: customer demand signals propagate upstream affecting production, while supply constraints ripple downstream affecting prices. The system demonstrates emergent properties like the bullwhip effect, where small demand fluctuations amplify upstream, and resilience characteristics that determine recovery from disruptions.

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",

    "diagram": """Think step-by-step: 1. Identify key components/concepts. 2. Determine relationships and flow. 3. Structure as valid Mermaid syntax.

Create Mermaid.js flowchart for {topic}: nodes represent components, edges represent relationships or flow. Use clear labels and logical structure.

Output ONLY valid mermaid code.""",

    "classic60": """Think step-by-step: 1. Analyze audience (60+ years). 2. Select classic, familiar metaphors. 3. Draft at slower pace.

Explain {topic} to someone who's 60 or older. Use classic metaphors they'll recognize - like balancing a checkbook, reading the newspaper, looking up shows in a TV Guide, or tuning a radio dial. Take your time with the explanation, using clear language and familiar examples from everyday life.

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",

    "gentle70": """Think step-by-step: 1. Analyze audience (70+ years). 2. Choose deeply familiar analogies. 3. Craft patient, reassuring explanation.

Explain {topic} to someone who's 70 or older with extreme patience and warmth. Use familiar examples like a rotary phone, drive-in movies, a party line, or mailing a letter. No technical jargon whatsoever - keep everything in plain, everyday language. Include reassuring phrases to make them feel comfortable. There's no hurry, take all the time needed.

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",

    "warm80": """Think step-by-step: 1. Analyze audience (80+ years). 2. Select ultra-basic, timeless analogies. 3. Craft warmest possible explanation.

Explain {topic} to someone who's 80 or older with the warmest, most patient tone possible. Use ultra-basic analogies from timeless activities like baking bread, tending a garden, knitting, or sitting on the porch. Keep everything simple and comforting. No rush at all - we have all the time in the world.

Output in plain text only, no markdown, no bolding, no headers. Just paragraphs.""",
}

JUDGE_PROMPT = """Rate these responses for "{topic}" on coherence (1-5), accuracy (1-5), conciseness (1-5).
{responses}
Output JSON: {{"best": 0|1, "reason": "brief"}}"""

# Model configs for Groq
FREE_MODELS = ["llama-3.1-8b-instant"]
PREMIUM_MODELS = ["llama-3.1-8b-instant", "gemini"]
JUDGE_MODEL = "llama-3.1-8b-instant"
FAST_MODEL = "llama-3.1-8b-instant"

# Brief Dive Mode: High-quality, concise models
BRIEF_DIVE_MODELS = ["openai/gpt-oss-20b"]
BRIEF_DIVE_JUDGE = "gpt-oss-120b"
