# Stack Notes

## Current Product Decision

The MVP should be a frontend-only TypeScript web app with no persistent storage.

This means:

- No backend.
- No database.
- No login.
- No cloud sync.
- No saved exercise library for the first version.

The app can keep all exercise state in React state or equivalent in-memory state. A page reload can reset the session.

## Recommended Stack

Recommended initial stack:

- Vite.
- React.
- TypeScript.
- CodeMirror 6.
- Plain CSS or CSS Modules.
- Vitest for core comparison logic.
- Playwright later for end-to-end UI checks.

## Why This Stack

### Vite

Fast setup, fast local development, simple production build.

### React

Good fit for mode-driven UI and editor state.

### TypeScript

The app's behavior depends on clear mode, strictness, and feedback-state types.

### CodeMirror 6

Better fit than Monaco for an MVP:

- Lighter.
- Easier to embed.
- Good enough syntax highlighting.
- Strong browser editor behavior.

Monaco is still an option later if we want a VS Code-like editing feel.

### CSS Modules Or Plain CSS

The UI should be simple and focused. A full design system is unnecessary for the MVP.

## Alternative Stack

### SvelteKit

Good alternative if we want less boilerplate and very direct state handling.

Potential downside: React ecosystem is larger for editor integrations and common UI helpers.

### Next.js

Not recommended for MVP.

Reason:

- No backend or routing complexity is needed.
- Vite is simpler for a frontend-only tool.

## Suggested App Structure

```text
src/
  app/
    App.tsx
  components/
    ReferenceInput.tsx
    PracticeSetup.tsx
    PracticeEditor.tsx
    ReferencePanel.tsx
    ResultsPanel.tsx
  lib/
    compare.ts
    modes.ts
    skeleton.ts
    missingPieces.ts
  types/
    exercise.ts
```

## Core Types

```ts
export type PracticeMode =
  | "exact"
  | "fog"
  | "missing-pieces"
  | "skeleton";

export type Strictness = "strict" | "whitespace-tolerant";

export type FeedbackTiming = "instant" | "line" | "submit";

export type PracticeConfig = {
  mode: PracticeMode;
  strictness: Strictness;
  feedbackTiming: FeedbackTiming;
};
```

## Future Storage Options

Storage should be added only after the practice experience feels right.

Possible sequence:

1. Export/import JSON.
2. Local storage for recent exercises.
3. IndexedDB for full local library.
4. Backend accounts if users need cross-device sync.
