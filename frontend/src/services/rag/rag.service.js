import { apiClient } from '../core/api.client.js';

function getResponseData(response) {
  return response.data?.data ?? response.data;
}

function handleRagError(error, fallbackMessage) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new Error('The request timed out. Please try again.');
    }

    return new Error(
      'Unable to connect to the server. Please check your connection and try again.',
    );
  }

  const backendMessage =
    error.response.data?.message ||
    error.response.data?.msg ||
    error.response.data?.errors?.[0]?.msg;

  if (error.response.status >= 500) {
    return new Error('Something went wrong on our end. Please try again later.');
  }

  return new Error(backendMessage || fallbackMessage);
}

/**
 * Lists all RAG documents belonging to the authenticated user.
 * @returns {Promise<Array>}
 */
export async function listDocuments() {
  try {
    const response = await apiClient.get('/api/rag/documents');
    return getResponseData(response) ?? [];
  } catch (error) {
    throw handleRagError(error, 'Could not load documents.');
  }
}

/**
 * Uploads a PDF file to be processed and indexed.
 * @param {File} file
 * @returns {Promise<Object>} The created document record.
 */
export async function uploadPdf(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/rag/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return getResponseData(response);
  } catch (error) {
    throw handleRagError(error, 'Failed to upload document.');
  }
}

/**
 * Fetches metadata for a single document (used for polling processing status).
 * @param {number|string} documentId
 * @returns {Promise<Object>}
 */
export async function getDocumentMeta(documentId) {
  try {
    const response = await apiClient.get(`/api/rag/documents/${documentId}`);
    return getResponseData(response);
  } catch (error) {
    throw handleRagError(error, 'Failed to load document.');
  }
}

/**
 * Deletes a document owned by the authenticated user.
 * @param {number|string} documentId
 * @returns {Promise<Object>}
 */
export async function deleteDocument(documentId) {
  try {
    const response = await apiClient.delete(`/api/rag/documents/${documentId}`);
    return getResponseData(response);
  } catch (error) {
    throw handleRagError(error, 'Failed to delete document.');
  }
}

/**
 * Runs semantic search within a single document, returning raw excerpts.
 * @param {number|string} documentId
 * @param {string} query
 * @param {{ k?: number, threshold?: number }} [options]
 * @returns {Promise<{ data: Array, meta: Object }>}
 */
export async function searchInDocument(documentId, query, options = {}) {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/search`,
      { params: { query, k: options.k, threshold: options.threshold } },
    );
    return response.data;
  } catch (error) {
    throw handleRagError(error, 'Search failed.');
  }
}

/**
 * Asks an AI-grounded question about a document's content.
 * @param {number|string} documentId
 * @param {string} query
 * @returns {Promise<{ answer: string, citations: Array, chunksUsed: Array }>}
 */
export async function queryDocument(documentId, query) {
  try {
    const response = await apiClient.post(
      `/api/rag/documents/${documentId}/query`,
      { query },
    );
    return getResponseData(response);
  } catch (error) {
    throw handleRagError(error, 'Could not get an answer.');
  }
}

/**
 * Fetches the raw PDF bytes for a document and returns a blob object URL
 * suitable for an <iframe src="..."> preview. Caller is responsible for
 * calling URL.revokeObjectURL on the returned string when done with it.
 * @param {number|string} documentId
 * @returns {Promise<string>}
 */
export async function fetchPdfObjectUrl(documentId) {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/file`,
      { responseType: 'blob' },
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch (error) {
    throw handleRagError(error, 'Failed to load document preview.');
  }
}

export const ragService = {
  listDocuments,
  uploadPdf,
  getDocumentMeta,
  deleteDocument,
  searchInDocument,
  queryDocument,
  fetchPdfObjectUrl,
};