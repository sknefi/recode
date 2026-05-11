import type { CommentBehavior, Language } from "../types/exercise";

const stripCLine = (line: string, inBlockComment: boolean) => {
  let result = "";
  let index = 0;
  let blockOpen = inBlockComment;

  while (index < line.length) {
    const char = line[index];
    const nextChar = line[index + 1] ?? "";

    if (blockOpen) {
      if (char === "*" && nextChar === "/") {
        blockOpen = false;
        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      const quote = char;
      result += char;
      index += 1;

      while (index < line.length) {
        result += line[index];

        if (line[index] === "\\") {
          index += 1;

          if (index < line.length) {
            result += line[index];
          }
        } else if (line[index] === quote) {
          index += 1;
          break;
        }

        index += 1;
      }

      continue;
    }

    if (char === "/" && nextChar === "/") {
      break;
    }

    if (char === "/" && nextChar === "*") {
      blockOpen = true;
      index += 2;
      continue;
    }

    result += char;
    index += 1;
  }

  return {
    line: result.trimEnd(),
    inBlockComment: blockOpen,
  };
};

const hasCCommentMarker = (line: string, inBlockComment: boolean) => {
  let index = 0;
  let blockOpen = inBlockComment;
  let found = blockOpen;

  while (index < line.length) {
    const char = line[index];
    const nextChar = line[index + 1] ?? "";

    if (blockOpen) {
      if (char === "*" && nextChar === "/") {
        blockOpen = false;
        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      const quote = char;
      index += 1;

      while (index < line.length) {
        if (line[index] === "\\") {
          index += 2;
          continue;
        }

        if (line[index] === quote) {
          index += 1;
          break;
        }

        index += 1;
      }

      continue;
    }

    if (char === "/" && (nextChar === "/" || nextChar === "*")) {
      found = true;
    }

    if (char === "/" && nextChar === "*") {
      blockOpen = true;
      index += 2;
      continue;
    }

    index += 1;
  }

  return found;
};

const stripPythonLine = (line: string) => {
  let result = "";
  let index = 0;

  while (index < line.length) {
    const char = line[index];

    if (char === "'" || char === '"') {
      const quote = char;
      result += char;
      index += 1;

      while (index < line.length) {
        result += line[index];

        if (line[index] === "\\") {
          index += 1;

          if (index < line.length) {
            result += line[index];
          }
        } else if (line[index] === quote) {
          index += 1;
          break;
        }

        index += 1;
      }

      continue;
    }

    if (char === "#") {
      break;
    }

    result += char;
    index += 1;
  }

  return result.trimEnd();
};

const hasPythonCommentMarker = (line: string) => stripPythonLine(line) !== line.trimEnd();

export const hasComments = (code: string, language: Language) => {
  const lines = code.replace(/\r\n/g, "\n").split("\n");

  if (language === "python") {
    return lines.some(hasPythonCommentMarker);
  }

  let inBlockComment = false;

  return lines.some((line) => {
    const hasComment = hasCCommentMarker(line, inBlockComment);
    const stripped = stripCLine(line, inBlockComment);
    inBlockComment = stripped.inBlockComment;
    return hasComment;
  });
};

const stripEmptyCommentLines = (lines: Array<{ line: string; hadComment: boolean }>) =>
  lines
    .filter(({ line, hadComment }) => !(hadComment && line.trim().length === 0))
    .map(({ line }) => line)
    .join("\n");

export const stripComments = (
  code: string,
  language: Language,
  removeEmptyCommentLines = false,
) => {
  const lines = code.replace(/\r\n/g, "\n").split("\n");

  if (language === "python") {
    const strippedLines = lines.map((line) => ({
      line: stripPythonLine(line),
      hadComment: hasPythonCommentMarker(line),
    }));

    return removeEmptyCommentLines
      ? stripEmptyCommentLines(strippedLines)
      : strippedLines.map(({ line }) => line).join("\n");
  }

  let inBlockComment = false;
  let markerBlockComment = false;

  const strippedLines = lines.map((line) => {
    const hadComment = hasCCommentMarker(line, markerBlockComment);
    const markerState = stripCLine(line, markerBlockComment);
    markerBlockComment = markerState.inBlockComment;

    const stripped = stripCLine(line, inBlockComment);
    inBlockComment = stripped.inBlockComment;

    return {
      line: stripped.line,
      hadComment,
    };
  });

  return removeEmptyCommentLines
    ? stripEmptyCommentLines(strippedLines)
    : strippedLines.map(({ line }) => line).join("\n");
};

export const applyCommentBehavior = (
  code: string,
  language: Language,
  behavior: CommentBehavior,
) => {
  if (behavior === "require") {
    return code;
  }

  return stripComments(code, language, true);
};
