import { applyCommentBehavior } from "./comments";
import {
  createIdentifierMapping,
  hasRenamedIdentifierConflict,
  isFlexibleIdentifierLineMatch,
  learnDefinitionIdentifierMappings,
  type IdentifierMapping,
} from "./identifierCompare";
import type {
  CommentBehavior,
  FeedbackTiming,
  IdentifierMode,
  Language,
  LineStatus,
  Strictness,
} from "../types/exercise";

export type LineComparison = {
  lineNumber: number;
  expected: string;
  actual: string;
  status: LineStatus;
};

export type AttemptComparison = {
  completed: boolean;
  mismatchCount: number;
  lineComparisons: LineComparison[];
};

const splitLines = (value: string) => value.replace(/\r\n/g, "\n").split("\n");

export const normalizeLine = (line: string, strictness: Strictness) => {
  if (strictness === "strict") {
    return line;
  }

  return line.replace(/[ \t]/g, "");
};

export const normalizeText = (
  text: string,
  strictness: Strictness,
  language?: Language,
) => {
  if (strictness === "whitespace-tolerant" && language === "c") {
    return text.replace(/\s/g, "");
  }

  return splitLines(text)
    .map((line) => normalizeLine(line, strictness))
    .join("\n");
};

export const isPrefixMatch = (actual: string, expected: string, strictness: Strictness) => {
  const normalizedActual = normalizeLine(actual, strictness);
  const normalizedExpected = normalizeLine(expected, strictness);

  return normalizedExpected.startsWith(normalizedActual);
};

export const isLineMatch = (actual: string, expected: string, strictness: Strictness) => {
  return normalizeLine(actual, strictness) === normalizeLine(expected, strictness);
};

const isConfiguredLineMatch = (
  actual: string,
  expected: string,
  strictness: Strictness,
  language: Language,
  identifierMode: IdentifierMode,
  mapping?: IdentifierMapping,
) => {
  if (identifierMode === "flexible") {
    return isFlexibleIdentifierLineMatch(actual, expected, strictness, language, mapping);
  }

  const identifierMapping = mapping ?? createIdentifierMapping();
  const hasIdentifierConflict = hasRenamedIdentifierConflict(
    actual,
    expected,
    strictness,
    language,
    identifierMapping,
  );
  const matches = isLineMatch(actual, expected, strictness) && !hasIdentifierConflict;

  learnDefinitionIdentifierMappings(
    actual,
    expected,
    strictness,
    language,
    identifierMapping,
  );

  return matches;
};

const isCWhitespaceAgnostic = (strictness: Strictness, language: Language) =>
  strictness === "whitespace-tolerant" && language === "c";

const firstMismatchIndex = (actual: string, expected: string) => {
  const comparableLength = Math.min(actual.length, expected.length);

  for (let index = 0; index < comparableLength; index += 1) {
    if (actual[index] !== expected[index]) {
      return index;
    }
  }

  return actual.length === expected.length ? -1 : comparableLength;
};

const lineIndexForNormalizedOffset = (
  text: string,
  normalizedOffset: number,
  fallbackLineIndex: number,
) => {
  const lines = splitLines(text);
  let normalizedIndex = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    for (const char of lines[lineIndex]) {
      if (/\s/.test(char)) {
        continue;
      }

      if (normalizedIndex >= normalizedOffset) {
        return lineIndex;
      }

      normalizedIndex += 1;
    }
  }

  return fallbackLineIndex;
};

const isConfiguredTextMatch = (
  actual: string,
  expected: string,
  strictness: Strictness,
  language: Language,
  identifierMode: IdentifierMode,
) => {
  if (identifierMode === "flexible") {
    return isFlexibleIdentifierLineMatch(
      actual,
      expected,
      strictness,
      language,
      createIdentifierMapping(),
    );
  }

  return normalizeText(actual, strictness, language) === normalizeText(expected, strictness, language);
};

const compareLines = (
  expectedLines: string[],
  actualLines: string[],
  strictness: Strictness,
  language: Language,
  identifierMode: IdentifierMode,
): LineComparison[] => {
  const maxLineCount = Math.max(expectedLines.length, actualLines.length);
  const identifierMapping = createIdentifierMapping();

  return Array.from({ length: maxLineCount }, (_, index) => {
    const expected = expectedLines[index] ?? "";
    const actual = actualLines[index] ?? "";
    const status: LineStatus = isConfiguredLineMatch(
      actual,
      expected,
      strictness,
      language,
      identifierMode,
      identifierMapping,
    )
      ? "correct"
      : "incorrect";

    return {
      lineNumber: index + 1,
      expected,
      actual,
      status,
    };
  });
};

export const compareAttempt = (
  expectedText: string,
  actualText: string,
  strictness: Strictness,
  language: Language,
  commentBehavior: CommentBehavior,
  identifierMode: IdentifierMode = "exact",
): AttemptComparison => {
  const expectedComparableText = applyCommentBehavior(
    expectedText,
    language,
    commentBehavior,
  );
  const actualComparableText = applyCommentBehavior(
    actualText,
    language,
    commentBehavior,
  );
  const expectedLines = splitLines(expectedComparableText);
  const actualLines = splitLines(actualComparableText);
  const maxLineCount = Math.max(expectedLines.length, actualLines.length);

  if (isCWhitespaceAgnostic(strictness, language)) {
    const textMatches = isConfiguredTextMatch(
      actualComparableText,
      expectedComparableText,
      strictness,
      language,
      identifierMode,
    );

    if (textMatches) {
      return {
        completed: true,
        mismatchCount: 0,
        lineComparisons: Array.from({ length: maxLineCount }, (_, index) => ({
          lineNumber: index + 1,
          expected: expectedLines[index] ?? "",
          actual: actualLines[index] ?? "",
          status: "correct",
        })),
      };
    }
  }

  const lineComparisons = compareLines(
    expectedLines,
    actualLines,
    strictness,
    language,
    identifierMode,
  );

  const mismatchCount = lineComparisons.filter((line) => line.status === "incorrect").length;

  return {
    completed: mismatchCount === 0,
    mismatchCount,
    lineComparisons,
  };
};

export const getLineStatuses = (
  expectedText: string,
  actualText: string,
  strictness: Strictness,
  feedbackTiming: FeedbackTiming,
  submitted: boolean,
  language: Language,
  commentBehavior: CommentBehavior,
  identifierMode: IdentifierMode = "exact",
): LineComparison[] => {
  const expectedComparableText = applyCommentBehavior(
    expectedText,
    language,
    commentBehavior,
  );
  const actualComparableText = applyCommentBehavior(
    actualText,
    language,
    commentBehavior,
  );
  const expectedLines = splitLines(expectedComparableText);
  const actualLines = splitLines(actualComparableText);
  const maxLineCount = Math.max(expectedLines.length, actualLines.length);
  const activeLineIndex = Math.max(actualLines.length - 1, 0);
  const identifierMapping = createIdentifierMapping();

  if (feedbackTiming === "submit" && !submitted) {
    return Array.from({ length: maxLineCount }, (_, index) => ({
      lineNumber: index + 1,
      expected: expectedLines[index] ?? "",
      actual: actualLines[index] ?? "",
      status: "pending",
    }));
  }

  if (isCWhitespaceAgnostic(strictness, language) && (submitted || identifierMode === "exact")) {
    if (submitted) {
      return compareAttempt(
        expectedText,
        actualText,
        strictness,
        language,
        commentBehavior,
        identifierMode,
      ).lineComparisons;
    }

    const normalizedActual = normalizeText(actualComparableText, strictness, language);
    const normalizedExpected = normalizeText(expectedComparableText, strictness, language);
    const stillPossible = normalizedExpected.startsWith(normalizedActual);
    const mismatchIndex = firstMismatchIndex(normalizedActual, normalizedExpected);
    const errorLineIndex =
      mismatchIndex >= 0
        ? lineIndexForNormalizedOffset(
            actualComparableText,
            mismatchIndex,
            activeLineIndex,
          )
        : activeLineIndex;

    return Array.from({ length: maxLineCount }, (_, index) => {
      let status: LineStatus;

      if (stillPossible) {
        status = index < activeLineIndex ? "correct" : "pending";
      } else if (index === errorLineIndex) {
        status = "incorrect";
      } else {
        status = index < errorLineIndex ? "correct" : "pending";
      }

      return {
        lineNumber: index + 1,
        expected: expectedLines[index] ?? "",
        actual: actualLines[index] ?? "",
        status,
      };
    });
  }

  return Array.from({ length: maxLineCount }, (_, index) => {
    const expected = expectedLines[index] ?? "";
    const actual = actualLines[index] ?? "";
    let status: LineStatus = "pending";

    if (submitted) {
      status = isConfiguredLineMatch(
        actual,
        expected,
        strictness,
        language,
        identifierMode,
        identifierMapping,
      )
        ? "correct"
        : "incorrect";
    } else if (feedbackTiming === "instant" && identifierMode === "exact") {
      status = isPrefixMatch(actual, expected, strictness) ? "pending" : "incorrect";
      if (isLineMatch(actual, expected, strictness) && index < activeLineIndex) {
        status = "correct";
      }
    } else if (feedbackTiming === "line" || identifierMode === "flexible") {
      if (index < activeLineIndex) {
        status = isConfiguredLineMatch(
          actual,
          expected,
          strictness,
          language,
          identifierMode,
          identifierMapping,
        )
          ? "correct"
          : "incorrect";
      }
    }

    return {
      lineNumber: index + 1,
      expected,
      actual,
      status,
    };
  });
};

export const getVisibleMismatchCount = (comparisons: LineComparison[]) => {
  return comparisons.filter((line) => line.status === "incorrect").length;
};
