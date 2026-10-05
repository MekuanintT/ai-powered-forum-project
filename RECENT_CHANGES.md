# Recent Changes

## Question and Answer Editing and Deletion

Users can edit or delete only questions and answers they own.

- Added authenticated `PUT` and `DELETE` endpoints for questions at `/api/questions/:questionHash`.
- Added authenticated `PUT` and `DELETE` endpoints for answers at `/api/answers/:answerId`.
- Validated question hashes, answer IDs, and edited content on the backend.
- Scoped update and delete database operations to both the record ID and authenticated user ID. Unauthorized or missing records are returned as not found.
- Added owner-only Edit and Delete actions to the question detail page. Editing uses inline forms; deletion asks for confirmation.
- Updated the page state after successful edits and deletions without requiring a full refresh. Deleting a question returns to the feed.
- Regenerated the question's semantic-search vector when its title is edited.

## Related Question Owner Names

The Related Questions panel now displays the name of the person who posted each question.

- Updated similar-question retrieval to join the `users` table and return the owner's first and last name and author details.
- Updated the panel to prefer the returned display name while retaining the existing author-name fallback.

## Discussion Feed Avatar Colors

Author avatars in the Discussion Feed now use a stable background color per user.

- Derive each avatar's hue from the author's user ID, with a stable name-based fallback when the ID is unavailable.
- Apply the color only to the avatar background and use dark text for readability.
- Updated `Dashboard.jsx` and `Dashboard.module.css` for the feed avatar.

## Verification

- Frontend production build passed. Vite reports the existing large-chunk advisory.
- Focused lint passed for the changed frontend files; the Dashboard has unrelated existing lint findings in date formatting and search effects.
- Backend JavaScript syntax checks passed.
- `git diff --check` passed.
- The backend test command completes, but currently discovers no tests.
