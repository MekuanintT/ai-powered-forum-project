import { StatusCodes } from 'http-status-codes';
import {
  createDocumentFromUploadService,
  deleteDocumentService,
  getDocumentFileService,
  getDocumentMetaService,
  listDocumentsForUserService,
  queryDocumentService,
  searchInDocumentService,
} from '../service/rag.service.js';

// **
//  * Handles answering a user's query using AI, grounded in a specific
//  * RAG document's content.
//  *
//  * @param {import('express').Request} req - The Express request object.
//  * @param {import('express').Response} res - The Express response object.
//  * @param {import('express').NextFunction} next - The Express next function.
//  * @returns {Promise<void>}
//  */

export const createDocumentController = async (req, res, next) => {
  try {
    const data = await createDocumentFromUploadService({
      file: req.file,
      userId: req.user.id,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Document uploaded and processed.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

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

export const listDocumentsController = async (req, res, next) => {
  try {
    const data = await listDocumentsForUserService(req.user.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Documents fetched successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentMetaController = async (req, res, next) => {
  try {
    const data = await getDocumentMetaService({
      documentId: req.params.documentId,
      userId: req.user.id,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Document fetched successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentFileController = async (req, res, next) => {
  try {
    const { filePath, mimeType } = await getDocumentFileService({
      documentId: req.params.documentId,
      userId: req.user.id,
    });
    res.type(mimeType).sendFile(filePath, error => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
};

export const searchInDocumentController = async (req, res, next) => {
  try {
    const data = await searchInDocumentService({
      documentId: req.params.documentId,
      userId: req.user.id,
      query: req.query.query,
      k: req.query.k,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Ranked chunk excerpts',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocumentController = async (req, res, next) => {
  try {
    const data = await deleteDocumentService({
      documentId: req.params.documentId,
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