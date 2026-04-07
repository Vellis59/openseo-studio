import { escapeRegex, splitSentences, countSyllables } from './text.js';

export function parseHeadings(markdown) {
  return markdown
    .split(/\n/)
    .map((line) => {
      const match = line.match(/^(#{1,6})\s+(.*)/);
      if (!match) return null;
      return { level: match[1].length, text: match[2].trim() };
    })
    .filter(Boolean);
}

export function analyzeSeo(content, keyword) {
  const cleanContent = content || "";
  const keywordNormalized = (keyword || "").trim().toLowerCase();
  const words = cleanContent.match(/\b[\p{L}'-]+\b/gu) || [];
  const wordCount = words.length;
  const headings = parseHeadings(cleanContent);

  let score = 0;
  const checks = [];
  const suggestions = [];

  const h1 = headings.find((h) => h.level === 1);
  const h2 = headings.find((h) => h.level === 2);

  if (h1) {
    const hasKeyword = keywordNormalized && h1.text.toLowerCase().includes(keywordNormalized);
    score += hasKeyword ? 22 : 14;
    checks.push(`${hasKeyword ? "✅" : "⚠️"} Keyword in H1`);
    if (!hasKeyword && keywordNormalized) {
      suggestions.push("Add the main keyword to your H1.");
    }
  } else {
    suggestions.push("Add a clear H1 heading at the top.");
  }

  if (h2) {
    const hasKeywordH2 = keywordNormalized && h2.text.toLowerCase().includes(keywordNormalized);
    score += hasKeywordH2 ? 16 : 10;
    checks.push(`${hasKeywordH2 ? "✅" : "⚠️"} Keyword appears in an H2`);
    if (!hasKeywordH2 && keywordNormalized) {
      suggestions.push("Add the keyword to at least one H2.");
    }
  } else {
    suggestions.push("Add H2 subheadings to structure the article.");
  }

  const keywordCount = keywordNormalized
    ? (cleanContent.toLowerCase().match(new RegExp(`\\b${escapeRegex(keywordNormalized)}\\b`, "g")) || []).length
    : 0;
  const density = wordCount ? (keywordCount / wordCount) * 100 : 0;
  const idealDensity = 2;
  const densityScore = 26 - Math.min(20, Math.abs(density - idealDensity) * 4);
  score += Math.max(4, densityScore);
  checks.push(`ℹ️ Keyword density: ${density.toFixed(2)}% (${keywordCount} mentions)`);
  if (density < 1 && keywordNormalized) {
    suggestions.push("Increase keyword usage slightly (aim for ~1-3%).");
  } else if (density > 3.5) {
    suggestions.push("Reduce keyword repetition to avoid stuffing.");
  }

  const validHierarchy = (() => {
    if (!headings.length) return false;
    let lastLevel = headings[0].level;
    if (lastLevel !== 1) return false;
    for (let i = 1; i < headings.length; i++) {
      const level = headings[i].level;
      if (level - lastLevel > 1) return false;
      lastLevel = level;
    }
    return true;
  })();

  score += validHierarchy ? 16 : 6;
  checks.push(`${validHierarchy ? "✅" : "⚠️"} Heading hierarchy H1 > H2 > H3`);
  if (!validHierarchy) {
    suggestions.push("Reorder headings to follow H1 > H2 > H3 without skipping levels.");
  }

  const lengthScore = (() => {
    if (wordCount >= 800 && wordCount <= 2500) return 20;
    if (wordCount >= 600 && wordCount < 800) return 14;
    if (wordCount > 2500 && wordCount <= 3200) return 14;
    return 8;
  })();
  score += lengthScore;
  checks.push(`ℹ️ Length: ${wordCount} words`);
  if (wordCount < 800) {
    suggestions.push("Expand the article to reach at least 800 words.");
  } else if (wordCount > 3000) {
    suggestions.push("Trim or split very long sections to stay concise.");
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    checks,
    suggestions,
    density,
    wordCount
  };
}

export function computeReadability(content, language) {
  const sentences = splitSentences(content);
  const words = (content.match(/\b[\p{L}'-]+\b/gu) || []).map((w) => w.trim());
  const wordCount = words.length || 1;
  const sentenceCount = sentences.length || 1;
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = syllables / wordCount;
  const isFrench = (language || "").toLowerCase().includes("french");

  const score = isFrench
    ? 207 - 1.015 * wordsPerSentence - 73.6 * syllablesPerWord
    : 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

  const complexSentences = sentences.filter((s) => s.split(/\s+/).filter(Boolean).length > 25);

  return {
    score: Math.round(score),
    averageSentenceLength: Math.round(wordsPerSentence * 10) / 10,
    complexSentences
  };
}
