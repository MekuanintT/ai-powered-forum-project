import path from 'node:path';
import { StatusCodes } from 'http-status-codes';
import {
  queryDocumentService,
  getDocumentMetaService,
  deleteDocumentService,
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