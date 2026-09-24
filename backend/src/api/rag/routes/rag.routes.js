import express from 'express';
import { authenticateUser } from '../../../middleware/authentication.js';
import {
  queryDocumentController,
  getDocumentMetaController,
  getDocumentFileController,
} from '../controller/rag.controller.js';
import {
  queryDocumentValidation,
  documentIdParamValidation,
} from '../validations/rag.validation.js';
/**libra */
const router = express.Router();

router.get(
  '/:documentId/file',
  authenticateUser,
  documentIdParamValidation,
  getDocumentFileController,
);
/*libra end
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
