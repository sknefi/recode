# Product Brief

## Working Name

ExamPrep Code Trainer

## Problem

Students often know which coding problems may appear on an exam, and they may already have trusted reference solutions. Reading those solutions is not enough. They need a way to repeatedly reproduce the code from memory, notice mistakes quickly, and gradually move from guided copying to exam-like recall.

The app should help users memorize and internalize code by turning any pasted reference solution into a configurable practice exercise.

## Target Users

- 42 students preparing for coding exams.
- Programming students memorizing common algorithms or templates.
- Developers practicing syntax-heavy snippets, shell commands, SQL, config files, or interview patterns.

The MVP should not be 42-specific. It should work with any pasted code.

## Core Value

The user pastes code they want to learn, chooses a practice mode, and rewrites or completes the code with feedback.

The app is not trying to prove that code is semantically correct. It is helping the user reproduce a known reference solution under controlled difficulty.

## Product Principles

- Universal first: support any pasted code, not only C or 42 exercises.
- Practice over explanation: the main screen should get the user writing code quickly.
- Configurable difficulty: practice mode, strictness, and feedback timing should be separate choices.
- Low setup: no accounts, no backend, no required saved library in the MVP.
- Honest feedback: show exactly where the user's attempt diverges from the reference.

## MVP User Flow

1. User pastes a reference solution.
2. User optionally adds a title and language.
3. User chooses a practice mode.
4. User chooses strictness.
5. User chooses feedback timing.
6. User practices in the editor.
7. User sees session results: time, mistakes, completion, and diff.

## Non-Goals For MVP

- User accounts.
- Cloud sync.
- Long-term persistent storage.
- AI-generated exercises.
- Semantic code validation.
- Running submitted code.
- Multi-solution acceptance.
- Full exam simulation.
- Spaced repetition.
