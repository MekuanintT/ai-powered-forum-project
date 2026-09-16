// import { useRef, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Bold,
//   CheckCircle,
//   Code,
//   Italic,
//   Lightbulb,
//   Link,
//   Send,
//   Sparkles,
// } from 'lucide-react';
// import {
//   createQuestion,
//   generateQuestionDraftCoach,
// } from '../../services/question/question.service.js';
// import styles from './PostQuestion.module.css';

// const TITLE_MIN_LENGTH = 5;
// const TITLE_MAX_LENGTH = 255;
// const CONTENT_MIN_LENGTH = 10;

// export default function PostQuestion() {
//   const navigate = useNavigate();
//   const contentRef = useRef(null);
//   const [formData, setFormData] = useState({ title: '', content: '' });
//   const [fieldErrors, setFieldErrors] = useState({});
//   const [error, setError] = useState('');
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isCoaching, setIsCoaching] = useState(false);
//   const [coachFeedback, setCoachFeedback] = useState(null);
//   const [createdQuestion, setCreatedQuestion] = useState(null);

//   const isProcessing = isSubmitting || isCoaching;

//   const validateForm = () => {
//     const normalized = {
//       title: formData.title.trim(),
//       content: formData.content.trim(),
//     };
//     const nextErrors = {};

//     if (normalized.title.length < TITLE_MIN_LENGTH) {
//       nextErrors.title = 'Question title must be at least 5 characters';
//     } else if (normalized.title.length > TITLE_MAX_LENGTH) {
//       nextErrors.title = 'Question title must be no more than 255 characters';
//     }

//     if (normalized.content.length < CONTENT_MIN_LENGTH) {
//       nextErrors.content = 'Question content must be at least 10 characters';
//     }

//     setFieldErrors(nextErrors);
//     return Object.keys(nextErrors).length === 0 ? normalized : null;
//   };

//   const handleFieldChange = event => {
//     const { name, value } = event.target;
//     setFormData(current => ({ ...current, [name]: value }));
//     setFieldErrors(current => ({ ...current, [name]: undefined }));
//     setError('');
//     setCoachFeedback(null);
//   };

//   const insertMarkdown = (before, after = before) => {
//     const textarea = contentRef.current;
//     if (!textarea || isProcessing) return;

//     const start = textarea.selectionStart;
//     const end = textarea.selectionEnd;
//     const selectedText = formData.content.slice(start, end);
//     const nextContent =
//       formData.content.slice(0, start) +
//       before +
//       selectedText +
//       after +
//       formData.content.slice(end);

//     setFormData(current => ({ ...current, content: nextContent }));
//     setFieldErrors(current => ({ ...current, content: undefined }));
//     setCoachFeedback(null);

//     requestAnimationFrame(() => {
//       textarea.focus();
//       textarea.setSelectionRange(
//         start + before.length,
//         end + before.length,
//       );
//     });
//   };

//   const handleCoach = async () => {
//     const payload = validateForm();
//     setError('');
//     if (!payload) return;

//     setIsCoaching(true);
//     try {
//       const feedback = await generateQuestionDraftCoach(payload);
//       setCoachFeedback(feedback);
//     } catch (requestError) {
//       setError(
//         requestError.message ||
//           'Unable to generate suggestions right now. Please try again.',
//       );
//     } finally {
//       setIsCoaching(false);
//     }
//   };

//   const handleSubmit = async event => {
//     event.preventDefault();
//     const payload = validateForm();
//     setError('');
//     if (!payload) return;

//     setIsSubmitting(true);
//     try {
//       const question = await createQuestion(payload);
//       setCreatedQuestion(question);
//     } catch (requestError) {
//       setError(
//         requestError.message || 'Failed to post question. Please try again.',
//       );
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleAskAnother = () => {
//     setFormData({ title: '', content: '' });
//     setFieldErrors({});
//     setError('');
//     setCoachFeedback(null);
//     setCreatedQuestion(null);
//   };

//   const handleViewQuestion = () => {
//     if (createdQuestion?.questionHash) {
//       navigate('/questions/' + createdQuestion.questionHash);
//       return;
//     }
//     navigate('/dashboard');
//   };

//   return (
//     <section className={styles.postQuestion}>
//       <header className={styles.postQuestion__intro}>
//         <p className={styles.postQuestion__eyebrow}>Ask the cohort</p>
//         <h1 className={styles.postQuestion__title}>Publish to the forum</h1>
//         <p className={styles.postQuestion__description}>
//           Public threads help the whole cohort. Write as if a classmate will
//           debug your issue tomorrow. They only know what you put on the page.
//         </p>
//       </header>

//       {createdQuestion ? (
//         <div
//           className={styles.postQuestion__success}
//           role='status'
//           aria-live='polite'
//         >
//           <span className={styles.postQuestion__successIcon} aria-hidden>
//             <CheckCircle size={48} strokeWidth={1.8} />
//           </span>
//           <h2 className={styles.postQuestion__successTitle}>Thread published</h2>
//           <p className={styles.postQuestion__successText}>
//             Your post is indexed for keyword search and embedding-based
//             similarity. Share the link in study groups, or stay on the thread
//             to answer follow-up questions from peers.
//           </p>
//           <div className={styles.postQuestion__successActions}>
//             <button
//               type='button'
//               className={styles.postQuestion__textButton}
//               onClick={() => navigate('/dashboard')}
//             >
//               Back to Dashboard
//             </button>
//             <button
//               type='button'
//               className={styles.postQuestion__primaryButton}
//               onClick={handleViewQuestion}
//             >
//               View Question
//             </button>
//             <button
//               type='button'
//               className={styles.postQuestion__secondaryButton}
//               onClick={handleAskAnother}
//             >
//               Ask Another
//             </button>
//           </div>
//         </div>
//       ) : (
//         <>
//           <aside className={styles.postQuestion__guide}>
//             <h2 className={styles.postQuestion__guideTitle}>
//               Write questions people can answer in one pass
//             </h2>
//             <p className={styles.postQuestion__guideIntro}>
//               Mentors volunteer their time. Give them runnable context,
//               expected vs actual behavior, and a tight scope so they can
//               reproduce the issue without guessing your setup.
//             </p>

//             <h3 className={styles.postQuestion__guideHeading}>
//               Checklist before you post
//             </h3>
//             <ul className={styles.postQuestion__guideList}>
//               <li>
//                 <strong>Title as a headline</strong> that states the symptom and
//                 tech stack.
//               </li>
//               <li>
//                 <strong>Repro steps</strong> numbered, with environment details
//                 when they matter.
//               </li>
//               <li>
//                 <strong>Minimal code</strong> in fenced markdown blocks; trim
//                 unrelated lines.
//               </li>
//               <li>
//                 <strong>Exact errors</strong> copied verbatim, including useful
//                 stack trace snippets.
//               </li>
//             </ul>

//             <h3 className={styles.postQuestion__guideHeading}>
//               Validation rules (enforced by the form)
//             </h3>
//             <ul className={styles.postQuestion__guideList}>
//               <li>
//                 <strong>Title length:</strong> Must be between 5 and 255
//                 characters.
//               </li>
//               <li>
//                 <strong>Body length:</strong> Must contain a minimum of 10
//                 characters.
//               </li>
//               <li>
//                 <strong>Single topic:</strong> Split unrelated bugs into
//                 separate threads.
//               </li>
//             </ul>
//           </aside>

//           <form className={styles.postQuestion__form} onSubmit={handleSubmit}>
//             {error && (
//               <div className={styles.postQuestion__errorBanner} role='alert'>
//                 {error}
//               </div>
//             )}

//             <div className={styles.postQuestion__field}>
//               <label
//                 htmlFor='question-title'
//                 className={styles.postQuestion__label}
//               >
//                 Title
//               </label>
//               <p className={styles.postQuestion__hint}>
//                 Be specific and imagine you&apos;re asking a question to
//                 another person.
//               </p>
//               <input
//                 id='question-title'
//                 name='title'
//                 type='text'
//                 value={formData.title}
//                 onChange={handleFieldChange}
//                 maxLength={TITLE_MAX_LENGTH}
//                 disabled={isSubmitting}
//                 placeholder='e.g. How do I handle state management using Context API in React?'
//                 className={[
//                   styles.postQuestion__input,
//                   fieldErrors.title
//                     ? styles['postQuestion__input--error']
//                     : '',
//                 ]
//                   .filter(Boolean)
//                   .join(' ')}
//                 aria-invalid={Boolean(fieldErrors.title)}
//                 aria-describedby={
//                   fieldErrors.title ? 'question-title-error' : undefined
//                 }
//               />
//               {fieldErrors.title && (
//                 <p
//                   id='question-title-error'
//                   className={styles.postQuestion__fieldError}
//                   role='alert'
//                 >
//                   {fieldErrors.title}
//                 </p>
//               )}
//             </div>

//             <div className={styles.postQuestion__field}>
//               <label
//                 htmlFor='question-content'
//                 className={styles.postQuestion__label}
//               >
//                 What are the details of your problem?
//               </label>
//               <p className={styles.postQuestion__hint}>
//                 Introduce the problem and expand on what you put in the title.
//                 Minimum 10 characters.
//               </p>
//               <div
//                 className={[
//                   styles.postQuestion__editor,
//                   fieldErrors.content
//                     ? styles['postQuestion__editor--error']
//                     : '',
//                 ]
//                   .filter(Boolean)
//                   .join(' ')}
//               >
//                 <div
//                   className={styles.postQuestion__toolbar}
//                   aria-label='Markdown formatting'
//                 >
//                   <button
//                     type='button'
//                     onClick={() => insertMarkdown('**')}
//                     disabled={isProcessing}
//                     aria-label='Bold selected text'
//                     title='Bold'
//                   >
//                     <Bold size={16} />
//                   </button>
//                   <button
//                     type='button'
//                     onClick={() => insertMarkdown('_')}
//                     disabled={isProcessing}
//                     aria-label='Italicize selected text'
//                     title='Italic'
//                   >
//                     <Italic size={16} />
//                   </button>
//                   <button
//                     type='button'
//                     onClick={() => insertMarkdown(String.fromCharCode(96))}
//                     disabled={isProcessing}
//                     aria-label='Format selected text as code'
//                     title='Inline code'
//                   >
//                     <Code size={16} />
//                   </button>
//                   <button
//                     type='button'
//                     onClick={() => insertMarkdown('[', '](https://)')}
//                     disabled={isProcessing}
//                     aria-label='Add link to selected text'
//                     title='Link'
//                   >
//                     <Link size={16} />
//                   </button>
//                   <span className={styles.postQuestion__characterCount}>
//                     {formData.content.length} characters
//                   </span>
//                 </div>
//                 <textarea
//                   ref={contentRef}
//                   id='question-content'
//                   name='content'
//                   value={formData.content}
//                   onChange={handleFieldChange}
//                   disabled={isSubmitting}
//                   rows={12}
//                   placeholder='Include all the information someone would need to answer your question… You can use Markdown to format your code!'
//                   className={styles.postQuestion__textarea}
//                   aria-invalid={Boolean(fieldErrors.content)}
//                   aria-describedby={
//                     fieldErrors.content ? 'question-content-error' : undefined
//                   }
//                 />
//               </div>
//               {fieldErrors.content && (
//                 <p
//                   id='question-content-error'
//                   className={styles.postQuestion__fieldError}
//                   role='alert'
//                 >
//                   {fieldErrors.content}
//                 </p>
//               )}
//             </div>

//             <div className={styles.postQuestion__coachRow}>
//               <button
//                 type='button'
//                 className={styles.postQuestion__coachButton}
//                 onClick={handleCoach}
//                 disabled={isProcessing}
//               >
//                 <Sparkles size={17} aria-hidden />
//                 {isCoaching ? 'Reviewing draft…' : 'AI suggestions'}
//               </button>
//               <span>Suggestions only. You still choose what to post.</span>
//             </div>

//             {coachFeedback && (
//               <section
//                 className={styles.postQuestion__coachPanel}
//                 aria-live='polite'
//               >
//                 <div className={styles.postQuestion__coachPanelHeader}>
//                   <Lightbulb size={19} aria-hidden />
//                   <h3>Draft coach feedback</h3>
//                 </div>
//                 {coachFeedback.feedback && <p>{coachFeedback.feedback}</p>}
//                 {coachFeedback.tips.length > 0 ? (
//                   <ul>
//                     {coachFeedback.tips.map((tip, index) => (
//                       <li key={tip + index}>{tip}</li>
//                     ))}
//                   </ul>
//                 ) : (
//                   <p>Your draft looks ready to share.</p>
//                 )}
//               </section>
//             )}

//             <div className={styles.postQuestion__actions}>
//               <button
//                 type='button'
//                 className={styles.postQuestion__textButton}
//                 onClick={() => navigate('/dashboard')}
//                 disabled={isProcessing}
//               >
//                 Cancel
//               </button>
//               <button
//                 type='submit'
//                 className={styles.postQuestion__primaryButton}
//                 disabled={isProcessing}
//               >
//                 {isSubmitting ? 'Posting…' : 'Post Question'}
//                 {!isSubmitting && <Send size={16} aria-hidden />}
//               </button>
//             </div>
//           </form>
//         </>
//       )}
//     </section>
//   );
// }
