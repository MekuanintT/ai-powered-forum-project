// Add these imports alongside the existing ones at the top of rag.service.js:
//
import { safeExecute } from '../../../../db/config.js';
import { GoogleGenAI } from '@google/genai';
import { answerFromRagChunksService } from './ragTextCoach.service.js';
import { NotFoundError } from '../../../utils/errors/index.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const RAG_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

/**
 * Calculates cosine similarity between two vectors.
 * (Skip this if rag.service.js already has an identical helper.)
 *
 * @param {number[]} vectorA
 * @param {number[]} vectorB
 * @returns {number}
 */
const cosineSimilarity = (vectorA, vectorB) => {
  if (
    !Array.isArray(vectorA) ||
    !Array.isArray(vectorB) ||
    vectorA.length === 0 ||
    vectorB.length === 0 ||
    vectorA.length !== vectorB.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i += 1) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};

/**
 * Answers a user's query using AI, grounded strictly in the content of
 * a specific RAG document the user owns.
 *
 * @param {Object} params
 * @param {number|string} params.documentId
 * @param {string} params.query
 * @param {number|string} params.userId
 * @returns {Promise<Object>} Object containing answer, citations, and chunksUsed.
 */
export const queryDocumentService = async ({ documentId, query, userId }) => {
  // 1. Confirm the document exists and belongs to this user
  const documentSql = `
    SELECT document_id, user_id, status
    FROM documents
    WHERE document_id = ?
    LIMIT 1
  `;

  const documentRows = await safeExecute(documentSql, [documentId]);

  if (!documentRows || documentRows.length === 0) {
    throw new NotFoundError('Document not found.');
  }

  const document = documentRows[0];

  if (String(document.user_id) !== String(userId)) {
    throw new NotFoundError('Document not found.');
  }

  // 2. Embed the user's query
  const embeddingResponse = await ai.models.embedContent({
    model: RAG_EMBEDDING_MODEL,
    contents: query,
    config: {
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
    },
  });

  const queryEmbedding = embeddingResponse.embeddings[0].values;

  // 3. Fetch all ready chunks + their embeddings for this document
  //    (embeddings live in document_chunk_vectors, joined by chunk_id)
  const chunkSql = `
    SELECT
      dc.chunk_id,
      dc.chunk_index,
      dc.content,
      dcv.embedding
    FROM document_chunks dc
    INNER JOIN document_chunk_vectors dcv
      ON dcv.chunk_id = dc.chunk_id
    WHERE dc.document_id = ?
      AND dcv.status = 'ready'
  `;

  const chunkRows = await safeExecute(chunkSql, [documentId]);

  // 4. Score each chunk by similarity to the query
  const k = Number(process.env.RAG_SEARCH_K ?? 10);
  const threshold = Number(process.env.RAG_SEARCH_THRESHOLD ?? 0.45);

  const scoredChunks = chunkRows
    .map((row) => {
      let embedding = row.embedding;

      if (typeof embedding === 'string') {
        try {
          embedding = JSON.parse(embedding);
        } catch {
          return null;
        }
      }

      const score = cosineSimilarity(queryEmbedding, embedding);

      return {
        chunkId: row.chunk_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        score,
      };
    })
    .filter(Boolean)
    .filter((chunk) => chunk.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  if (scoredChunks.length === 0) {
    return {
      answer:
        "I couldn't find anything in this document relevant to your question.",
      citations: [],
      chunksUsed: [],
    };
  }

  // 5. Ask Gemini to answer using only the retrieved chunks
  const { answer, citations } = await answerFromRagChunksService({
    query,
    chunks: scoredChunks,
  });

  return {
    answer,
    citations,
    chunksUsed: scoredChunks.map((chunk) => chunk.chunkIndex),
  };
};