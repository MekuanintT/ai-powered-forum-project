// /frontend/src/pages/MyQuestions/MyQuestions.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestions } from "../../services/question.service";
import QuestionCard from "../../components/QuestionCard/QuestionCard";
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
        setQuestions(data);
      } catch (err) {
        setError(err.message || "Failed to fetch questions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyQuestions();
  }, []);

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
            {questions.map((question) => (
              <QuestionCard
                key={question.question_id || question.id}
                question={question}
                isOwner={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQuestions;
