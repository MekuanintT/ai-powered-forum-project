import path from 'node:path';
import { StatusCodes } from 'http-status-codes';
import {
  queryDocumentService,
  createDocumentFromUploadService,
  getDocumentMetaService,
  deleteDocumentService,
  listDocumentsForUserService,
  searchInDocumentService,
} from '../service/rag.service.js';

/**
 * Handles answering a user's query using AI, grounded in a specific
 * RAG document's content.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export const queryDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query } = req.body;

    const data = await queryDocumentService({
      documentId,
      query,
      userId: req.user.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer and citations',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles fetching metadata for a specific RAG document.
 */
export const getDocumentMetaController = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await getDocumentMetaService(
      Number(documentId),
      req.user.id,
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Document fetched successfully.',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};




export const createDocumentController = async (req, res, next) => {
  try {
    const document = await createDocumentFromUploadService({
      file: req.file,
      userId: req.user.id,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Document uploaded and processed.',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};





/**
 * Handles downloading a specific RAG document owned by
 * the authenticated user.
 */
export const getDocumentFileController = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await getDocumentMetaService(
      Number(documentId),
      req.user.id,
    );

    const filePath = path.resolve(
      process.env.RAG_UPLOAD_DIR || 'uploads/rag',
      document.storage_path,
    );

    res.type('application/pdf');

    res.sendFile(filePath, error => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles deleting a RAG document owned by the authenticated user.
 */
export const deleteDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const data = await deleteDocumentService({
      documentId: Number(documentId),
      userId: req.user.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Document deleted successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};




/**
 * Handles listing all RAG documents belonging to the authenticated user.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const listDocumentsController = async (req, res, next) => {
  try {
    const documents = await listDocumentsForUserService(req.user.id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Documents fetched successfully.',
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};





/**
 * Handles semantic search within a single RAG document.
 */
export const searchDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query, k, threshold } = req.query;

    const result = await searchInDocumentService({
      documentId,
      query,
      userId: req.user.id,
      k,
      threshold,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Search completed successfully.',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};