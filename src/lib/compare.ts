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

type MappingScope = {
  indent: number;
  braceDepth: number;
  mapping: IdentifierMapping;
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

const normalizeIndentEquivalentLine = (line: string) => {
  const { indent, body } = splitIndent(line);

  return `${expandIndentTabs(indent)}${body}`;
};

const normalizePythonLine = (line: string, strictness: Strictness) => {
  const normalizedIndentLine = normalizeIndentEquivalentLine(line);

  if (strictness === "strict") {
    return normalizedIndentLine;
  }

  const { indent, body } = splitIndent(normalizedIndentLine);

  return `${indent}${body.replace(/[ \t]/g, "")}`;
};

export const normalizeLine = (line: string, strictness: Strictness) => {
  const normalizedIndentLine = normalizeIndentEquivalentLine(line);

  if (strictness === "strict") {
    return normalizedIndentLine;
  }

  return normalizedIndentLine.replace(/[ \t]/g, "");
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

const cloneIdentifierMapping = (mapping: IdentifierMapping): IdentifierMapping => ({
  expectedToActual: new Map(mapping.expectedToActual),
  actualToExpected: new Map(mapping.actualToExpected),
});

const pythonIndentLevel = (line: string) =>
  expandIndentTabs(splitIndent(line).indent).length;

const isPythonFunctionDefinition = (line: string) =>
  /^\s*def\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(line);

const countCBraces = (line: string) => {
  let open = 0;
  let close = 0;
  let quote: string | null = null;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "{") {
      open += 1;
    } else if (char === "}") {
      close += 1;
    }
  }

  return { open, close };
};

const countLeadingCClosures = (line: string) => {
  const trimmedStart = line.trimStart();
  let count = 0;

  while (trimmedStart[count] === "}") {
    count += 1;
  }

  return count;
};

const createMappingTracker = (language: Language) => {
  const globalMapping = createIdentifierMapping();
  const scopes: MappingScope[] = [
    { indent: -1, braceDepth: 0, mapping: globalMapping },
  ];
  let cBraceDepth = 0;

  return (line: string) => {
    if (language === "c") {
      const { open, close } = countCBraces(line);
      const leadingClose = Math.min(countLeadingCClosures(line), close);

      for (let index = 0; index < leadingClose; index += 1) {
        cBraceDepth = Math.max(cBraceDepth - 1, 0);

        while (
          scopes.length > 1 &&
          cBraceDepth < scopes[scopes.length - 1].braceDepth
        ) {
          scopes.pop();
        }
      }

      const persistentOpenScopes = Math.max(open - (close - leadingClose), 0);

      for (let index = 0; index < persistentOpenScopes; index += 1) {
        const parentMapping = scopes[scopes.length - 1].mapping;
        cBraceDepth += 1;
        scopes.push({
          indent: -1,
          braceDepth: cBraceDepth,
          mapping: cloneIdentifierMapping(parentMapping),
        });
      }

      return scopes[scopes.length - 1].mapping;
    }

    if (language !== "python") {
      return scopes[0].mapping;
    }

    if (line.trim().length === 0) {
      return scopes[scopes.length - 1].mapping;
    }

    const indent = pythonIndentLevel(line);

    while (scopes.length > 1 && indent <= scopes[scopes.length - 1].indent) {
      scopes.pop();
    }

    if (isPythonFunctionDefinition(line)) {
      const parentMapping = scopes[scopes.length - 1].mapping;
      const functionMapping = cloneIdentifierMapping(parentMapping);
      scopes.push({ indent, braceDepth: 0, mapping: functionMapping });
      return functionMapping;
    }

    return scopes[scopes.length - 1].mapping;
  };
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

export const getReferenceHighlightLine = (
  expectedText: string,
  actualText: string,
  strictness: Strictness,
  language: Language,
  commentBehavior: CommentBehavior,
  activeLineNumber: number,
) => {
  if (strictness !== "whitespace-tolerant") {
    return activeLineNumber;
  }

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

  if (language === "c") {
    const actualLines = splitLines(actualComparableText);
    const actualTextBeforeActiveLine = actualLines
      .slice(0, Math.max(activeLineNumber - 1, 0))
      .join("\n");
    const normalizedExpected = normalizeText(
      expectedComparableText,
      strictness,
      language,
    );
    const normalizedActualBeforeActiveLine = normalizeText(
      actualTextBeforeActiveLine,
      strictness,
      language,
    );

    if (normalizedExpected.length === 0) {
      return 1;
    }

    const mismatchIndex = firstMismatchIndex(
      normalizedActualBeforeActiveLine,
      normalizedExpected,
    );
    const nextOffset =
      mismatchIndex >= 0
        ? mismatchIndex
        : Math.min(normalizedActualBeforeActiveLine.length, normalizedExpected.length - 1);
    const expectedLines = splitLines(expectedComparableText);
    const fallbackLineIndex = Math.max(expectedLines.length - 1, 0);

    return lineIndexForNormalizedOffset(
      expectedComparableText,
      nextOffset,
      fallbackLineIndex,
    ) + 1;
  }

  if (language === "python") {
    const expectedLines = buildComparableLines(
      expectedComparableText,
      strictness,
      language,
    );
    const actualLines = splitLines(actualComparableText);
    const activeLineIndex = Math.max(
      Math.min(activeLineNumber - 1, actualLines.length - 1),
      0,
    );
    const activeLine = actualLines[activeLineIndex] ?? "";
    const nonEmptyLinesThroughActive = actualLines
      .slice(0, activeLineIndex + 1)
      .filter((line) => line.trim().length > 0).length;
    const expectedLineIndex =
      activeLine.trim().length === 0
        ? nonEmptyLinesThroughActive
        : Math.max(nonEmptyLinesThroughActive - 1, 0);

    return (
      expectedLines[
        Math.min(Math.max(expectedLineIndex, 0), Math.max(expectedLines.length - 1, 0))
      ]?.lineNumber ?? activeLineNumber
    );
  }

  return activeLineNumber;
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
  const mappingForLine = createMappingTracker(language);

  return Array.from({ length: maxLineCount }, (_, index) => {
    const expected = expectedLines[index]?.text ?? "";
    const actual = actualLines[index]?.text ?? "";
    const identifierMapping = mappingForLine(expected);
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
  const mappingForLine = createMappingTracker(language);

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

    if (!stillPossible && feedbackTiming === "line") {
      const firstErrorLineNumber = errorLineIndex + 1;

      return compareAttempt(
        expectedText,
        actualText,
        strictness,
        language,
        commentBehavior,
        identifierMode,
      ).lineComparisons.map((line) => {
        if (line.lineNumber >= activeLineNumber) {
          return {
            ...line,
            status: "pending",
          };
        }

        if (line.lineNumber < firstErrorLineNumber && line.status === "incorrect") {
          return {
            ...line,
            status: "correct",
          };
        }

        return line;
      });
    }

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
    const identifierMapping = mappingForLine(expected);

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
