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

type ComparableLine = {
  lineNumber: number;
  text: string;
};

const splitLines = (value: string) => value.replace(/\r\n/g, "\n").split("\n");

const expandIndentTabs = (indent: string) => indent.replace(/\t/g, "    ");

const splitIndent = (line: string) => {
  const match = line.match(/^([ \t]*)(.*)$/);

  return {
    indent: match ? match[1] : "",
    body: match ? match[2] : line,
  };
};

const normalizePythonLine = (line: string, strictness: Strictness) => {
  if (strictness === "strict") {
    return line;
  }

  const { indent, body } = splitIndent(line);

  return `${expandIndentTabs(indent)}${body.replace(/[ \t]/g, "")}`;
};

export const normalizeLine = (line: string, strictness: Strictness) => {
  if (strictness === "strict") {
    return line;
  }

  return line.replace(/[ \t]/g, "");
};

const normalizeLineForLanguage = (
  line: string,
  strictness: Strictness,
  language: Language,
) => {
  if (language === "python") {
    return normalizePythonLine(line, strictness);
  }

  return normalizeLine(line, strictness);
};

export const normalizeText = (
  text: string,
  strictness: Strictness,
  language?: Language,
) => {
  if (strictness === "whitespace-tolerant" && language === "c") {
    return text.replace(/\s/g, "");
  }

  return buildComparableLines(text, strictness, language)
    .map((line) =>
      normalizeLineForLanguage(line.text, strictness, language ?? "c"),
    )
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

const isLineMatchForLanguage = (
  actual: string,
  expected: string,
  strictness: Strictness,
  language: Language,
) => {
  return (
    normalizeLineForLanguage(actual, strictness, language) ===
    normalizeLineForLanguage(expected, strictness, language)
  );
};

const isPrefixMatchForLanguage = (
  actual: string,
  expected: string,
  strictness: Strictness,
  language: Language,
) => {
  const normalizedActual = normalizeLineForLanguage(actual, strictness, language);
  const normalizedExpected = normalizeLineForLanguage(expected, strictness, language);

  return normalizedExpected.startsWith(normalizedActual);
};

const isPythonIndentMatch = (
  actual: string,
  expected: string,
  strictness: Strictness,
  language: Language,
) => {
  if (language !== "python" || strictness !== "whitespace-tolerant") {
    return true;
  }

  return expandIndentTabs(splitIndent(actual).indent) ===
    expandIndentTabs(splitIndent(expected).indent);
};

const buildComparableLines = (
  text: string,
  strictness: Strictness,
  language: Language = "c",
): ComparableLine[] => {
  return splitLines(text)
    .map((line, index) => ({
      lineNumber: index + 1,
      text: line,
    }))
    .filter(
      (line) =>
        !(
          language === "python" &&
          strictness === "whitespace-tolerant" &&
          line.text.trim().length === 0
        ),
    );
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
    if (!isPythonIndentMatch(actual, expected, strictness, language)) {
      return false;
    }

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
  const matches =
    isLineMatchForLanguage(actual, expected, strictness, language) &&
    !hasIdentifierConflict;

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
  expectedLines: ComparableLine[],
  actualLines: ComparableLine[],
  strictness: Strictness,
  language: Language,
  identifierMode: IdentifierMode,
): LineComparison[] => {
  const maxLineCount = Math.max(expectedLines.length, actualLines.length);
  const identifierMapping = createIdentifierMapping();

  return Array.from({ length: maxLineCount }, (_, index) => {
    const expected = expectedLines[index]?.text ?? "";
    const actual = actualLines[index]?.text ?? "";
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
      lineNumber:
        actualLines[index]?.lineNumber ?? expectedLines[index]?.lineNumber ?? index + 1,
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
  const rawExpectedLines = splitLines(expectedComparableText);
  const rawActualLines = splitLines(actualComparableText);
  const expectedLines = buildComparableLines(
    expectedComparableText,
    strictness,
    language,
  );
  const actualLines = buildComparableLines(
    actualComparableText,
    strictness,
    language,
  );
  const maxLineCount = Math.max(rawExpectedLines.length, rawActualLines.length);

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
          expected: rawExpectedLines[index] ?? "",
          actual: rawActualLines[index] ?? "",
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
  const rawExpectedLines = splitLines(expectedComparableText);
  const rawActualLines = splitLines(actualComparableText);
  const expectedLines = buildComparableLines(
    expectedComparableText,
    strictness,
    language,
  );
  const actualLines = buildComparableLines(
    actualComparableText,
    strictness,
    language,
  );
  const maxLineCount = Math.max(rawExpectedLines.length, rawActualLines.length);
  const activeLineIndex = Math.max(rawActualLines.length - 1, 0);
  const activeLineNumber = rawActualLines.length;
  const identifierMapping = createIdentifierMapping();

  if (feedbackTiming === "submit" && !submitted) {
    return Array.from({ length: maxLineCount }, (_, index) => ({
      lineNumber: index + 1,
      expected: rawExpectedLines[index] ?? "",
      actual: rawActualLines[index] ?? "",
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
        expected: rawExpectedLines[index] ?? "",
        actual: rawActualLines[index] ?? "",
        status,
      };
    });
  }

  return Array.from({ length: Math.max(expectedLines.length, actualLines.length) }, (_, index) => {
    const expectedLine = expectedLines[index];
    const actualLine = actualLines[index];
    const expected = expectedLine?.text ?? "";
    const actual = actualLine?.text ?? "";
    const lineNumber = actualLine?.lineNumber ?? expectedLine?.lineNumber ?? index + 1;
    let status: LineStatus = "pending";
    const lineIsComplete = lineNumber < activeLineNumber;

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
      status = isPrefixMatchForLanguage(actual, expected, strictness, language)
        ? "pending"
        : "incorrect";
      if (
        isLineMatchForLanguage(actual, expected, strictness, language) &&
        lineIsComplete
      ) {
        status = "correct";
      }
    } else if (feedbackTiming === "line" || identifierMode === "flexible") {
      if (lineIsComplete) {
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
      lineNumber,
      expected,
      actual,
      status,
    };
  });
};

export const getVisibleMismatchCount = (comparisons: LineComparison[]) => {
  return comparisons.filter((line) => line.status === "incorrect").length;
};
