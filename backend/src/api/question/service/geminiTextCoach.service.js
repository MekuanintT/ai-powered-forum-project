import { GoogleGenAI } from '@google/genai';

import { safeExecute } from '../../../../db/config.js';
import { NotFoundError } from '../../../utils/errors/index.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';

/**
 * Extracts the text content from a Gemini generateContent response,
 * across a couple of possible response shapes.
 *
 * @param {Object} response
 * @returns {string|null}
 */
const extractResponseText = (response) => {
  return (
    response?.text ??
    response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    null
  );
};

/**
 * Attempts to parse a JSON object out of a model response, tolerating
 * markdown code fences or extra surrounding text.
 *
 * @param {string|null} text
 * @returns {Object|null}
 */
const extractJson = (text) => {
  if (!text) {
    return null;
  }

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

/**
 * Generates AI coaching tips for a draft question before it's posted.
 *
 * @param {Object} params
 * @param {string} [params.title] - Draft question title.
 * @param {string} params.content - Draft question content.
 * @returns {Promise<Object>} Object containing a `tips` array.
 */
export const generateQuestionDraftCoachService = async ({ title, content }) => {
  const prompt = `You are an expert programming forum moderator coaching a learner on how to write a clear, well-formed technical question that other developers can answer quickly.

Draft title: ${title || '(no title provided)'}
Draft content:
${content}

Review the draft for clarity, completeness, and formatting. Consider whether it states what the person is trying to do, what they expected, what actually happened, and whether relevant code/error messages/environment details are included.

Respond with ONLY valid JSON in this exact shape, with no markdown code fences and no commentary outside the JSON:
{"tips": ["short actionable tip", "short actionable tip"]}

Provide between 2 and 5 specific, actionable tips.`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });

  const parsed = extractJson(extractResponseText(response));

  if (!parsed || !Array.isArray(parsed.tips) || parsed.tips.length === 0) {
    return {
      tips: [
        'Describe what you expected to happen versus what actually happened.',
        'Include relevant code snippets, error messages, and environment details.',
      ],
    };
  }

  return { tips: parsed.tips };
};

/**
 * Assesses how well a draft answer addresses a specific question, using AI.
 *
 * @param {Object} params
 * @param {string} params.questionHash - Hash of the question being answered.
 * @param {string} params.answerText - Draft answer content.
 * @returns {Promise<Object>} Object containing `level` and `note`.
 */
export const assessAnswerAgainstQuestionService = async ({
  questionHash,
  answerText,
}) => {
  const questionSql = `
    SELECT
      question_id,
      title,
      content
    FROM questions
    WHERE question_hash = ?
    LIMIT 1
  `;

  const rows = await safeExecute(questionSql, [questionHash]);

  if (!rows || rows.length === 0) {
    throw new NotFoundError('Question not found.');
  }

  const question = rows[0];

  const prompt = `You are evaluating how well a draft forum answer addresses a technical question. Be concise and fair, and judge relevance only — not whether the answer is technically correct.

Question title: ${question.title}
Question content:
${question.content}

Draft answer:
${answerText}

Respond with ONLY valid JSON in this exact shape, with no markdown code fences and no commentary outside the JSON:
{"level": "strong", "note": "one or two sentence explanation of the assessment"}

"level" must be exactly one of: "strong", "partial", "weak".`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });

  const parsed = extractJson(extractResponseText(response));

  const allowedLevels = ['strong', 'partial', 'weak'];

  if (!parsed || !allowedLevels.includes(parsed.level) || !parsed.note) {
    return {
      level: 'partial',
      note: 'We could not fully assess this answer automatically. Consider reviewing it manually before posting.',
    };
  }

  return {
    level: parsed.level,
    note: parsed.note,
  };
};