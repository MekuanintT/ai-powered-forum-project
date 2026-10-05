import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import {
  getSingleQuestion,
  getSimilarQuestions,
  assessAnswerFit,
  updateQuestion,
  deleteQuestion,
} from '../../services/question/question.service';

import {
  postAnswer,
  updateAnswer,
  deleteAnswer,
} from '../../services/answer/answer.service';

import { useAuth } from '../../contexts/AuthContext';
import styles from './QuestionDetail.module.css';

const MIN_ANSWER_LENGTH = 20;

/* =========================================================
   Shape helpers

   The API is inconsistent about casing between endpoints, so
   every read of a question or answer goes through one of these.
   Same approach (and same key lists) as Dashboard.jsx.
========================================================= */

function getAuthorObject(record) {
  const author = record?.author || record?.user;
  return author && typeof author === 'object' ? author : null;
}

function getAuthorName(record) {
  const authorObject = getAuthorObject(record);

  if (authorObject) {
    const fullName = [authorObject.firstName, authorObject.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (fullName) {
      return fullName;
    }
  }

  return (
    record?.authorName ||
    (typeof record?.author === 'string' ? record.author : null) ||
    record?.userName ||
    'Unknown user'
  );
}

function getAuthorId(record) {
  return (
    record?.authorId ||
    record?.author_id ||
    record?.userId ||
    record?.user_id ||
    getAuthorObject(record)?.id ||
    null
  );
}

function getCreatedAt(record) {
  return (
    record?.createdAt ||
    record?.created_at ||
    record?.created ||
    null
  );
}

function getQuestionHashOf(record) {
  return record?.questionHash || record?.question_hash || null;
}

function getRecordId(record) {
  return (
    record?.id ||
    record?.answerId ||
    record?.answer_id ||
    record?.questionId ||
    record?.question_id ||
    null
  );
}

function formatDate(dateValue) {
  if (!dateValue) {
    return '';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString();
}

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Stable per-person avatar tint, so the same author keeps the
   same colour across the question card and the answer list. */
const AVATAR_TINTS = [
  'tintTeal',
  'tintForest',
  'tintAmber',
  'tintIndigo',
  'tintRose',
  'tintSlate',
];

function getAvatarTint(name) {
  const key = String(name || '');
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100000;
  }

  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

/* Markdown renderers shared by the question body and answers. */
const markdownComponents = {
  a: (props) => {
    const anchorProps = { ...props };
    delete anchorProps.node;
    return <a {...anchorProps} target="_blank" rel="noopener noreferrer" />;
  },
};

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const textareaRef = useRef(null);
  const answersRef = useRef(null);

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [relatedQuestions, setRelatedQuestions] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [answerText, setAnswerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [questionDraft, setQuestionDraft] = useState({ title: '', content: '' });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [questionActionError, setQuestionActionError] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [answerActionError, setAnswerActionError] = useState('');

  const [fitResult, setFitResult] = useState(null);
  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitError, setFitError] = useState('');

  const [shareLabel, setShareLabel] = useState('Share');

  const trimmedAnswer = answerText.trim();
  const isAnswerLongEnough = trimmedAnswer.length >= MIN_ANSWER_LENGTH;

  /* =========================================================
     Load question + answers
  ========================================================= */
  useEffect(() => {
    let isActive = true;

    async function loadQuestion() {
      try {
        setIsLoading(true);
        setLoadError('');

        const data = await getSingleQuestion(questionHash);

        if (!isActive) {
          return;
        }

        setQuestion(data?.question ?? null);
        setAnswers(Array.isArray(data?.answers) ? data.answers : []);
      } catch (err) {
        console.error('Failed to load question details:', err);

        if (!isActive) {
          return;
        }

        setQuestion(null);
        setAnswers([]);
        setLoadError('Failed to load question details.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadQuestion();

    return () => {
      isActive = false;
    };
  }, [questionHash]);

  /* Related questions load separately: this panel is a nice-to-have,
     so a failure here must not take the page down with it. */
  useEffect(() => {
    let isActive = true;

    async function loadRelated() {
      try {
        const data = await getSimilarQuestions(questionHash, { k: 5 });

        if (isActive) {
          setRelatedQuestions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load related questions:', err);

        if (isActive) {
          setRelatedQuestions([]);
        }
      }
    }

    loadRelated();

    return () => {
      isActive = false;
    };
  }, [questionHash]);

  /* =========================================================
     Ownership
  ========================================================= */
  const isOwnQuestion = useMemo(() => {
    if (!question || !user) {
      return false;
    }

    const currentUserId = user.id || user.userId || user.user_id;
    const authorId = getAuthorId(question);

    if (currentUserId && authorId) {
      return String(currentUserId) === String(authorId);
    }

    const currentUserName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const authorName = getAuthorName(question);

    if (currentUserName && authorName) {
      return currentUserName === authorName;
    }

    return false;
  }, [question, user]);

  /* =========================================================
     Markdown toolbar
  ========================================================= */
  const applyMarkdown = (before, after = before, placeholder = 'text') => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd) || placeholder;

    const next =
      value.slice(0, selectionStart) +
      before +
      selected +
      after +
      value.slice(selectionEnd);

    setAnswerText(next);

    /* Put the caret around the wrapped text once React has
       re-rendered, so the person can keep typing. */
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectionStart + before.length,
        selectionStart + before.length + selected.length,
      );
    });
  };

  /* =========================================================
     AI answer fit
  ========================================================= */
  const handleCheckFit = async () => {
    if (!isAnswerLongEnough || isCheckingFit) {
      return;
    }

    try {
      setIsCheckingFit(true);
      setFitError('');
      setFitResult(null);

      const result = await assessAnswerFit(questionHash, trimmedAnswer);

      setFitResult(result ?? null);
    } catch (err) {
      console.error('Failed to assess answer fit:', err);
      setFitError(err.message || 'Unable to check this draft right now.');
    } finally {
      setIsCheckingFit(false);
    }
  };

  /* =========================================================
     Post answer
  ========================================================= */
  const handlePostAnswer = async (event) => {
    event.preventDefault();

    if (isPosting) {
      return;
    }

    if (!isAnswerLongEnough) {
      setPostError(
        `Your answer needs at least ${MIN_ANSWER_LENGTH} characters.`,
      );
      return;
    }

    const questionId = getRecordId(question);

    if (!questionId) {
      setPostError('This question is missing an id, so it cannot take answers.');
      return;
    }

    try {
      setIsPosting(true);
      setPostError('');

      const created = await postAnswer(questionId, trimmedAnswer);

      /* The backend may return the created row, a wrapper, or nothing at
         all. Fall back to a locally built record so the new answer shows
         up either way. */
      const newAnswer =
        created && typeof created === 'object' && !Array.isArray(created)
          ? created.answer ?? created
          : null;

      setAnswers((previous) => [
        ...previous,
        {
          id: getRecordId(newAnswer) || `local-${Date.now()}`,
          content: newAnswer?.content ?? trimmedAnswer,
          createdAt: getCreatedAt(newAnswer) || new Date().toISOString(),
          author: newAnswer?.author ?? {
            firstName: user?.firstName,
            lastName: user?.lastName,
          },
        },
      ]);

      setAnswerText('');
      setFitResult(null);
      setFitError('');
    } catch (err) {
      console.error('Failed to post answer:', err);
      setPostError(err.message || 'Failed to post answer. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveQuestion = async (event) => {
    event.preventDefault();
    if (isSavingQuestion) return;

    try {
      setIsSavingQuestion(true);
      setQuestionActionError('');
      const updatedQuestion = await updateQuestion(questionHash, {
        title: questionDraft.title.trim(),
        content: questionDraft.content.trim(),
      });
      setQuestion(updatedQuestion);
      setIsEditingQuestion(false);
    } catch (err) {
      setQuestionActionError(err.message || 'Failed to update this question.');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!window.confirm('Delete this question and all of its answers?')) return;

    try {
      setQuestionActionError('');
      await deleteQuestion(questionHash);
      navigate('/');
    } catch (err) {
      setQuestionActionError(err.message || 'Failed to delete this question.');
    }
  };

  const handleSaveAnswer = async (event) => {
    event.preventDefault();
    if (isSavingAnswer || !editingAnswerId) return;

    try {
      setIsSavingAnswer(true);
      setAnswerActionError('');
      const updatedAnswer = await updateAnswer(
        editingAnswerId,
        answerDraft.trim(),
      );
      setAnswers((previous) =>
        previous.map((answer) =>
          String(getRecordId(answer)) === String(editingAnswerId)
            ? updatedAnswer
            : answer,
        ),
      );
      setEditingAnswerId(null);
      setAnswerDraft('');
    } catch (err) {
      setAnswerActionError(err.message || 'Failed to update this answer.');
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handleDeleteAnswer = async (answerId) => {
    if (!window.confirm('Delete this answer?')) return;

    try {
      setAnswerActionError('');
      await deleteAnswer(answerId);
      setAnswers((previous) =>
        previous.filter(
          (answer) => String(getRecordId(answer)) !== String(answerId),
        ),
      );
    } catch (err) {
      setAnswerActionError(err.message || 'Failed to delete this answer.');
    }
  };

  /* =========================================================
     Share
  ========================================================= */
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareLabel('Link copied');
    } catch (err) {
      console.error('Failed to copy link:', err);
      setShareLabel('Copy failed');
    }

    window.setTimeout(() => setShareLabel('Share'), 2000);
  };

  const scrollToAnswers = () => {
    answersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* =========================================================
     Loading / error
  ========================================================= */
  if (isLoading) {
    return (
      <div className={styles.statusPage}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.statusText}>Loading question details...</p>
      </div>
    );
  }

  if (loadError || !question) {
    return (
      <div className={styles.statusPage}>
        <p className={styles.statusError}>
          {loadError || 'This question could not be found.'}
        </p>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => navigate('/')}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  /* =========================================================
     Page
  ========================================================= */
  const questionAuthor = getAuthorName(question);
  const answerCount = answers.length;

  return (
    <div className={styles.page}>

      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate('/')}
      >
        <span aria-hidden="true">&#8592;</span> Back to feed
      </button>

      <div className={styles.layout}>

        {/* =========================================
            QUESTION
        ========================================== */}
        <article className={styles.questionCard}>

          <header className={styles.authorRow}>
            <div
              className={`${styles.avatar} ${
                styles[getAvatarTint(questionAuthor)]
              }`}
            >
              {getInitials(questionAuthor)}
            </div>

            <div>
              <div className={styles.authorName}>{questionAuthor}</div>
              <div className={styles.authorMeta}>
                Posted {formatDate(getCreatedAt(question))}
              </div>
            </div>
          </header>

          {isEditingQuestion ? (
            <form className={styles.editForm} onSubmit={handleSaveQuestion}>
              <label className={styles.editField}>
                Title
                <input
                  className={styles.editInput}
                  value={questionDraft.title}
                  onChange={(event) =>
                    setQuestionDraft((draft) => ({
                      ...draft,
                      title: event.target.value,
                    }))
                  }
                  minLength={5}
                  maxLength={255}
                  required
                />
              </label>
              <label className={styles.editField}>
                Details
                <textarea
                  className={styles.editTextarea}
                  value={questionDraft.content}
                  onChange={(event) =>
                    setQuestionDraft((draft) => ({
                      ...draft,
                      content: event.target.value,
                    }))
                  }
                  minLength={10}
                  required
                />
              </label>
              {questionActionError && (
                <p className={styles.actionError} role="alert">
                  {questionActionError}
                </p>
              )}
              <div className={styles.editActions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSavingQuestion}
                >
                  {isSavingQuestion ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setIsEditingQuestion(false);
                    setQuestionActionError('');
                  }}
                  disabled={isSavingQuestion}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className={styles.questionTitle}>
                {question.title || 'Untitled question'}
              </h1>
              <div className={styles.markdownBody}>
                <ReactMarkdown components={markdownComponents}>
                  {question.content || ''}
                </ReactMarkdown>
              </div>
            </>
          )}

          <footer className={styles.questionFooter}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={handleShare}
            >
              {shareLabel}
            </button>

            <button
              type="button"
              className={styles.ghostButton}
              onClick={scrollToAnswers}
            >
              {answerCount} {answerCount === 1 ? 'Answer' : 'Answers'}
            </button>
            {isOwnQuestion && !isEditingQuestion && (
              <div className={styles.ownerActions}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setQuestionDraft({
                      title: question.title || '',
                      content: question.content || '',
                    });
                    setQuestionActionError('');
                    setIsEditingQuestion(true);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleDeleteQuestion}
                >
                  Delete
                </button>
              </div>
            )}
          </footer>

          {!isEditingQuestion && questionActionError && (
            <p className={styles.actionError} role="alert">
              {questionActionError}
            </p>
          )}

        </article>

        {/* =========================================
            RELATED
        ========================================== */}
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Related Questions</h2>

          {relatedQuestions.length === 0 && (
            <p className={styles.sidebarEmpty}>
              Nothing similar yet. This thread is breaking new ground.
            </p>
          )}

          {relatedQuestions.map((related) => {
            const relatedHash = getQuestionHashOf(related);
            const relatedAuthorName =
              related.authorName || getAuthorName(related);

            return (
              <button
                type="button"
                key={relatedHash || getRecordId(related)}
                className={styles.relatedCard}
                onClick={() =>
                  relatedHash && navigate(`/questions/${relatedHash}`)
                }
              >
                <span className={styles.relatedTitle}>
                  {related.title || 'Untitled question'}
                </span>

                <span className={styles.relatedMeta}>
                  <span>{relatedAuthorName}</span>
                  <span>{formatDate(getCreatedAt(related))}</span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* =========================================
            ANSWERS
        ========================================== */}
        <section className={styles.answersSection} ref={answersRef}>

          <h2 className={styles.sectionHeading}>
            Community Answers ({answerCount})
          </h2>

          {answerCount === 0 ? (
            <div className={styles.emptyAnswers}>
              <div className={styles.emptyIcon} aria-hidden="true">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>

              <h3 className={styles.emptyTitle}>Be the first to help!</h3>

              <p className={styles.emptyText}>
                This question is waiting for an expert like you. Share your
                knowledge and earn reputation points.
              </p>
            </div>
          ) : (
            <div className={styles.answerList}>
              {answers.map((answer) => {
                const answerAuthor = getAuthorName(answer);
                const currentUserId = user?.id || user?.userId || user?.user_id;
                const answerAuthorId = getAuthorId(answer);
                const isOwnAnswer =
                  currentUserId &&
                  answerAuthorId &&
                  String(currentUserId) === String(answerAuthorId);
                const answerId = getRecordId(answer);

                return (
                  <article
                    key={getRecordId(answer) || answerAuthor}
                    className={styles.answerCard}
                  >
                    <header className={styles.authorRow}>
                      <div
                        className={`${styles.avatar} ${
                          styles[getAvatarTint(answerAuthor)]
                        }`}
                      >
                        {getInitials(answerAuthor)}
                      </div>

                      <div>
                        <div className={styles.authorName}>{answerAuthor}</div>
                        <div className={styles.authorMeta}>
                          {formatDate(getCreatedAt(answer))}
                        </div>
                      </div>
                      {isOwnAnswer && editingAnswerId !== answerId && (
                        <div className={styles.answerActions}>
                          <button
                            type="button"
                            className={styles.ghostButton}
                            onClick={() => {
                              setEditingAnswerId(answerId);
                              setAnswerDraft(answer.content || '');
                              setAnswerActionError('');
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => handleDeleteAnswer(answerId)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </header>

                    {editingAnswerId === answerId ? (
                      <form className={styles.editForm} onSubmit={handleSaveAnswer}>
                        <label className={styles.editField}>
                          Answer
                          <textarea
                            className={styles.editTextarea}
                            value={answerDraft}
                            onChange={(event) => setAnswerDraft(event.target.value)}
                            minLength={MIN_ANSWER_LENGTH}
                            required
                          />
                        </label>
                        {answerActionError && (
                          <p className={styles.actionError} role="alert">
                            {answerActionError}
                          </p>
                        )}
                        <div className={styles.editActions}>
                          <button
                            type="submit"
                            className={styles.primaryButton}
                            disabled={isSavingAnswer}
                          >
                            {isSavingAnswer ? 'Saving...' : 'Save changes'}
                          </button>
                          <button
                            type="button"
                            className={styles.ghostButton}
                            onClick={() => {
                              setEditingAnswerId(null);
                              setAnswerDraft('');
                              setAnswerActionError('');
                            }}
                            disabled={isSavingAnswer}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className={styles.markdownBody}>
                        <ReactMarkdown components={markdownComponents}>
                          {answer.content || ''}
                        </ReactMarkdown>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

        </section>

        {/* =========================================
            ANSWER FORM
        ========================================== */}
        <section className={styles.formSection}>

          {!user && (
            <div className={styles.notice}>
              <h3 className={styles.noticeTitle}>Sign in to answer</h3>
              <p className={styles.noticeText}>
                You need an account to contribute to this thread.
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
            </div>
          )}

          {user && isOwnQuestion && (
            <div className={styles.notice}>
              <h3 className={styles.noticeTitle}>This is your question</h3>
              <p className={styles.noticeText}>
                You cannot answer your own thread. Edit the question if you have
                more context to add, or wait for the community to reply.
              </p>
            </div>
          )}

          {user && !isOwnQuestion && (
            <form className={styles.formCard} onSubmit={handlePostAnswer}>

              <h2 className={styles.formTitle}>Contribute an answer</h2>

              {postError && (
                <p className={styles.formError} role="alert">
                  {postError}
                </p>
              )}

              <div className={styles.editor}>

                <div className={styles.toolbar}>
                  <div className={styles.toolbarButtons}>
                    <button
                      type="button"
                      onClick={() => applyMarkdown('**', '**', 'bold text')}
                      title="Bold"
                      aria-label="Bold"
                    >
                      <strong>B</strong>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMarkdown('_', '_', 'italic text')}
                      title="Italic"
                      aria-label="Italic"
                    >
                      <em>I</em>
                    </button>

                    <span className={styles.toolbarDivider} aria-hidden="true" />

                    <button
                      type="button"
                      onClick={() => applyMarkdown('`', '`', 'code')}
                      title="Inline code"
                      aria-label="Inline code"
                    >
                      &lt;/&gt;
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        applyMarkdown('[', '](https://)', 'link text')
                      }
                      title="Link"
                      aria-label="Link"
                    >
                      &#128279;
                    </button>
                  </div>

                  <span className={styles.charCount}>
                    {answerText.length} characters
                  </span>
                </div>

                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  placeholder="Type your answer here... You can use Markdown to format your code!"
                  rows={10}
                />

              </div>

              {/* AI fit feedback */}
              {fitError && (
                <p className={styles.formError} role="alert">
                  {fitError}
                </p>
              )}

              {fitResult && (
                <div
                  className={`${styles.fitPanel} ${
                    styles[`fit_${fitResult.level}`] || styles.fit_partial
                  }`}
                  role="status"
                >
                  <div className={styles.fitHeader}>
                    <span className={styles.fitLevel}>
                      {String(fitResult.level || 'unknown')} fit
                    </span>

                    <button
                      type="button"
                      className={styles.fitDismiss}
                      onClick={() => setFitResult(null)}
                      aria-label="Dismiss feedback"
                    >
                      &times;
                    </button>
                  </div>

                  <p className={styles.fitNote}>{fitResult.note}</p>
                </div>
              )}

              <div className={styles.formFooter}>

                <div className={styles.fitRow}>
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={handleCheckFit}
                    disabled={!isAnswerLongEnough || isCheckingFit}
                  >
                    {isCheckingFit ? 'Checking...' : 'Check draft fit'}
                  </button>

                  <span className={styles.helperText}>
                    Relevance only. Not grading correctness. You need at least{' '}
                    {MIN_ANSWER_LENGTH} characters.
                  </span>
                </div>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={!isAnswerLongEnough || isPosting}
                >
                  {isPosting ? 'Posting...' : 'Post Your Answer'}
                </button>

              </div>

            </form>
          )}

        </section>

      </div>
    </div>
  );
}
