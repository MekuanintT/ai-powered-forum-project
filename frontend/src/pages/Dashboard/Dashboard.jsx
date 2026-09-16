import { useEffect, useState } from 'react'; 
import { useNavigate } from 'react-router-dom';

import {
  getQuestions,
  searchQuestionsSemantic,
} from '../../services/question/question.service'; 

import { useAuth } from '../../contexts/AuthContext';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('keyword');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const firstName = user?.firstName?.trim();

  const welcomeLine = firstName
    ? `Good to see you, ${firstName}.`
    : 'Welcome to the forum.';

  /*
   * Normalize the API response.
   * This lets the UI work with slightly different backend field names.
   */
  const normalizeQuestions = (data) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.questions)) {
      return data.questions;
    }

    return [];
  };

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      setError('');

      const data = await getQuestions();

      setQuestions(normalizeQuestions(data));
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError('Failed to load questions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      await loadQuestions();
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      let data;

      if (searchMode === 'semantic') {
        data = await searchQuestionsSemantic(query);
      } else {
        data = await getQuestions({
          search: query,
        });
      }

      setQuestions(normalizeQuestions(data));
    } catch (err) {
      console.error('Failed to search questions:', err);
      setError('Failed to search questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question) => {
    const questionHash =
      question.questionHash ||
      question.question_hash;

    if (questionHash) {
      navigate(`/questions/${questionHash}`);
    }
  };

  /*
   * Question helpers
   */

  const getQuestionHash = (question) =>
    question.questionHash ||
    question.question_hash;

  const getAuthor = (question) =>
    question.authorName ||
    question.author ||
    question.userName ||
    question.user?.firstName ||
    'Unknown user';

  const getAnswerCount = (question) =>
    question.answerCount ??
    question.answer_count ??
    question.answersCount ??
    question.answers?.length ??
    0;

  const getReplyCount = (question) =>
    question.replyCount ??
    question.reply_count ??
    getAnswerCount(question);

  const getCreatedAt = (question) =>
    question.createdAt ||
    question.created_at ||
    question.created ||
    null;

  const formatTimeAgo = (dateValue) => {
    if (!dateValue) return '';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const seconds = Math.floor(
      (Date.now() - date.getTime()) / 1000
    );

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }

    return date.toLocaleDateString();
  };

  /*
   * Dashboard statistics
   */
  const totalQuestions = questions.length;

  const totalReplies = questions.reduce(
    (total, question) =>
      total + Number(getReplyCount(question) || 0),
    0
  );

  const unansweredQuestions = questions.filter(
    (question) => getAnswerCount(question) === 0
  ).length;

  const currentUserId =
    user?.id ||
    user?.userId ||
    user?.user_id;

  const currentUserName = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const yourQuestions = questions.filter((question) => {
    const authorId =
      question.authorId ||
      question.author_id ||
      question.userId ||
      question.user_id ||
      question.author?.id;

    const authorName = getAuthor(question);

    if (currentUserId && authorId) {
      return String(authorId) === String(currentUserId);
    }

    if (currentUserName && authorName) {
      return authorName === currentUserName;
    }

    return false;
  }).length;

  return (
    <div className={styles.dashboard}>

      {/* =====================================================
          WELCOME
      ====================================================== */}
      <section className={styles.welcomeCard}>
        <div className={styles.eyebrow}>
          FORUM HOME
        </div>

        <h1>{welcomeLine}</h1>

        <p className={styles.welcomeDescription}>
          Start a topic, revisit your own threads, or skim the
          live feed. Search above works from any page once you
          are back on Home.
        </p>

        <div className={styles.actionGrid}>

          <button
            type="button"
            className={styles.actionCard}
            onClick={() => navigate('/questions/new')}
          >
            <span className={styles.actionIcon}>
              ✎
            </span>

            <span>
              <strong>New question</strong>
              <small>
                Share context, errors, and what you already tried
              </small>
            </span>
          </button>

          <button
            type="button"
            className={styles.actionCard}
            onClick={() => navigate('/topics')}
          >
            <span className={styles.actionIcon}>
              ║
            </span>

            <span>
              <strong>Your topics</strong>
              <small>
                Filtered list of threads you authored
              </small>
            </span>
          </button>

          <button
            type="button"
            className={styles.actionCard}
            onClick={() => navigate('/knowledge-base')}
          >
            <span className={styles.actionIcon}>
              ♧
            </span>

            <span>
              <strong>Knowledge base</strong>
              <small>
                Course library, uploads, and retrieval-backed
                context for threads
              </small>
            </span>
          </button>

        </div>
      </section>

      {/* =====================================================
          SEARCH
      ====================================================== */}
      <section className={styles.searchSection}>
        <form
          onSubmit={handleSearch}
          className={styles.searchForm}
        >
          <div className={styles.searchInputWrapper}>
            <span className={styles.searchIcon}>
              ⌕
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search questions by keyword..."
              className={styles.searchInput}
            />
          </div>

          <select
            value={searchMode}
            onChange={(event) =>
              setSearchMode(event.target.value)
            }
            className={styles.searchMode}
            aria-label="Search mode"
          >
            <option value="keyword">Keyword</option>
            <option value="semantic">Semantic</option>
          </select>

          <button
            type="submit"
            className={styles.searchButton}
          >
            Search
          </button>
        </form>
      </section>

      {/* =====================================================
          STATISTICS
      ====================================================== */}
      <section className={styles.statsGrid}>

        <div className={styles.statCard}>
          <span>Questions</span>
          <strong>{totalQuestions}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Replies</span>
          <strong>{totalReplies}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Unanswered</span>
          <strong>{unansweredQuestions}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Yours</span>
          <strong>{yourQuestions}</strong>
        </div>

      </section>

      {/* =====================================================
          DISCUSSION FEED
      ====================================================== */}
      <section className={styles.feedCard}>

        <div className={styles.feedHeader}>
          <div>
            <h2>Discussion feed</h2>

            <p>
              Your threads use a slim left accent in this list.
            </p>
          </div>

          <button
            type="button"
            className={styles.sortButton}
            onClick={loadQuestions}
          >
            NEWEST THREADS
          </button>
        </div>

        <div className={styles.feedContent}>

          {/* Loading */}
          {isLoading && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading recent questions...</p>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className={styles.errorState}>
              <p>{error}</p>

              <button
                type="button"
                onClick={loadQuestions}
                className={styles.retryButton}
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading &&
            !error &&
            questions.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  ?
                </div>

                <h3>No questions found</h3>

                <p>
                  Be the first to start a discussion.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/questions/new')}
                  className={styles.newQuestionButton}
                >
                  Ask a question
                </button>
              </div>
            )}

          {/* Questions */}
          {!isLoading &&
            !error &&
            questions.length > 0 && (
              <div className={styles.questionList}>

                {questions.map((question) => {
                  const questionHash =
                    getQuestionHash(question);

                  const author =
                    getAuthor(question);

                  const answerCount =
                    getAnswerCount(question);

                  const createdAt =
                    getCreatedAt(question);

                  return (
                    <article
                      key={
                        questionHash ||
                        question.questionId ||
                        question.id
                      }
                      className={styles.questionRow}
                      onClick={() =>
                        handleQuestionClick(question)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' ||
                          event.key === ' '
                        ) {
                          handleQuestionClick(question);
                        }
                      }}
                    >

                      {/* Avatar */}
                      <div className={styles.avatar}>
                        {author
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      {/* Main content */}
                      <div className={styles.questionBody}>

                        <h3>
                          {question.title ||
                            'Untitled question'}
                        </h3>

                        {question.description && (
                          <p className={styles.questionExcerpt}>
                            {question.description}
                          </p>
                        )}

                        <div className={styles.questionMeta}>

                          <span>
                            {answerCount}{' '}
                            {answerCount === 1
                              ? 'reply'
                              : 'replies'}
                          </span>

                          <span>
                            {createdAt
                              ? formatTimeAgo(createdAt)
                              : ''}
                          </span>

                          <span>
                            by {author}
                          </span>

                        </div>
                      </div>

                      {/* Answer status */}
                      <div
                        className={
                          answerCount > 0
                            ? styles.answeredStatus
                            : styles.unansweredStatus
                        }
                      >
                        {answerCount > 0
                          ? `${answerCount} ${
                              answerCount === 1
                                ? 'reply'
                                : 'replies'
                            }`
                          : 'Unanswered'}
                      </div>

                    </article>
                  );
                })}

              </div>
            )}

        </div>
      </section>

    </div>
  );
}
