# Contributing to AI-Powered Evangadi Forum

Thanks for contributing! This guide covers how we branch, commit, review, and ship code so the whole team stays in sync.

---

## 1. Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/MekuanintT/ai-powered-forum-project.git
   cd ai-powered-forum-project
   ```
2. Install dependencies for each app:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Copy the environment example file and fill in your own values:
   ```bash
   cp backend/.env.example backend/.env
   ```
4. Run the dev servers:
   ```bash
   # backend
   cd backend && npm run dev

   # frontend
   cd frontend && npm run dev
   ```

---

## 2. Branching Strategy

- `main` — always deployable. Never commit directly to `main`.
- Feature branches follow this naming pattern:
  ```
  feature/T-<task-id>-<short-description>
  ```
  Examples: `feature/T-11-similar-questions`, `feature/T-12-answers-crud`

Before starting work:
```bash
git checkout main
git pull origin main
git checkout -b feature/T-XX-your-task-name
```

---

## 3. Commit Messages

Keep commits small and descriptive. Preferred format:

```
<type>: <short summary>

<optional longer description>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples:
```
feat: implement similar questions endpoint
fix: correct cosine similarity calculation for empty vectors
docs: update README with setup instructions
```

---

## 4. Pull Request Process

1. Push your branch:
   ```bash
   git push origin feature/T-XX-your-task-name
   ```
2. Open a PR against `main` on GitHub.
3. In the PR description, include:
   - The Task ID (e.g. `T-11`) and a one-line summary
   - What changed and why
   - Any testing steps or screenshots (for frontend work)
4. Request review from at least one teammate before merging.
5. Resolve all review comments before merging.
6. Use **Squash and Merge** to keep `main`'s history clean.
7. Delete the branch after merging.

---

## 5. Code Style

- Use `camelCase` for variables and functions, `PascalCase` for React components.
- Keep functions small and single-purpose.
- Validate all external input (request params, body, query) before using it.
- Prefer async/await over raw promise chains.
- Run the linter before pushing:
  ```bash
  npm run lint
  ```

---

## 6. Testing

- Test new backend endpoints manually (Postman/Thunder Client) or with automated tests where available.
- For frontend changes, verify the affected page renders correctly and handles both success and error states.
- Never merge a branch with a broken build.

---

## 7. Syncing with the Team

If a teammate has pushed updates you need:
```bash
git fetch origin
git checkout main
git pull origin main
```

To bring the latest `main` into your feature branch:
```bash
git checkout feature/T-XX-your-task-name
git merge origin/main
```

---

## 8. Questions?

Check `TEAM.md` for who owns which area of the project, or ask in the team channel.
