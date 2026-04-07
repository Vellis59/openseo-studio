export const PROMPT_BLOCKS = {
  BASE_INVARIANTS: [
    "Output strictly in Markdown (no HTML, no YAML front matter).",
    "Use Markdown headings, lists, and tables when useful.",
    "Do not add YAML front matter.",
    "Avoid raw HTML.",
    "Do not use emojis.",
    "Avoid generic, overused AI-style introductions."
  ],
  ROLE_DEFINITION: [
    "You are a senior SEO content writer.",
    "You write long-form, well-structured, readable blog posts that follow on-page SEO best practices."
  ],
  STRUCTURE_CORE: [
    "Start with a strong, useful H1 title.",
    "Write a short and direct introduction.",
    "Use a clear heading hierarchy (H2, H3, H4 if necessary) that reflects a solid SEO structure.",
    "End with a conclusion that summarises the key points and suggests a concrete next step."
  ],
  STRUCTURE_EXTENDED: {
    TOC: "At the beginning of the article, add a Markdown table of contents with internal links to the main sections.",
    FAQ: "Add a concise FAQ section with clear questions and brief answers relevant to the topic.",
    CALLOUTS: "Use brief callouts (Tip:, Note:, Warning:) when they clarify key takeaways or cautions."
  },
  SEO_EXTRAS: [
    "Add an SEO metadata block with a concise title tag and meta description formatted in Markdown.",
    "Suggest relevant tags or categories when useful."
  ],
  WRITING_GUIDELINES: [
    "Use short paragraphs and clear sentences.",
    "Use bullet lists or numbered lists when useful.",
    "Add a table in Markdown if it helps compare options, steps, tools or features.",
    "Keep paragraphs tight and focused."
  ]
};

export function buildSystemPrompt() {
  return [...PROMPT_BLOCKS.ROLE_DEFINITION, ...PROMPT_BLOCKS.BASE_INVARIANTS].join(" ");
}

export function buildPromptBlocks({
  keyword,
  languageConfig,
  tone,
  length,
  extra,
  research,
  planText,
  mode,
  tocRequested
}) {
  const lines = [];
  const languageName = languageConfig.promptName;

  lines.push(
    `Write a long-form SEO-optimized blog post in ${languageName}.`,
    `The entire article must be written exclusively in ${languageName}. Do not mix languages.`,
    `Main keyword: "${keyword}".`,
    `Tone: ${tone}.`,
    `Target length: ${length}.`,
    ""
  );

  if (planText) {
    lines.push("Use the following outline:");
    lines.push(planText);
    lines.push("");
  }

  if (research) {
    lines.push("Latest web research (factual source):", research, "");
  }

  lines.push("Base rules:");
  PROMPT_BLOCKS.BASE_INVARIANTS.forEach((rule) => lines.push(`- ${rule}`));
  lines.push("");

  return lines.join("\n");
}
