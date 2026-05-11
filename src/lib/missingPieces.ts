import type { MissingPiecesConfig } from "../types/exercise";

export type MissingPiecesResult = {
  template: string;
  blankedLines: number[];
};

const parseManualLines = (value: string) => {
  const selected = new Set<number>();

  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [startRaw, endRaw] = part.split("-").map((entry) => Number(entry.trim()));

      if (!Number.isInteger(startRaw) || startRaw < 1) {
        return;
      }

      if (!endRaw) {
        selected.add(startRaw);
        return;
      }

      if (!Number.isInteger(endRaw) || endRaw < startRaw) {
        return;
      }

      for (let line = startRaw; line <= endRaw; line += 1) {
        selected.add(line);
      }
    });

  return selected;
};

const shouldHidePatternLine = (line: string, config: MissingPiecesConfig) => {
  const trimmed = line.trim();

  return config.patterns.some((pattern) => {
    if (["return", "else", "try"].includes(pattern)) {
      return trimmed === pattern || trimmed.startsWith(`${pattern} `) || trimmed.startsWith(`${pattern}:`);
    }

    if (pattern === "except") {
      return trimmed === "except" || trimmed.startsWith("except ") || trimmed.startsWith("except:");
    }

    if (pattern === "def") {
      return trimmed.startsWith("def ") || trimmed.startsWith("async def ");
    }

    if (pattern === "include") {
      return trimmed.startsWith("#include");
    }

    if (pattern === "import") {
      return trimmed.startsWith("import ") || trimmed.startsWith("from ");
    }

    return trimmed.startsWith(`${pattern} `) || trimmed.startsWith(`${pattern}(`);
  });
};

const createBlankLine = (line: string) => {
  const indentation = line.match(/^\s*/)?.[0] ?? "";
  return `${indentation}____`;
};

export const generateMissingPieces = (
  code: string,
  config: MissingPiecesConfig,
): MissingPiecesResult => {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const manualLines = parseManualLines(config.manualLines);
  let visibleContentLineCount = 0;

  const blankedLines: number[] = [];
  const templateLines = lines.map((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    const isBlankOrBraceOnly = trimmed === "" || trimmed === "{" || trimmed === "}";
    let shouldHide = false;

    if (config.strategy === "manual") {
      shouldHide = manualLines.has(lineNumber);
    }

    if (config.strategy === "pattern") {
      shouldHide = shouldHidePatternLine(line, config);
    }

    if (config.strategy === "every-nth" && !isBlankOrBraceOnly) {
      visibleContentLineCount += 1;
      shouldHide = visibleContentLineCount % Math.max(config.everyNth, 2) === 0;
    }

    if (!shouldHide || isBlankOrBraceOnly) {
      return line;
    }

    blankedLines.push(lineNumber);
    return createBlankLine(line);
  });

  return {
    template: templateLines.join("\n"),
    blankedLines,
  };
};
