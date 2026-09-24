import express from 'express';

import { authenticateUser } from '../../../middleware/authentication.js';

import {
  queryDocumentController,
  getDocumentMetaController,
  getDocumentFileController,
  deleteDocumentController,
} from '../controller/rag.controller.js';

import {
  queryDocumentValidation,
  documentIdParamValidation,
} from '../validations/rag.validation.js';

const router = express.Router();

/**
 * GET /api/rag/documents/:documentId/file
 * Download a RAG document.
 */
router.get(
  '/:documentId/file',
  authenticateUser,
  documentIdParamValidation,
  getDocumentFileController,
);

/**
 * GET /api/rag/documents/:documentId
 * Get document metadata.
 */
router.get(
  '/:documentId',
  authenticateUser,
  documentIdParamValidation,
  getDocumentMetaController,
);

/**
 * POST /api/rag/documents/:documentId/query
 * Query a RAG document using AI.
 */
router.post(
  '/:documentId/query',
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);

/**
 * DELETE /api/rag/documents/:documentId
 * Delete a RAG document.
 */
router.delete(
  '/:documentId',
  authenticateUser,
  documentIdParamValidation,
  deleteDocumentController,
);

export default router;