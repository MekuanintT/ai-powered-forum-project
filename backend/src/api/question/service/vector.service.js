import { GoogleGenAI } from '@google/genai';
import { safeExecute } from '../../../../db/config.js';
import { ServiceUnavailableError } from '../../../utils/errors/index.js';

const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeQuestionText({ title }) {
  return normalizeWhitespace(`${title || ''}`.normalize('NFKC').toLowerCase());
}

/**
 * Generate a normalized embedding for the provided question text using the Gemini API.
 */
export async function generateQuestionEmbedding(sourceText, options = {}) {
  const { taskType = 'RETRIEVAL_DOCUMENT' } = options;

  try {
    const response = await ai.models.embedContent({
      model: GEMINI_EMBEDDING_MODEL,
      contents: sourceText,
      config: {
        taskType,
        outputDimensionality: 768,
      },
    });

    const values = response.embeddings[0].values;

    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('Gemini embedding response does not contain values');
    }

    return { embedding: values };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

function validateEmbedding(embedding) {
  if (!Array.isArray(embedding)) throw new Error('Embedding must be an array');
  if (embedding.length === 0) throw new Error('Embedding cannot be empty');
  if (!embedding.every(v => typeof v === 'number' && !isNaN(v))) {
    throw new Error('Embedding must contain only valid numbers');
  }
}

/**
 * Store (upsert) a question's vector embedding.
 */
export async function storeQuestionVector({
  questionId,
  sourceText,
  embedding = [],
  status = 'ready',
}) {
  const sql = `
    INSERT INTO question_vectors (question_id, source_text, embedding, status)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      source_text = VALUES(source_text),
      embedding = VALUES(embedding),
      status = VALUES(status),
      updated_at = CURRENT_TIMESTAMP
  `;

  if (status === 'failed' || !embedding || embedding.length === 0) {
    await safeExecute(sql, [questionId, sourceText, JSON.stringify([]), 'failed']);
    return;
  }

  validateEmbedding(embedding);
  const embeddingJson = JSON.stringify(embedding);

  try {
    await safeExecute(sql, [questionId, sourceText, embeddingJson, status]);
  } catch (error) {
    console.error('=== MYSQL UPSERT ERROR ===', error);
    throw error;
  }
}