import express from 'express';
import { authenticateUser } from '../../../middleware/authentication.js';
import {
  createDocumentController,
  deleteDocumentController,
  getDocumentFileController,
  getDocumentMetaController,
  listDocumentsController,
  queryDocumentController,
  searchInDocumentController,
} from '../controller/rag.controller.js';
import {
  documentIdParamValidation,
  queryDocumentValidation,
  searchDocumentValidation,
} from '../validations/rag.validation.js';
import { createDocumentMulterErrorHandler } from '../rag.upload.config.js';

const router = express.Router();

router.post(
  '/',
  authenticateUser,
  createDocumentMulterErrorHandler,
  createDocumentController,
);

router.get('/', authenticateUser, listDocumentsController);

router.get(
  '/:documentId/search',
  authenticateUser,
  searchDocumentValidation,
  searchInDocumentController,
);

router.get(
  '/:documentId/file',
  authenticateUser,
  documentIdParamValidation,
  getDocumentFileController,
);

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

router.delete(
  '/:documentId',
  authenticateUser,
  documentIdParamValidation,
  deleteDocumentController,
);

export default router;