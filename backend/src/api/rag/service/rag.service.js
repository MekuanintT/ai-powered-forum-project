// Add these imports alongside the existing ones at the top of rag.service.js:
//
import { safeExecute } from '../../../../db/config.js';
import { GoogleGenAI } from '@google/genai';
import { answerFromRagChunksService } from './ragTextCoach.service.js';
import { NotFoundError } from '../../../utils/errors/index.js';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

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

/**
 * Fetches metadata for a RAG document owned by the authenticated user.
 *
 * @param {number} documentId - The ID of the document to fetch.
 * @param {number} userId - The authenticated user's ID (ownership check).
 * @returns {Promise<Object>} The document metadata object.
 * @throws {NotFoundError} If the document does not exist or belongs to another user.
 */
export const getDocumentMetaService = async (documentId, userId) => {
  const sql = `
    SELECT
      document_id,
      user_id,
      title,
      mime_type,
      byte_size,
      status,
      error_message,
      storage_path,
      created_at,
      updated_at
    FROM documents
    WHERE document_id = ?
      AND user_id = ?
    LIMIT 1
  `;

  const rows = await safeExecute(sql, [documentId, userId]);

  if (!rows || rows.length === 0) {
    throw new NotFoundError('Document not found.');
  }

  const row = rows[0];

  return {
    document_id: row.document_id,
    user_id: row.user_id,
    title: row.title,
    mime_type: row.mime_type,
    byte_size: row.byte_size,
    status: row.status,
    error_message: row.error_message,
    storage_path: row.storage_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

/**
 * Deletes a RAG document owned by the authenticated user.
 *
 * The PDF file is removed from disk first. Then the document
 * record is deleted from the database.
 *
 * Because the database uses ON DELETE CASCADE:
 * - document chunks are deleted automatically
 * - chunk vectors are deleted automatically
 *
 * @param {Object} params
 * @param {number} params.documentId
 * @param {number} params.userId
 * @returns {Promise<Object>}
 * @throws {NotFoundError}
 */
export const deleteDocumentService = async ({ documentId, userId }) => {
  // 1. Find the document and verify ownership.
  const selectSql = `
    SELECT
      document_id,
      user_id,
      storage_path
    FROM documents
    WHERE document_id = ?
      AND user_id = ?
    LIMIT 1
  `;

  const rows = await safeExecute(selectSql, [
    documentId,
    userId,
  ]);

  // Document doesn't exist or belongs to another user.
  if (!rows || rows.length === 0) {
    throw new NotFoundError('Document not found.');
  }

  const document = rows[0];

  // 2. Build the absolute path to the PDF.
  const uploadDir =
    process.env.RAG_UPLOAD_DIR || 'uploads/rag';

  const filePath = path.resolve(
    uploadDir,
    document.storage_path,
  );

  // 3. Delete the PDF from disk.
  //
  // If the file is already missing, we still continue
  // because the database record should be removed.
  try {
    await unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  // 4. Delete the document from the database.
  //
  // ON DELETE CASCADE automatically deletes:
  // document_chunks
  // document_chunk_vectors
  const deleteSql = `
    DELETE FROM documents
    WHERE document_id = ?
      AND user_id = ?
  `;

  await safeExecute(deleteSql, [
    documentId,
    userId,
  ]);

  // 5. Return the deleted document ID.
  return {
    id: Number(documentId),
  };
};