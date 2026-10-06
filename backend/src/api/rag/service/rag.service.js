// Add these imports alongside the existing ones at the top of rag.service.js:
//
import { db, safeExecute } from '../../../../db/config.js';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { answerFromRagChunksService } from './ragTextCoach.service.js';
import { BadRequestError, NotFoundError } from '../../../utils/errors/index.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const RAG_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

const RAG_UPLOAD_ROOT = path.resolve(
  process.env.RAG_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'rag'),
);
const CHUNK_SIZE = Number(process.env.RAG_CHUNK_CHARS || 900);
const CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP || 120);
const MIN_TEXT_CHARS = Number(process.env.RAG_MIN_TEXT_CHARS || 50);
const MAX_CHUNKS_PER_DOCUMENT = Number(
  process.env.RAG_MAX_CHUNKS_PER_DOC || 1000,
);

const chunkText = text => {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const chunks = [];

  for (
    let start = 0;
    start < normalizedText.length && chunks.length < MAX_CHUNKS_PER_DOCUMENT;
    start += CHUNK_SIZE - CHUNK_OVERLAP
  ) {
    const chunk = normalizedText.slice(start, start + CHUNK_SIZE).trim();
    if (chunk) chunks.push(chunk);
    if (start + CHUNK_SIZE >= normalizedText.length) break;
  }

  return chunks;
};

const parseUploadedText = async file => {
  const extension = file.originalname.toLowerCase().split('.').pop();

  if (file.mimetype === 'text/plain' || extension === 'txt') {
    return file.buffer.toString('utf8');
  }

  if (file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new BadRequestError('The uploaded file is not a valid PDF.');
  }

  const parser = new PDFParse({ data: file.buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
};

const updateDocumentStatus = async (documentId, status, errorMessage = null) => {
  await safeExecute(
    `UPDATE documents SET status = ?, error_message = ? WHERE document_id = ?`,
    [status, errorMessage, documentId],
  );
};

export const getOwnedDocumentService = async ({ documentId, userId }) => {
  const rows = await safeExecute(
    `SELECT document_id, user_id, title, mime_type, storage_path, byte_size,
            status, error_message, created_at, updated_at
     FROM documents
     WHERE document_id = ? AND user_id = ?
     LIMIT 1`,
    [documentId, userId],
  );

  if (!rows.length) throw new NotFoundError('Document not found.');
  return rows[0];
};

export const listDocumentsForUserService = async userId => {
  return safeExecute(
    `SELECT document_id, user_id, title, mime_type, storage_path, byte_size,
            status, error_message, created_at, updated_at
     FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  );
};

export const getDocumentMetaService = async ({ documentId, userId }) => {
  return getOwnedDocumentService({ documentId, userId });
};

export const getDocumentFileService = async ({ documentId, userId }) => {
  const document = await getOwnedDocumentService({ documentId, userId });

  return {
    filePath: path.resolve(RAG_UPLOAD_ROOT, document.storage_path),
    mimeType: document.mime_type,
  };
};

export const deleteDocumentService = async ({ documentId, userId }) => {
  const document = await getOwnedDocumentService({ documentId, userId });
  const filePath = path.resolve(RAG_UPLOAD_ROOT, document.storage_path);

  await unlink(filePath).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  await safeExecute(
    `DELETE FROM documents WHERE document_id = ? AND user_id = ?`,
    [documentId, userId],
  );

  return { id: document.document_id };
};

export const createDocumentFromUploadService = async ({ file, userId }) => {
  if (!file?.buffer?.length) {
    throw new BadRequestError('A non-empty PDF or TXT file is required.');
  }

  const extension = file.originalname.toLowerCase().split('.').pop();
  const isText = file.mimetype === 'text/plain' || extension === 'txt';
  const mimeType = isText ? 'text/plain' : 'application/pdf';
  const safeTitle = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const storedFilename = `${randomUUID()}-${safeTitle}`;
  const relativeStoragePath = path.posix.join(String(userId), storedFilename);
  const absoluteStoragePath = path.join(RAG_UPLOAD_ROOT, relativeStoragePath);
  let documentId;

  await mkdir(path.dirname(absoluteStoragePath), { recursive: true });
  await writeFile(absoluteStoragePath, file.buffer);

  try {
    const insertResult = await safeExecute(
      `INSERT INTO documents
        (user_id, title, mime_type, storage_path, byte_size, status)
       VALUES (?, ?, ?, ?, ?, 'processing')`,
      [userId, safeTitle, mimeType, relativeStoragePath, file.size],
    );
    documentId = insertResult.insertId;

    const text = await parseUploadedText(file);
    const chunks = chunkText(text);

    if (text.trim().length < MIN_TEXT_CHARS || chunks.length === 0) {
      throw new BadRequestError('The uploaded document does not contain readable text.');
    }

    for (const [chunkIndex, content] of chunks.entries()) {
      const embeddingResponse = await ai.models.embedContent({
        model: RAG_EMBEDDING_MODEL,
        contents: content,
        config: {
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: 768,
        },
      });
      const embedding = embeddingResponse.embeddings?.[0]?.values;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Gemini returned an empty document embedding.');
      }

      const chunkResult = await safeExecute(
        `INSERT INTO document_chunks (document_id, chunk_index, content)
         VALUES (?, ?, ?)`,
        [documentId, chunkIndex, content],
      );

      await safeExecute(
        `INSERT INTO document_chunk_vectors
          (chunk_id, source_text, embedding, status)
         VALUES (?, ?, ?, 'ready')`,
        [chunkResult.insertId, content, JSON.stringify(embedding)],
      );
    }

    await updateDocumentStatus(documentId, 'ready');

    const [document] = await db.execute(
      `SELECT document_id, title, mime_type, byte_size, status, error_message,
              created_at, updated_at, user_id, storage_path
       FROM documents WHERE document_id = ?`,
      [documentId],
    );
    return document[0];
  } catch (error) {
    if (documentId) {
      await updateDocumentStatus(documentId, 'failed', error.message);
    }
    throw error;
  } finally {
    if (!documentId) {
      await unlink(absoluteStoragePath).catch(() => {});
    }
  }
};

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
  const document = await getOwnedDocumentService({ documentId, userId });

  if (document.status !== 'ready') {
    throw new BadRequestError('Document is not ready for questions.');
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

export const searchInDocumentService = async ({
  documentId,
  userId,
  query,
  k,
}) => {
  const document = await getOwnedDocumentService({ documentId, userId });

  if (document.status !== 'ready') {
    throw new BadRequestError('Document is not ready for search.');
  }

  const embeddingResponse = await ai.models.embedContent({
    model: RAG_EMBEDDING_MODEL,
    contents: query,
    config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 },
  });
  const queryEmbedding = embeddingResponse.embeddings[0].values;
  const rows = await safeExecute(
    `SELECT dc.chunk_id, dc.chunk_index, dc.content, dcv.embedding
     FROM document_chunks dc
     INNER JOIN document_chunk_vectors dcv ON dcv.chunk_id = dc.chunk_id
     WHERE dc.document_id = ? AND dcv.status = 'ready'`,
    [documentId],
  );
  const threshold = Number(process.env.RAG_SEARCH_THRESHOLD ?? 0.45);
  const limit = Number(k || 5);
  const results = rows
    .map(row => {
      let embedding = row.embedding;
      if (typeof embedding === 'string') {
        try {
          embedding = JSON.parse(embedding);
        } catch {
          return null;
        }
      }
      return {
        chunkId: row.chunk_id,
        chunkIndex: row.chunk_index,
        score: cosineSimilarity(queryEmbedding, embedding),
        excerpt: row.content,
      };
    })
    .filter(Boolean)
    .filter(result => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { query, results };
};