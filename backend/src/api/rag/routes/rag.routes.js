import express from 'express';
import { authenticateUser } from '../../../middleware/authentication.js';
import {
  queryDocumentController,
  getDocumentMetaController,
} from '../controller/rag.controller.js';
import {
  queryDocumentValidation,
  documentIdParamValidation,
} from '../validations/rag.validation.js';

const router = express.Router();

/**
 * @route GET /api/rag/documents/:documentId
 * @desc Fetch metadata for a specific RAG document owned by the authenticated user
 * @access Protected
 */
router.get(
  '/:documentId',
  authenticateUser,
  documentIdParamValidation,
  getDocumentMetaController,
);

router.post(
  '/:documentId/query',
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);

export default router;