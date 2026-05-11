# ExamPrep Code Trainer Docs

This folder captures the product direction before implementation.

## Documents

- [Product Brief](product-brief.md): problem, users, principles, and non-goals.
- [MVP Scope](mvp-scope.md): what the first version includes and excludes.
- [Practice Modes](practice-modes.md): exact typing, fog mode, missing pieces, function skeleton, strictness, and feedback timing.
- [Stack Notes](stack-notes.md): recommended frontend-only TypeScript stack and storage decision.

## Current Decisions

- The MVP is a browser-based TypeScript app.
- The MVP has no backend, database, login, or persistent storage.
- Practice mode, strictness, and feedback timing are separate configuration choices.
- The first implementation should focus on the typing/checking experience before exercise libraries or long-term stats.

## Implemented MVP Decisions

- Whitespace-tolerant mode ignores spaces and tabs while preserving line structure.
- Missing Pieces supports pattern-based blanks, every-Nth content line blanks, and manual line numbers.
- The editor uses CodeMirror 6.
- Current-session statistics live in app memory and reset on page reload.
