import express from 'express';
import { getDocumentMetaController } from '../controller/rag.controller.js';
import { documentIdParamValidation } from '../validations/rag.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';

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

export default router;
