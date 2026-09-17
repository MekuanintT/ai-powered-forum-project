import { GoogleGenAI } from "@google/genai";
import { ServiceUnavailableError } from "../../../utils/errors/index.js";

const apiKey = process.env.GEMINI_API_KEY;

const modelName = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash-lite";

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const ai = new GoogleGenAI({
  apiKey,
});

/**
 * Strip optional markdown fence and parse JSON Object from model text.
 *
 * @param {string} raw
 * @returns {object|null}
 */
function parseJsonObjectFromGeminiText(raw) {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  let text = raw.trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  }

  try {
    const value = JSON.parse(text);

    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

async function fetchGeminiJsonTextResponse(userPrompt) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        maxOutputTokens: 300,
      },
    });

    console.log(response);

    const text = response.text;

    return typeof text === "string" ? text : "";
  } catch (error) {
    console.error("fetchGeminiJsonTextResponse:", error);

    throw new ServiceUnavailableError(
      "AI service is temporarily unavailable. Please try again later."
    );
  }
}

/**
 * Whether a draft answer seems to address the question (relevance, not correctness).
 *
 * @param questionTitle: string
 * @param questionContent: string
 * @param answerText: string
 * @returns level: string; note: string
 */
export const assessAnswerAgainstQuestionService = async (
  questionTitle,
  questionContent,
  answerText
) => {
  const userPrompt = `
QUESTION TITLE:
${questionTitle}

QUESTION BODY:
${questionContent}

ANSWER DRAFT:
${answerText}

Review whether a forum ANSWER draft addresses the QUESTION (relevance and completeness of engagement
— not whether the answer is factually correct).

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{
  "level": "strong" | "partial" | "weak",
  "note": "one short sentence"
}

Rules:
- "strong" if the draft clearly engages with the question;
- "partial" if somewhat related but missing key parts of the ask;
- "weak" if mostly off-topic or too vague.
- note: one sentence, plain language, no markdown, under 200 characters.
- Frame as fit/relevance, not grading.
`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);

    const levelRaw = parsed.level;
    const noteRaw = parsed.note;

    const level = ["strong", "partial", "weak"].includes(levelRaw)
      ? levelRaw
      : "partial";

    const note =
      typeof noteRaw === "string" && noteRaw.trim()
        ? noteRaw.trim().slice(0, 200)
        : "Could not summarize fit; treat this as a partial match.";

    return { level, note };
  } catch (error) {
    console.error("assessAnswerAgainstQuestionService:", error);

    throw new ServiceUnavailableError(
      "AI fit check is temporarily unavailable. Please try again later."
    );
  }
};

/**
 * Reviews a question draft and returns actionable writing tips.
 *
 * @param {string} [title] - Optional draft title.
 * @param {string} content - Draft question body (required).
 * @returns {Promise<{ tips: string[] }>}
 */
export const generateQuestionDraftCoachService = async (title, content) => {
  const titleSection = title
    ? `QUESTION TITLE:\n${title}\n\n`
    : "";

  const userPrompt = `
You are an expert technical forum coach for a programming Q&A platform.

${titleSection}QUESTION DRAFT:
${content}

Review the draft question above and provide 3–5 concise, actionable tips to help the author
write a clearer, more answerable question. Focus on:
- Clarity and specificity
- Whether expected vs actual behaviour is stated
- Whether a minimal code snippet or error message is included
- Title accuracy and length
- Scope (one problem per post)

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{
  "tips": ["Tip one.", "Tip two.", "Tip three."]
}

Rules:
- Each tip is a single plain-English sentence under 150 characters.
- Do not repeat the question back or give filler praise.
- Do not include markdown, code, or lists inside each tip string.
`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);

    const rawTips = parsed?.tips;
    const tips = Array.isArray(rawTips)
      ? rawTips
          .filter((t) => typeof t === "string" && t.trim())
          .map((t) => t.trim().slice(0, 200))
          .slice(0, 5)
      : [];

    return { tips };
  } catch (error) {
    console.error("generateQuestionDraftCoachService:", error);

    throw new ServiceUnavailableError(
      "AI draft coach is temporarily unavailable. Please try again later."
    );
  }
};

