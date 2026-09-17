// /frontend/src/pages/MyQuestions/MyQuestions.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestions } from "../../services/question/question.service";
import styles from "./MyQuestions.module.css";

const MyQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getQuestions({ mine: true });
        setQuestions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Failed to fetch questions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyQuestions();
  }, []);

  /*
   * Question helpers (mirrors Dashboard.jsx for consistent display)
   */
  const getQuestionHash = (question) =>
    question.questionHash || question.question_hash;

  const getAuthor = (question) => {
    const authorObject = question.author || question.user;

    if (authorObject && typeof authorObject === "object") {
      const fullName = [authorObject.firstName, authorObject.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (fullName) {
        return fullName;
      }
    }

    return (
      question.authorName ||
      (typeof question.author === "string" ? question.author : null) ||
      question.userName ||
      "Unknown user"
    );
  };

  const getAnswerCount = (question) =>
    question.answerCount ??
    question.answer_count ??
    question.answersCount ??
    question.answers?.length ??
    0;

  const getCreatedAt = (question) =>
    question.createdAt || question.created_at || question.created || null;

  const formatTimeAgo = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
      return "just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    }

    const weeks = Math.floor(days / 7);

    if (days < 60) {
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }

    return date.toLocaleDateString();
  };

  const handleQuestionClick = (question) => {
    const questionHash = getQuestionHash(question);

    if (questionHash) {
      navigate(`/questions/${questionHash}`);
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Header Banner */}
      <div className={styles.headerCard}>
        <div className={styles.headerContent}>
          <span className={styles.categoryTag}>YOUR WORKSPACE</span>
          <h1 className={styles.title}>Your topics</h1>
          <p className={styles.subtitle}>
            Only questions you created. Open one to read answers or add
            follow-ups. Rows use the same left accent as your threads on Home.
          </p>
        </div>
        <button
          className={styles.newQuestionBtn}
          onClick={() => navigate("/questions/ask")}
        >
          <span className={styles.plusIcon}>+</span> New question
        </button>
      </div>

      {/* Main Content Area */}
      <div className={styles.contentCard}>
        {isLoading && (
          <div className={styles.loadingState}>Loading your questions...</div>
        )}

        {!isLoading && error && (
          <div className={styles.errorState}>{error}</div>
        )}

        {!isLoading && !error && questions.length === 0 && (
          <div className={styles.emptyState}>
            You have not asked any questions yet. Use Ask a Question in the
            sidebar to start.
          </div>
        )}

        {!isLoading && !error && questions.length > 0 && (
          <div className={styles.questionList}>
            {questions.map((question) => {
              const questionHash = getQuestionHash(question);
              const author = getAuthor(question);
              const answerCount = getAnswerCount(question);
              const createdAt = getCreatedAt(question);

              const questionId =
                questionHash ||
                question.questionId ||
                question.question_id ||
                question.id;

              return (
                <article
                  key={questionId}
                  className={styles.questionRow}
                  onClick={() => handleQuestionClick(question)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleQuestionClick(question);
                    }
                  }}
                >
                  <span className={styles.yoursBadge}>YOURS</span>

                  <div className={styles.avatar}>
                    {author.charAt(0).toUpperCase()}
                  </div>

                  <div className={styles.questionBody}>
                    <h3>{question.title || "Untitled question"}</h3>

                    {question.content && (
                      <p className={styles.questionExcerpt}>
                        {question.content}
                      </p>
                    )}

                    <div className={styles.questionMeta}>
                      <span>
                        {answerCount}{" "}
                        {answerCount === 1 ? "reply" : "replies"}
                      </span>

                      <span>
                        {createdAt ? formatTimeAgo(createdAt) : ""}
                      </span>

                      <span>by You</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQuestions;
