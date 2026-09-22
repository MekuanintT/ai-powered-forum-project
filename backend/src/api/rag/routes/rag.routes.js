import express from 'express';
import { authenticateUser } from '../../../middleware/authentication.js';
import { queryDocumentController } from '../controller/rag.controller.js';
import { queryDocumentValidation } from '../validations/rag.validation.js';

const router = express.Router();

router.post(
  '/:documentId/query',
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);

export default router;