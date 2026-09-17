/**
 * QuestionDetail — T-16 & T-20
 * Route: /questions/:questionHash
 *
 * Renders the full question, all community answers, and a post-answer form
 * with an integrated "AI Answer Fit" check (T-20).
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getSingleQuestion, assessAnswerFit } from '../../services/question/question.service.js';
import { postAnswer } from '../../services/answer/answer.service.js';
import { useAuth } from '../../contexts/AuthContext';
import styles from './QuestionDetail.module.css';

const ANSWER_MIN_LENGTH = 20;

// --- Helper: format relative time ---
function formatTimeAgo(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

// --- Loading Skeleton ---
function QuestionSkeleton() {
  return (
    <div>
      <div className={styles.skeletonCard}>
        <div className={`${styles.skeleton} ${styles.skeletonShort} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonShort} ${styles.skeletonLine}`} />
      </div>
      <div className={styles.skeletonCard}>
        <div className={`${styles.skeleton} ${styles.skeletonShort} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
      </div>
    </div>
  );
}

// --- Fit badge colour helper ---
function fitPanelClass(level) {
  if (level === 'strong') return styles['fitPanel--strong'];
  if (level === 'weak') return styles['fitPanel--weak'];
  return styles['fitPanel--partial'];
}

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const textareaRef = useRef(null);

  // --- Data state ---
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [relatedQuestions, setRelatedQuestions] = useState([]);

  // --- UI state ---
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // --- Answer form state ---
  const [answerText, setAnswerText] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // --- AI fit state ---
  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [fitError, setFitError] = useState('');

  // --- Fetch question on mount ---
  useEffect(() => {
    if (!questionHash) return;

    async function load() {
      try {
        setIsLoading(true);
        setFetchError('');
        const data = await getSingleQuestion(questionHash);
        setQuestion(data);
        setAnswers(data?.answers ?? []);
      } catch (err) {
        setFetchError(err.message || 'Failed to load question. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [questionHash]);

  // --- Derived ---
  const currentUserId = user?.id ?? user?.userId ?? user?.user_id;
  const questionAuthorId = question?.author?.id ?? question?.userId;
  const isOwnQuestion =
    currentUserId && questionAuthorId
      ? String(currentUserId) === String(questionAuthorId)
      : false;

  // --- Markdown toolbar helper ---
  const insertMarkdown = (before, after = before) => {
    const textarea = textareaRef.current;
    if (!textarea || isSubmitting) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = answerText.slice(start, end);
    const next =
      answerText.slice(0, start) + before + selected + after + answerText.slice(end);
    setAnswerText(next);
    setFitResult(null);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    });
  };

  // --- Validate answer ---
  const validateAnswer = () => {
    const trimmed = answerText.trim();
    if (trimmed.length < ANSWER_MIN_LENGTH) {
      setAnswerError(`Answer must be at least ${ANSWER_MIN_LENGTH} characters.`);
      return null;
    }
    setAnswerError('');
    return trimmed;
  };

  // --- Check AI Answer Fit ---
  const handleCheckFit = async () => {
    const content = validateAnswer();
    if (!content) return;
    setFitError('');
    setFitResult(null);
    setIsCheckingFit(true);
    try {
      const result = await assessAnswerFit(questionHash, content);
      setFitResult(result);
    } catch (err) {
      setFitError(err.message || 'Could not check fit right now.');
    } finally {
      setIsCheckingFit(false);
    }
  };

  // --- Submit answer ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = validateAnswer();
    if (!content) return;
    if (!question?.id) return;

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const newAnswer = await postAnswer(question.id, content);
      // Append new answer to local list
      setAnswers((prev) => [newAnswer, ...prev]);
      setAnswerText('');
      setFitResult(null);
      setAnswerError('');
    } catch (err) {
      setSubmitError(err.message || 'Failed to post answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProcessing = isSubmitting || isCheckingFit;

  // ================================================================
  // RENDER
  // ================================================================

  if (isLoading) {
    return (
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/dashboard')}>
          ← Back to feed
        </button>
        <QuestionSkeleton />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/dashboard')}>
          ← Back to feed
        </button>
        <div className={styles.errorState}>
          <p>{fetchError}</p>
          <button
            className={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const authorName =
    question?.author
      ? `${question.author.firstName ?? ''} ${question.author.lastName ?? ''}`.trim()
      : 'Unknown';

  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <div className={styles.page}>
      {/* Back link */}
      <button
        id="back-to-feed-btn"
        className={styles.backLink}
        onClick={() => navigate('/dashboard')}
      >
        ← Back to feed
      </button>

      <div className={styles.grid}>
        {/* ===================== MAIN COLUMN ===================== */}
        <div className={styles.main}>

          {/* Question card */}
          <article className={styles.questionCard}>
            <div className={styles.authorRow}>
              <div className={styles.avatar}>{authorInitial}</div>
              <div>
                <div className={styles.authorName}>{authorName}</div>
                <div className={styles.postedDate}>
                  Posted {formatTimeAgo(question?.createdAt)}
                </div>
              </div>
            </div>

            <h1 className={styles.questionTitle}>{question?.title}</h1>

            <div className={styles.questionBody}>
              <ReactMarkdown>{question?.content ?? ''}</ReactMarkdown>
            </div>

            <div className={styles.questionActions}>
              <button
                id="share-question-btn"
                className={styles.actionBtn}
                onClick={() =>
                  navigator.clipboard?.writeText(window.location.href)
                }
              >
                ⤴ Share
              </button>
              <button className={styles.actionBtn} disabled>
                💬 {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
              </button>
            </div>
          </article>

          {/* ---- Answers ---- */}
          <section className={styles.answersSection}>
            <h2 className={styles.answersHeading}>
              Community Answers ({answers.length})
            </h2>

            {answers.length === 0 ? (
              <div className={styles.emptyAnswers}>
                <div className={styles.emptyAnswersIcon}>💬</div>
                <p>Be the first to help!</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  This question is waiting for an expert like you.
                </p>
              </div>
            ) : (
              answers.map((answer) => {
                const ansAuthorName =
                  answer?.author
                    ? `${answer.author.firstName ?? ''} ${answer.author.lastName ?? ''}`.trim()
                    : 'Unknown';
                return (
                  <article
                    key={answer.id}
                    className={styles.answerCard}
                  >
                    <div className={styles.answerAuthorRow}>
                      <div className={styles.answerAvatar}>
                        {ansAuthorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.answerAuthorName}>{ansAuthorName}</div>
                        <div className={styles.answerDate}>
                          {formatTimeAgo(answer.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className={styles.answerBody}>
                      <ReactMarkdown>{answer.content ?? ''}</ReactMarkdown>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          {/* ---- Post Answer Form ---- */}
          <section className={styles.postAnswerCard}>
            <h2 className={styles.formHeading}>Contribute an answer</h2>

            {isOwnQuestion ? (
              <div className={styles.ownQuestionNotice}>
                You cannot answer your own question. Only other community members
                can reply to your thread.
              </div>
            ) : (
              <form id="post-answer-form" onSubmit={handleSubmit} noValidate>
                {submitError && (
                  <div className={styles.errorBanner} role="alert">
                    {submitError}
                  </div>
                )}

                {/* Markdown toolbar */}
                <div className={styles.toolbar} aria-label="Formatting toolbar">
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    onClick={() => insertMarkdown('**')}
                    disabled={isProcessing}
                    title="Bold"
                    aria-label="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    onClick={() => insertMarkdown('_')}
                    disabled={isProcessing}
                    title="Italic"
                    aria-label="Italic"
                    style={{ fontStyle: 'italic' }}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    onClick={() => insertMarkdown('`')}
                    disabled={isProcessing}
                    title="Inline code"
                    aria-label="Inline code"
                  >
                    {'</>'}
                  </button>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    onClick={() => insertMarkdown('[', '](https://)')}
                    disabled={isProcessing}
                    title="Link"
                    aria-label="Link"
                  >
                    🔗
                  </button>
                  <span className={styles.charCount}>
                    {answerText.length} characters
                  </span>
                </div>

                <textarea
                  ref={textareaRef}
                  id="answer-content"
                  className={`${styles.answerTextarea}${answerError ? ` ${styles['answerTextarea--error']}` : ''}`}
                  value={answerText}
                  onChange={(e) => {
                    setAnswerText(e.target.value);
                    setAnswerError('');
                    setFitResult(null);
                  }}
                  rows={8}
                  placeholder="Write your answer here… You can use Markdown to format code."
                  disabled={isSubmitting}
                  aria-label="Answer content"
                  aria-invalid={Boolean(answerError)}
                  aria-describedby={answerError ? 'answer-error' : undefined}
                />

                {answerError && (
                  <p id="answer-error" className={styles.fieldError} role="alert">
                    {answerError}
                  </p>
                )}

                {/* AI Fit row */}
                <div className={styles.fitRow}>
                  <button
                    id="check-answer-fit-btn"
                    type="button"
                    className={styles.checkFitBtn}
                    onClick={handleCheckFit}
                    disabled={isProcessing}
                  >
                    ✦ {isCheckingFit ? 'Checking…' : 'Check draft fit'}
                  </button>
                  <span>Relevance only. Not grading correctness. You need at least {ANSWER_MIN_LENGTH} characters.</span>
                </div>

                {/* Fit error */}
                {fitError && (
                  <p className={styles.fieldError} role="alert">{fitError}</p>
                )}

                {/* Fit result panel */}
                {fitResult && (
                  <div
                    className={`${styles.fitPanel} ${fitPanelClass(fitResult.level)}`}
                    aria-live="polite"
                    role="status"
                  >
                    <span className={styles.fitLevel}>{fitResult.level}:</span>
                    {fitResult.note}
                  </div>
                )}

                <div className={styles.formActions}>
                  <button
                    id="submit-answer-btn"
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isProcessing}
                  >
                    {isSubmitting ? 'Posting…' : 'Post Answer'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* ===================== SIDEBAR ===================== */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarHeading}>Related Questions</h2>
            {relatedQuestions.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
                No related questions found.
              </p>
            ) : (
              relatedQuestions.map((q) => (
                <button
                  key={q.questionHash ?? q.id}
                  className={styles.relatedItem}
                  onClick={() => navigate(`/questions/${q.questionHash ?? q.id}`)}
                >
                  <div className={styles.relatedTitle}>{q.title}</div>
                  <div className={styles.relatedMeta}>
                    {q.author?.firstName} {q.author?.lastName} ·{' '}
                    {formatTimeAgo(q.createdAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
