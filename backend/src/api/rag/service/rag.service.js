// Add these imports alongside the existing ones at the top of rag.service.js:
//
import { safeExecute } from '../../../../db/config.js';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { answerFromRagChunksService } from './ragTextCoach.service.js';
// import { NotFoundError } from '../../../utils/errors/index.js';
import { NotFoundError, BadRequestError } from '../../../utils/errors/index.js';
import fs from 'node:fs/promises';
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




// Add these imports alongside the existing ones at the top of rag.service.js
// (skip any that are already there, e.g. safeExecute / GoogleGenAI):
//
// import fs from 'fs/promises';
// import pdfParse from 'pdf-parse';
// import { safeExecute } from '../../../../db/config.js';
// import { GoogleGenAI } from '@google/genai';
// import { BadRequestError } from '../../../utils/errors/index.js';
//
// (ai / RAG_EMBEDDING_MODEL are likely already declared in this file
// from the queryDocumentService addition — reuse them, don't redeclare)

const RAG_CHUNK_CHARS = Number(process.env.RAG_CHUNK_CHARS ?? 900);
const RAG_CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP ?? 120);
const RAG_MAX_CHUNKS_PER_DOC = Number(process.env.RAG_MAX_CHUNKS_PER_DOC ?? 1000);
const RAG_MAX_PDFS_PER_USER = Number(process.env.RAG_MAX_PDFS_PER_USER ?? 20);
const RAG_MIN_TEXT_CHARS = Number(process.env.RAG_MIN_TEXT_CHARS ?? 50);

/**
 * Splits text into overlapping chunks.
 */
const chunkText = (text, chunkChars, overlapChars, maxChunks) => {
  const chunks = [];
  const step = Math.max(1, chunkChars - overlapChars);

  for (
    let start = 0;
    start < text.length && chunks.length < maxChunks;
    start += step
  ) {
    const chunk = text.slice(start, start + chunkChars).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (start + chunkChars >= text.length) {
      break;
    }
  }

  return chunks;
};

/**
 * Marks a document as failed and records the error message.
 */
const markDocumentFailed = async (documentId, errorMessage) => {
  await safeExecute(
    `UPDATE documents SET status = 'failed', error_message = ? WHERE document_id = ?`,
    [errorMessage, documentId],
  );
};

/**
 * Handles a completed PDF upload: creates the document record, extracts
 * text, chunks it, generates embeddings for each chunk, and stores
 * everything — updating the document's status as it progresses.
 */
export const createDocumentFromUploadService = async ({ file, userId }) => {
  if (!file) {
    throw new BadRequestError('A PDF file is required.');
  }

  // 1. Enforce max documents per user
  const countRows = await safeExecute(
    `SELECT COUNT(*) AS total FROM documents WHERE user_id = ?`,
    [userId],
  );

  if (Number(countRows[0]?.total ?? 0) >= RAG_MAX_PDFS_PER_USER) {
    throw new BadRequestError(
      `You can upload a maximum of ${RAG_MAX_PDFS_PER_USER} documents.`,
    );
  }

  // 2. Store the storage path relative to the upload dir root, e.g. "1/171234-abc.pdf"
  const relativeStoragePath = `${userId}/${file.filename}`;

  // 3. Insert the initial document row with status 'processing'
  const insertResult = await safeExecute(
    `
      INSERT INTO documents
        (user_id, title, mime_type, storage_path, byte_size, status)
      VALUES (?, ?, ?, ?, ?, 'processing')
    `,
    [userId, file.originalname, file.mimetype, relativeStoragePath, file.size],
  );

  const documentId = insertResult.insertId;

  try {
    // 4. Parse the PDF into raw text
   // NEW:
const fileBuffer = await fs.readFile(file.path);

const parser = new PDFParse({ data: fileBuffer });
let text = '';

try {
  const result = await parser.getText();
  text = (result.text || '').trim();
} finally {
  await parser.destroy();
}

    if (text.length < RAG_MIN_TEXT_CHARS) {
      await markDocumentFailed(
        documentId,
        'The PDF did not contain enough extractable text.',
      );
    } else {
      // 5. Chunk the text
      const chunks = chunkText(
        text,
        RAG_CHUNK_CHARS,
        RAG_CHUNK_OVERLAP,
        RAG_MAX_CHUNKS_PER_DOC,
      );

      let successfulChunks = 0;

      // 6. For each chunk: store it, then embed it and store the vector
      for (let i = 0; i < chunks.length; i += 1) {
        const chunkContent = chunks[i];

        const chunkInsert = await safeExecute(
          `
            INSERT INTO document_chunks
              (document_id, chunk_index, content)
            VALUES (?, ?, ?)
          `,
          [documentId, i, chunkContent],
        );

        const chunkId = chunkInsert.insertId;

        try {
          const embeddingResponse = await ai.models.embedContent({
            model: RAG_EMBEDDING_MODEL,
            contents: chunkContent,
            config: {
              taskType: 'RETRIEVAL_DOCUMENT',
              outputDimensionality: 768,
            },
          });

          const embedding = embeddingResponse.embeddings[0].values;

          await safeExecute(
            `
              INSERT INTO document_chunk_vectors
                (chunk_id, source_text, embedding, status)
              VALUES (?, ?, ?, 'ready')
            `,
            [chunkId, chunkContent, JSON.stringify(embedding)],
          );

          successfulChunks += 1;
        } catch (embeddingError) {
          console.error(
            `Failed to embed chunk ${i} for document ${documentId}:`,
            embeddingError,
          );

          await safeExecute(
            `
              INSERT INTO document_chunk_vectors
                (chunk_id, source_text, embedding, status)
              VALUES (?, ?, ?, 'failed')
            `,
            [chunkId, chunkContent, JSON.stringify([])],
          );
        }
      }

      // 7. Finalize document status
      if (successfulChunks > 0) {
        await safeExecute(
          `UPDATE documents SET status = 'ready', error_message = NULL WHERE document_id = ?`,
          [documentId],
        );
      } else {
        await markDocumentFailed(
          documentId,
          'No chunks could be embedded successfully.',
        );
      }
    }
  } catch (error) {
    console.error('=== FAILED TO PROCESS RAG DOCUMENT ===', error);
    await markDocumentFailed(documentId, error.message || 'Processing failed.');
  }

  // 8. Return the final document state
  const finalRows = await safeExecute(
    `SELECT * FROM documents WHERE document_id = ?`,
    [documentId],
  );

  return finalRows[0];
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



/**
 * Lists all RAG documents uploaded by a specific user, newest first.
 *
 * @param {number|string} userId
 * @returns {Promise<Array>}
 */
export const listDocumentsForUserService = async (userId) => {
  const rows = await safeExecute(
    `
      SELECT
        document_id,
        title,
        mime_type,
        byte_size,
        status,
        error_message,
        created_at,
        updated_at
      FROM documents
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return rows;
};




/**
 * Performs semantic search within a single RAG document, returning
 * the most relevant excerpts and their similarity scores (no AI
 * answer generation — this is the raw retrieval step).
 *
 * @param {Object} params
 * @param {number|string} params.documentId
 * @param {string} params.query
 * @param {number|string} params.userId
 * @param {number} [params.k]
 * @param {number} [params.threshold]
 * @returns {Promise<Object>} Object containing data (excerpts) and meta.
 */
export const searchInDocumentService = async ({
  documentId,
  query,
  userId,
  k,
  threshold,
}) => {
  // 1. Confirm the document exists and belongs to this user
  const documentRows = await safeExecute(
    `SELECT document_id, user_id FROM documents WHERE document_id = ? LIMIT 1`,
    [documentId],
  );

  if (!documentRows || documentRows.length === 0) {
    throw new NotFoundError('Document not found.');
  }

  if (String(documentRows[0].user_id) !== String(userId)) {
    throw new NotFoundError('Document not found.');
  }

  // 2. Embed the search query
  const embeddingResponse = await ai.models.embedContent({
    model: RAG_EMBEDDING_MODEL,
    contents: query,
    config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 },
  });

  const queryEmbedding = embeddingResponse.embeddings[0].values;

  // 3. Fetch ready chunks + embeddings for this document
  const chunkRows = await safeExecute(
    `
      SELECT dc.chunk_id, dc.chunk_index, dc.content, dcv.embedding
      FROM document_chunks dc
      INNER JOIN document_chunk_vectors dcv ON dcv.chunk_id = dc.chunk_id
      WHERE dc.document_id = ? AND dcv.status = 'ready'
    `,
    [documentId],
  );

  const resolvedK = Number(k ?? process.env.RAG_SEARCH_K ?? 10);
  const resolvedThreshold = Number(
    threshold ?? process.env.RAG_SEARCH_THRESHOLD ?? 0.45,
  );

  // 4. Score, filter, sort, limit
  const results = chunkRows
    .map((row) => {
      let embedding = row.embedding;

      if (typeof embedding === 'string') {
        try {
          embedding = JSON.parse(embedding);
        } catch {
          return null;
        }
      }

      return {
        chunkIndex: row.chunk_index,
        content: row.content,
        score: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .filter(Boolean)
    .filter((chunk) => chunk.score >= resolvedThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, resolvedK)
    .map((chunk) => ({
      ...chunk,
      score: Number(chunk.score.toFixed(6)),
    }));

  return {
    data: results,
    meta: {
      total: results.length,
      k: resolvedK,
      threshold: resolvedThreshold,
      query,
    },
  };
};