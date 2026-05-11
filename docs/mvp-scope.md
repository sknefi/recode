# MVP Scope

## Goal

Build a browser-based TypeScript app that lets a user paste code and practice reproducing it through several study modes.

The MVP should prove the core learning loop:

> paste reference code -> configure practice -> write code -> get feedback -> review result

## Included Features

### Reference Input

- Text area or code editor for pasting reference code.
- Optional title.
- Optional language selector for editor highlighting.
- No required save step.

### Practice Modes

- Exact Typing.
- Fog Mode.
- Missing Pieces.
- Function Skeleton.

### Strictness

- Strict: exact character comparison.
- Whitespace tolerant: ignore spaces, tabs, and optionally blank lines during comparison.

### Feedback Timing

- Instant: validate as the user types.
- Line check: validate after a line is completed.
- Submit only: validate only when the user submits.

### Feedback UI

- Highlight current incorrect line.
- Show completed lines.
- Show mistake count.
- Show elapsed time.
- Show final diff or mismatch summary after submit.

### Session Statistics

Track only the current browser session:

- Time spent.
- Mistake count.
- Completion status.
- Accuracy estimate.
- Mode used.
- Strictness used.

These stats can reset when the page reloads.

## Excluded Features

- Persistent exercise library.
- Authentication.
- Backend API.
- Database.
- Code execution.
- AI hints.
- Long-term mistake history.
- Spaced repetition.
- Import/export.

## Important MVP Decision

The app should not handle persistent storage at first.

Reason:

- It keeps the app simple.
- It avoids data model churn while the practice mechanics are still changing.
- It lets us validate whether the typing/checking experience is useful before building library management.

Possible later storage options:

- Local storage.
- IndexedDB.
- Export/import JSON.
- Backend with accounts.

## Success Criteria

The MVP is successful if a user can:

- Paste a code solution.
- Start practicing in under 30 seconds.
- Choose at least two different difficulty styles.
- Clearly see when their attempt diverges from the reference.
- Finish an attempt and understand what went wrong.
