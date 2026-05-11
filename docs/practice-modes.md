# Practice Modes

## Mode Architecture

Practice mode, checking strictness, and feedback timing should be separate settings.

Example:

```text
Mode: Missing Pieces
Strictness: Whitespace tolerant
Feedback: Line check
```

This keeps the app flexible without creating many hardcoded mode combinations.

## Exact Typing

The user sees an empty editor and must reproduce the full reference code.

Best for:

- Memorization.
- Syntax fluency.
- Final recall before exam-like practice.

Behavior:

- Reference code can be hidden or available behind a reveal action.
- User input is compared against the reference.
- Incorrect lines are highlighted based on the selected feedback timing.

## Fog Mode

The reference code is visible beside the editor, but blurred or partially obscured.

Best for:

- Early practice.
- Learning structure.
- Reducing fear when starting a new exercise.

Behavior:

- Reference panel shows the original code with a blur or overlay.
- User types into the practice editor.
- The app still compares input against the unblurred reference.
- Optional reveal controls can be added later.

MVP implementation can use a simple CSS blur.

## Missing Pieces

The user sees code with selected parts hidden and must fill in the blanks.

Best for:

- Practicing key logic.
- Memorizing conditions, return expressions, and loop updates.
- Moving from reading to active recall.

MVP generation options:

- Hide selected lines manually.
- Hide every Nth line.
- Hide lines matching simple patterns like `return`, `if`, `while`, or `for`.

Recommended MVP approach:

- Start with manual blank selection if time allows.
- Otherwise support simple pattern-based hiding first.

Example:

```c
int ft_strlen(char *str)
{
    int i;

    i = 0;
    while (____)
        ____;
    return (____);
}
```

## Function Skeleton

The user sees only the function shell and writes the missing body.

Best for:

- Exam-style recall.
- Practicing full problem structure.
- Transitioning away from guided copying.

MVP implementation:

- Let the app propose a skeleton from the reference code.
- Let the user edit the skeleton before starting.
- Do not depend on perfect parsing.

For C-like code, a simple first version can preserve:

- Function signature.
- Opening brace.
- Closing brace.

Example:

```c
int ft_strlen(char *str)
{
}
```

## Strictness

### Strict

The user's input must match the reference exactly.

Use for:

- Syntax memorization.
- Exam preparation where style must be reproduced exactly.

### Whitespace Tolerant

The comparison ignores formatting differences such as spaces, tabs, and optionally blank lines.

Use for:

- Logic recall.
- Reducing noise from formatting.

Open decision:

- Whether newlines should be ignored fully or only indentation should be ignored.

Recommendation:

- For MVP, ignore spaces and tabs, but keep line structure meaningful.

## Feedback Timing

### Instant

Validate as the user types.

Good for guided practice, but can feel harsh.

### Line Check

Validate when the user completes or leaves a line.

This is probably the best default because it encourages thinking in statements.

### Submit Only

Validate only at the end.

Good for exam simulation later, but useful in the MVP as a low-distraction option.
