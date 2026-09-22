import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite';

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
 * Generates an AI answer to a user's query, grounded strictly in the
 * provided RAG document chunks. The model is instructed to answer only
 * from the given context and to cite which chunks it used.
 *
 * @param {Object} params
 * @param {string} params.query - The user's question.
 * @param {Array<{ chunkIndex: number, content: string }>} params.chunks - Retrieved context chunks.
 * @returns {Promise<Object>} Object containing `answer` and `citations`.
 */
export const answerFromRagChunksService = async ({ query, chunks }) => {
  const contextBlock = chunks
    .map((chunk) => `[Chunk ${chunk.chunkIndex}]\n${chunk.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are answering a question using ONLY the context chunks provided below, taken from a document the user uploaded. Do not use outside knowledge. If the context does not contain enough information to answer, say so clearly rather than guessing.

Context:
${contextBlock}

Question:
${query}

Respond with ONLY valid JSON in this exact shape, with no markdown code fences and no commentary outside the JSON:
{"answer": "your answer here, grounded only in the context above", "citations": [{"ref": 1, "chunkIndex": 12}]}

"citations" should list the chunk numbers (matching the [Chunk N] labels above) that directly support your answer, each with a sequential "ref" number starting at 1.`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });

  const parsed = extractJson(extractResponseText(response));

  if (!parsed || typeof parsed.answer !== 'string') {
    return {
      answer:
        "I wasn't able to generate a grounded answer from this document. Please try rephrasing your question.",
      citations: [],
    };
  }

  return {
    answer: parsed.answer,
    citations: Array.isArray(parsed.citations) ? parsed.citations : [],
  };
};