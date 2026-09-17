import { safeExecute } from '../../../../db/config.js';
import { NotFoundError } from '../../../utils/errors/index.js';

/**
 * Fetches metadata for a RAG document owned by the authenticated user.
 *
 * @param {number} documentId - The ID of the document to fetch.
 * @param {number} userId - The authenticated user's ID (ownership check).
 * @returns {Promise<Object>} The document metadata object.
 * @throws {NotFoundError} If the document does not exist or belongs to another user.
 */
export const getDocumentMetaService = async (documentId, userId) => {
  const sql = `
    SELECT
      document_id,
      user_id,
      title,
      mime_type,
      byte_size,
      status,
      error_message,
      storage_path,
      created_at,
      updated_at
    FROM documents
    WHERE document_id = ?
      AND user_id = ?
    LIMIT 1
  `;

  const rows = await safeExecute(sql, [documentId, userId]);

  if (!rows || rows.length === 0) {
    throw new NotFoundError('Document not found.');
  }

  const row = rows[0];

  return {
    document_id: row.document_id,
    user_id: row.user_id,
    title: row.title,
    mime_type: row.mime_type,
    byte_size: row.byte_size,
    status: row.status,
    error_message: row.error_message,
    storage_path: row.storage_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};
