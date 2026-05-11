import type { Language } from "../types/exercise";

const firstMeaningfulLineSkeleton = (lines: string[]) => {
  const firstMeaningfulLine = lines.find((line) => line.trim().length > 0) ?? "";

  return firstMeaningfulLine ? `${firstMeaningfulLine}\n` : "";
};

const getIndentation = (line: string) => line.match(/^\s*/)?.[0] ?? "";

const isPythonDefLine = (line: string) => {
  const trimmed = line.trim();
  return trimmed.startsWith("def ") || trimmed.startsWith("async def ");
};

const getPythonBodyIndentation = (lines: string[], defLineIndex: number) => {
  const defIndentation = getIndentation(lines[defLineIndex]);
  const bodyLine = lines.slice(defLineIndex + 1).find((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && getIndentation(line).length > defIndentation.length;
  });

  return bodyLine ? getIndentation(bodyLine) : `${defIndentation}    `;
};

const findPythonBlockEnd = (lines: string[], defLineIndex: number) => {
  const defIndentation = getIndentation(lines[defLineIndex]);
  let index = defLineIndex + 1;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (
      trimmed.length > 0 &&
      getIndentation(line).length <= defIndentation.length
    ) {
      break;
    }

    index += 1;
  }

  return index;
};

const generatePythonSkeleton = (lines: string[]) => {
  const output: string[] = [];
  let index = 0;
  let foundFunction = false;

  while (index < lines.length) {
    const line = lines[index];
    const isDecorator = line.trim().startsWith("@");
    let defLineIndex = isPythonDefLine(line) ? index : -1;
    let decoratorStartIndex = index;

    if (isDecorator) {
      let nextIndex = index + 1;

      while (nextIndex < lines.length && lines[nextIndex].trim().startsWith("@")) {
        nextIndex += 1;
      }

      if (nextIndex < lines.length && isPythonDefLine(lines[nextIndex])) {
        defLineIndex = nextIndex;
      }
    }

    if (defLineIndex === -1) {
      output.push(line);
      index += 1;
      continue;
    }

    foundFunction = true;
    const bodyIndentation = getPythonBodyIndentation(lines, defLineIndex);

    output.push(...lines.slice(decoratorStartIndex, defLineIndex + 1));
    output.push(bodyIndentation);
    index = findPythonBlockEnd(lines, defLineIndex);
  }

  if (!foundFunction) {
    return firstMeaningfulLineSkeleton(lines);
  }

  return output.join("\n").replace(/\n+$/g, "\n");
};

const braceControlKeywords = new Set([
  "if",
  "for",
  "while",
  "switch",
  "else",
  "do",
  "try",
  "catch",
]);

const countBraceDelta = (line: string) => {
  let delta = 0;

  for (const char of line) {
    if (char === "{") {
      delta += 1;
    }

    if (char === "}") {
      delta -= 1;
    }
  }

  return delta;
};

const findBraceHeaderEnd = (lines: string[], startIndex: number) => {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim().length === 0) {
      return -1;
    }

    if (line.includes("{")) {
      return index;
    }

    if (line.includes(";")) {
      return -1;
    }
  }

  return -1;
};

const isBraceFunctionHeader = (header: string) => {
  const trimmed = header.trim();
  const firstWord = trimmed.match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0] ?? "";

  return (
    trimmed.includes("(") &&
    trimmed.includes(")") &&
    !braceControlKeywords.has(firstWord)
  );
};

const findBraceBlockEnd = (lines: string[], headerEndIndex: number) => {
  let depth = 0;

  for (let index = headerEndIndex; index < lines.length; index += 1) {
    depth += countBraceDelta(lines[index]);

    if (depth <= 0) {
      return index;
    }
  }

  return headerEndIndex;
};

const buildEmptyBraceHeader = (headerLines: string[]) => {
  const lastLine = headerLines[headerLines.length - 1];
  const braceIndex = lastLine.indexOf("{");

  if (braceIndex === -1) {
    return headerLines;
  }

  return [
    ...headerLines.slice(0, -1),
    lastLine.slice(0, braceIndex + 1).trimEnd(),
  ];
};

const getClosingBraceLine = (line: string) => {
  const indentation = getIndentation(line);
  return `${indentation}}`;
};

const generateBraceSkeleton = (lines: string[]) => {
  const output: string[] = [];
  let index = 0;
  let foundFunction = false;

  while (index < lines.length) {
    const headerEndIndex = findBraceHeaderEnd(lines, index);

    if (headerEndIndex === -1) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    const headerLines = lines.slice(index, headerEndIndex + 1);
    const headerText = headerLines.join("\n");

    if (!isBraceFunctionHeader(headerText)) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    const blockEndIndex = findBraceBlockEnd(lines, headerEndIndex);
    foundFunction = true;

    if (headerLines.length === 1 && blockEndIndex === headerEndIndex) {
      const line = headerLines[0];
      const braceIndex = line.indexOf("{");
      output.push(`${line.slice(0, braceIndex + 1).trimEnd()}`);
      output[output.length - 1] += "}";
      index = blockEndIndex + 1;
      continue;
    }

    output.push(...buildEmptyBraceHeader(headerLines));

    output.push(getClosingBraceLine(lines[blockEndIndex]));

    index = blockEndIndex + 1;
  }

  if (!foundFunction) {
    return firstMeaningfulLineSkeleton(lines);
  }

  return output.join("\n").replace(/\n+$/g, "\n");
};

export const generateSkeleton = (code: string, language: Language = "c") => {
  const normalized = code.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (language === "python") {
    return generatePythonSkeleton(lines);
  }

  return generateBraceSkeleton(lines);
};

export const applySkeletonOptions = (
  skeleton: string,
  language: Language,
  includeImports: boolean,
) => {
  if (includeImports) {
    return skeleton;
  }

  const isImportLine = (line: string) => {
    const trimmed = line.trim();

    if (language === "python") {
      return trimmed.startsWith("import ") || trimmed.startsWith("from ");
    }

    return trimmed.startsWith("#include");
  };

  return skeleton
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !isImportLine(line))
    .join("\n")
    .replace(/^\n+/, "");
};

export const ensureSkeletonMatchesReferenceShell = (
  skeleton: string,
  reference: string,
  language: Language = "c",
) => {
  if (skeleton.trim().length > 0) {
    return skeleton;
  }

  return generateSkeleton(reference, language);
};
