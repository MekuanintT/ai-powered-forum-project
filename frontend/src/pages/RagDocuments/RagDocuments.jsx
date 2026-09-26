import { useEffect, useRef, useState } from 'react';

import {
  listDocuments,
  uploadPdf,
  getDocumentMeta,
  deleteDocument,
  searchInDocument,
  queryDocument,
  fetchPdfObjectUrl,
} from '../../services/rag/rag.service.js';

import styles from './RagDocuments.module.css';

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
};

const STATUS_LABELS = {
  ready: 'READY',
  processing: 'PROCESSING',
  failed: 'FAILED',
};

export default function RagDocuments() {
  const fileInputRef = useRef(null);
  const pollTimerRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [activeDocument, setActiveDocument] = useState(null);

  const [previewUrl, setPreviewUrl] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [askQuery, setAskQuery] = useState('');
  const [askResult, setAskResult] = useState(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState('');

  /*
   * Load the document library
   */
  const loadDocuments = async () => {
    try {
      setIsLoadingList(true);
      setListError('');
      const data = await listDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setListError(err.message || 'Could not load documents.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  /*
   * Cleanup any blob URL and polling timer on unmount
   */
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * File selection
   */
  const handleChooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError('');
  };

  /*
   * Upload
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadError('');

      const newDocument = await uploadPdf(selectedFile);

      setDocuments((prev) => [newDocument, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to upload document:', err);
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  /*
   * Delete
   */
  const handleDelete = async (documentId, event) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      'Delete this document? This cannot be undone.',
    );
    if (!confirmed) return;

    try {
      await deleteDocument(documentId);
      setDocuments((prev) =>
        prev.filter((doc) => doc.document_id !== documentId),
      );

      if (activeDocument?.document_id === documentId) {
        setActiveDocument(null);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      window.alert(err.message || 'Failed to delete document.');
    }
  };

  /*
   * Poll a processing document until it's ready or failed
   */
  const startPolling = (documentId) => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const updated = await getDocumentMeta(documentId);

        setDocuments((prev) =>
          prev.map((doc) =>
            doc.document_id === documentId ? { ...doc, ...updated } : doc,
          ),
        );

        setActiveDocument((prev) =>
          prev && prev.document_id === documentId
            ? { ...prev, ...updated }
            : prev,
        );

        if (updated.status !== 'processing') {
          clearInterval(pollTimerRef.current);
        }
      } catch (err) {
        console.error('Failed to poll document status:', err);
        clearInterval(pollTimerRef.current);
      }
    }, 4000);
  };

  /*
   * Select a document
   */
  const handleSelectDocument = (doc) => {
    // Reset per-document state
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setSearchQuery('');
    setSearchResults(null);
    setSearchError('');
    setAskQuery('');
    setAskResult(null);
    setAskError('');

    setActiveDocument(doc);

    if (doc.status === 'processing') {
      startPolling(doc.document_id);
    }
  };

  /*
   * Load the PDF preview once a ready document is selected
   */
  useEffect(() => {
    if (!activeDocument || activeDocument.status !== 'ready') {
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      try {
        setIsPreviewLoading(true);
        const url = await fetchPdfObjectUrl(activeDocument.document_id);
        if (!cancelled) {
          setPreviewUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Failed to load preview:', err);
      } finally {
        if (!cancelled) {
          setIsPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocument?.document_id, activeDocument?.status]);

  /*
   * Semantic search
   */
  const handleSearch = async (event) => {
    event.preventDefault();
    if (!activeDocument || !searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError('');
      const result = await searchInDocument(
        activeDocument.document_id,
        searchQuery.trim(),
      );
      setSearchResults(result.data || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchError(err.message || 'Search failed.');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  /*
   * Ask with AI
   */
  const handleAsk = async (event) => {
    event.preventDefault();
    if (!activeDocument || !askQuery.trim()) return;

    try {
      setIsAsking(true);
      setAskError('');
      const result = await queryDocument(
        activeDocument.document_id,
        askQuery.trim(),
      );
      setAskResult(result);
    } catch (err) {
      console.error('Ask failed:', err);
      setAskError(err.message || 'Could not get an answer.');
      setAskResult(null);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <section className={styles.headerCard}>
        <div className={styles.eyebrow}>KNOWLEDGE BASE</div>
        <h1>Private PDF library</h1>
        <p className={styles.headerDescription}>
          Upload study or reference PDFs to your own workspace. Each file is
          indexed for semantic search and optional AI answers that cite
          passages from that document only. File size limits apply on the
          server; other users never see your uploads.
        </p>
      </section>

      {/* List-load error banner */}
      {!isLoadingList && listError && (
        <div className={styles.pageErrorBanner}>{listError}</div>
      )}

      <div className={styles.columns}>
        {/* ============ LEFT: LIBRARY ============ */}
        <section className={styles.libraryCard}>
          <h2>Library</h2>
          <p className={styles.cardSubtitle}>
            Add PDFs here. Processing runs once per upload.
          </p>

          <div className={styles.dropzone}>
            <p className={styles.dropzoneHint}>
              Accepted format: PDF. Maximum file size is enforced by the
              server.
            </p>

            <div className={styles.dropzoneActions}>
              <button
                type="button"
                className={styles.chooseFileButton}
                onClick={() => fileInputRef.current?.click()}
              >
                📄 Choose file
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleChooseFile}
                className={styles.hiddenInput}
              />

              <button
                type="button"
                className={styles.uploadButton}
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? 'Uploading...' : '⬆ Upload'}
              </button>
            </div>

            {selectedFile ? (
              <div className={styles.selectedFileChip}>
                <span>📄</span>
                <span className={styles.selectedFileName}>
                  {selectedFile.name}
                </span>
                <span className={styles.selectedFileSize}>
                  {formatBytes(selectedFile.size)}
                </span>
              </div>
            ) : (
              <p className={styles.noFileText}>No file selected.</p>
            )}
          </div>

          {uploadError && (
            <div className={styles.inlineError}>{uploadError}</div>
          )}

          {/* Library states */}
          {isLoadingList && (
            <p className={styles.mutedText}>Loading your library...</p>
          )}

          {!isLoadingList && !listError && documents.length === 0 && (
            <p className={styles.mutedText}>
              Your library is empty. Upload a PDF to index it for search and
              Q&amp;A.
            </p>
          )}

          {!isLoadingList && documents.length > 0 && (
            <div className={styles.documentList}>
              {documents.map((doc) => {
                const isActive =
                  activeDocument?.document_id === doc.document_id;
                const status = doc.status || 'processing';

                return (
                  <div
                    key={doc.document_id}
                    className={`${styles.documentItem} ${
                      isActive ? styles.documentItemActive : ''
                    }`}
                    onClick={() => handleSelectDocument(doc)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectDocument(doc);
                      }
                    }}
                  >
                    <div className={styles.documentItemMain}>
                      <span className={styles.documentTitle}>
                        {doc.title}
                      </span>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[`status_${status}`] || ''
                        }`}
                      >
                        {STATUS_LABELS[status] || status.toUpperCase()}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={(e) => handleDelete(doc.document_id, e)}
                      aria-label={`Delete ${doc.title}`}
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ============ RIGHT: ACTIVE DOCUMENT VIEW ============ */}
        <section className={styles.readerCard}>
          {!activeDocument && (
            <div className={styles.emptySelection}>
              Choose a document from the library to open the reader, run
              semantic search over its text, and ask questions with
              AI-assisted answers grounded in that file.
            </div>
          )}

          {activeDocument && activeDocument.status !== 'ready' && (
            <div className={styles.emptySelection}>
              This document is not ready for preview or AI tools. Current
              status: <strong>{activeDocument.status}</strong>.
            </div>
          )}

          {activeDocument && activeDocument.status === 'ready' && (
            <>
              {/* Preview */}
              <div className={styles.readerHeader}>
                <h2>Reader</h2>
                <p className={styles.cardSubtitle}>
                  Inline preview of the selected PDF.
                </p>
              </div>

              <div className={styles.previewBox}>
                {isPreviewLoading && (
                  <p className={styles.mutedText}>Loading document preview...</p>
                )}
                {!isPreviewLoading && previewUrl && (
                  <iframe
                    src={previewUrl}
                    title={activeDocument.title}
                    className={styles.previewFrame}
                  />
                )}
              </div>

              {/* Semantic search */}
              <div className={styles.sectionDivider} />
              <h3>Semantic search</h3>
              <p className={styles.cardSubtitle}>
                Finds passages by meaning (embeddings), not only exact
                keywords.
              </p>

              <form onSubmit={handleSearch}>
                <label className={styles.fieldLabel}>Search query</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Describe the topic or phrase you are looking for"
                  className={styles.textInput}
                />
                <button
                  type="submit"
                  className={styles.actionButton}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? 'Searching...' : '✦ Search'}
                </button>
              </form>

              {searchError && (
                <div className={styles.inlineError}>{searchError}</div>
              )}

              {searchResults && searchResults.length === 0 && !searchError && (
                <p className={styles.mutedText}>
                  No relevant passages found.
                </p>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className={styles.excerptList}>
                  {searchResults.map((excerpt, idx) => (
                    <div key={idx} className={styles.excerptItem}>
                      <div className={styles.excerptScore}>
                        Score: {excerpt.score}
                      </div>
                      <p className={styles.excerptContent}>
                        {excerpt.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Ask with AI */}
              <div className={styles.sectionDivider} />
              <h3>Ask with AI</h3>
              <p className={styles.cardSubtitle}>
                Answers use only retrieved excerpts from this PDF, with
                citations where possible.
              </p>

              <form onSubmit={handleAsk}>
                <label className={styles.fieldLabel}>Question</label>
                <textarea
                  value={askQuery}
                  onChange={(e) => setAskQuery(e.target.value)}
                  placeholder="Ask a clear question in plain language. If the document does not cover it, the model should say so."
                  className={styles.textArea}
                  rows={4}
                />
                <button
                  type="submit"
                  className={styles.actionButton}
                  disabled={isAsking || !askQuery.trim()}
                >
                  {isAsking ? 'Asking...' : '✦ Ask'}
                </button>
              </form>

              {askError && (
                <div className={styles.inlineError}>{askError}</div>
              )}

              {askResult && (
                <div className={styles.answerPanel}>
                  <p className={styles.answerText}>{askResult.answer}</p>
                  {Array.isArray(askResult.citations) &&
                    askResult.citations.length > 0 && (
                      <div className={styles.citationList}>
                        {askResult.citations.map((citation) => (
                          <span
                            key={citation.ref}
                            className={styles.citationTag}
                          >
                            [{citation.ref}] chunk {citation.chunkIndex}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
