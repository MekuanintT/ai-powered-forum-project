# Master Task List: AI-Powered Evangadi Forum

This document provides a consolidated, milestone-by-milestone breakdown of all frontend and backend tasks for the project, referencing the detailed documentation files.

---

## Milestone 1: Authentication (Auth)

*The foundation of user access. Both backend APIs and frontend pages are implemented here.*

### Backend Tasks

| Task ID | Task Name | Assignee | Description | Reference |
|---------|-----------|----------|--------------|-----------|
| T-04 | Register User | Mekuanint | Implement `POST /api/auth/register` to validate input, hash passwords using bcrypt, and create new user accounts. | `/auth/register.md` |
| T-05 | Login User | Ermi | Implement `POST /api/auth/login` to verify user credentials and issue signed JWT tokens for session management. | `/auth/login.md` |

### Frontend Tasks

| Task ID | Task Name | Assignee | Description | Reference |
|---------|-----------|----------|--------------|-----------|
| T-06 | Axios + Auth Service | Ibrahim | Set up Axios interceptors to automatically attach JWT tokens to API requests and handle global 401 unauthorized redirects. | — |
| T-07 | Auth Page UI | Ibrahim | Build the combined Login/Register page at `/auth` utilizing Framer Motion for smooth form transitions. | `/auth/task-auth.md` |
| T-08 | AuthContext + ProtectedRoute | Damtew | Create the global React authentication context and route guards to protect authenticated pages from unauthorized access. | — |
| T-00 | Public Landing Page | Yonatan | Build the unauthenticated `/` homepage to market the application and direct users to sign up or log in. | `/public/task-landing.md` |

---

## Milestone 2: Questions & Answers

*The core community forum functionality, featuring AI-assisted drafting and answer evaluation.*

### Backend Tasks

| Task ID | Task Name | Assignee | Description | Reference |
|---------|-----------|----------|--------------|-----------|
| T-09 | Create Question & Auto-Embed | Mekuanint | Implement `POST /api/questions` to save questions and simultaneously generate AI vector embeddings for semantic search. | `/question/create-question.md` |
| T-10 | List Questions | Ermi | Implement `GET /api/questions` with support for keyword search and a "mine" filter. | `/question/list-questions.md` |
| T-10 | Get Single Question Details | Ibrahim | Implement `GET /api/questions/:questionHash` to fetch a specific question and all its associated answers. | `/question/single-question.md` |
| T-11 | Semantic Search Questions | Damtew | Implement `GET /api/questions/search` to find conceptually related questions using AI vector cosine similarity. | `/question/search-questions.md` |
| T-11 | Find Similar Questions | Yonatan | Implement `GET /api/questions/:questionHash/similar` to recommend related questions based on an existing question's vector. | `/question/similar-questions.md` |
| T-12 | Create Answer | Mekuanint | Implement `POST /api/answers` to allow users to answer community questions (preventing them from answering their own). | `/answer/create-answer.md` |
| T-17 | AI Question Draft Coach | Ermi | Implement `POST /api/questions/draft-coach` to provide real-time AI feedback and tips on question drafts. | `/question/draft-coach.md` |
| T-18 | AI Answer Fit Evaluation | Ibrahim | Implement `POST /api/questions/:questionHash/answer-fit` to evaluate how strongly a draft answer addresses the question. | `/question/answer-fit.md` |

### Frontend Tasks

| Task ID | Task Name | Assignee | Description | Reference |
|---------|-----------|----------|--------------|-----------|
| T-13 | Layout Shell | Damtew | Create the `Layout`, `Navbar`, and `Sidebar` components to wrap and navigate between protected routes. | — |
| T-14 | Dashboard Page | Yonatan | Build the `/dashboard` page to list questions and handle keyword/semantic search inputs. | `/dashboard/task-dashboard.md` |
| T-15 | Post Question Page | Sosi | Build the `/questions/ask` form, seamlessly integrating the AI Draft Coach for real-time writing feedback. | `/post-question/task-post-question.md` |
| T-16 & T-20 | Question Detail Page | Ermi | Build the `/questions/:questionHash` page to display the question, answers, and the new answer form equipped with AI Answer Fit. | `/question-detail/task-question-detail.md` |
| T-21 | My Questions Page | Ibrahim | Build the `/my-questions` page to display a personalized list of only the user's authored questions. | `/my-questions/task-my-questions.md` |

---

## Milestone 3: Knowledge Base (RAG)

*Advanced AI feature allowing users to upload PDFs, perform semantic searches within them, and ask AI-grounded questions.*

### Backend Tasks

| Task ID | Task Name | Assignee | Description | Reference |
|---------|-----------|----------|--------------|-----------|
| T-22 | Upload & Process RAG Document | Damtew | Implement `POST /api/rag/documents` to securely upload PDFs, parse text, chunk paragraphs, and generate vector embeddings. | `/rag/create-document.md` |
| T-23 | Semantic Search in RAG Document | Yonatan | Implement `GET /api/rag/documents/:documentId/search` to find and return the most relevant text excerpts within a PDF. | `/rag/search-document.md` |
| T-23 | AI Query Grounded in RAG Document | Mekuanint | Implement `POST /api/rag/documents/:documentId/query` to generate accurate AI answers based purely on the uploaded PDF's context. | `/rag/query-document.md` |
| T-24 | Get RAG Document Metadata | Ermi | Implement `GET /api/rag/documents/:documentId` to fetch processing status and metadata for a document. | `/rag/get-document-meta.md` |
| T-24 | Stream RAG Document PDF | Ibrahim | Implement `GET /api/rag/documents/:documentId/file` to serve the PDF blob for browser previews. | `/rag/get-document-file.md` |
| T-24 | List My RAG Documents | Damtew | Implement `GET /api/rag/documents` to list all PDFs uploaded by the authenticated user. | `/rag/list-documents.md` |
| T-24 | Delete RAG Document | Yonatan | Implement `DELETE /api/rag/documents/:documentId` to safely remove a PDF from disk and cascade delete its vectors from the database. | `/rag/delete-document.md` |

### Frontend Tasks

| Task ID | Task Name | Assignee | Description | Reference |
|---------|-----------|----------|--------------|-----------|
| T-24 & T-25 | RAG Documents Page | Sosi | Build the `/rag-documents` page featuring a document list sidebar, PDF upload dropzone, and a 3-tab active view interface (Ask AI, Semantic Search, PDF Preview). | `/rag-documents/task-rag-documents.md` |

---
