import { StatusCodes } from 'http-status-codes';
import { getDocumentMetaService } from '../service/rag.service.js';

/**
 * Handles fetching metadata for a specific RAG document.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
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
