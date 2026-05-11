import type { Language, Strictness } from "../types/exercise";
import { isLineMatch } from "./compare";

type TokenType = "identifier" | "keyword" | "literal" | "symbol";

type Token = {
  type: TokenType;
  value: string;
};

export type IdentifierMapping = {
  expectedToActual: Map<string, string>;
  actualToExpected: Map<string, string>;
};

export const createIdentifierMapping = (): IdentifierMapping => ({
  expectedToActual: new Map<string, string>(),
  actualToExpected: new Map<string, string>(),
});

const cloneIdentifierMapping = (mapping: IdentifierMapping): IdentifierMapping => ({
  expectedToActual: new Map(mapping.expectedToActual),
  actualToExpected: new Map(mapping.actualToExpected),
});

const commitIdentifierMapping = (
  target: IdentifierMapping,
  source: IdentifierMapping,
) => {
  target.expectedToActual = new Map(source.expectedToActual);
  target.actualToExpected = new Map(source.actualToExpected);
};

const cKeywords = new Set([
  "auto",
  "break",
  "case",
  "char",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extern",
  "float",
  "for",
  "goto",
  "if",
  "inline",
  "int",
  "long",
  "register",
  "restrict",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "struct",
  "switch",
  "typedef",
  "union",
  "unsigned",
  "void",
  "volatile",
  "while",
]);

const cDeclarationKeywords = new Set([
  "char",
  "const",
  "double",
  "enum",
  "float",
  "int",
  "long",
  "short",
  "signed",
  "static",
  "struct",
  "typedef",
  "union",
  "unsigned",
  "void",
  "volatile",
]);

const pythonKeywords = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const isIdentifierStart = (char: string) => /[A-Za-z_$]/.test(char);
const isIdentifierPart = (char: string) => /[A-Za-z0-9_$]/.test(char);
const isNumberStart = (char: string, nextChar = "") =>
  /\d/.test(char) || (char === "." && /\d/.test(nextChar));

const keywordsForLanguage = (language: Language) =>
  language === "python" ? pythonKeywords : cKeywords;

const readQuotedLiteral = (line: string, start: number) => {
  const quote = line[start];
  let index = start + 1;

  while (index < line.length) {
    if (line[index] === "\\") {
      index += 2;
      continue;
    }

    if (line[index] === quote) {
      return index + 1;
    }

    index += 1;
  }

  return line.length;
};

const readNumber = (line: string, start: number) => {
  let index = start;

  while (index < line.length && /[A-Za-z0-9_.]/.test(line[index])) {
    index += 1;
  }

  return index;
};

export const tokenizeForIdentifierCompare = (
  line: string,
  language: Language,
): Token[] => {
  const keywords = keywordsForLanguage(language);
  const tokens: Token[] = [];
  let index = 0;

  while (index < line.length) {
    const char = line[index];
    const nextChar = line[index + 1] ?? "";

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      const end = readQuotedLiteral(line, index);
      tokens.push({ type: "literal", value: line.slice(index, end) });
      index = end;
      continue;
    }

    if (isNumberStart(char, nextChar)) {
      const end = readNumber(line, index);
      tokens.push({ type: "literal", value: line.slice(index, end) });
      index = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      let end = index + 1;

      while (end < line.length && isIdentifierPart(line[end])) {
        end += 1;
      }

      const value = line.slice(index, end);
      tokens.push({
        type: keywords.has(value) ? "keyword" : "identifier",
        value,
      });
      index = end;
      continue;
    }

    const twoCharSymbol = line.slice(index, index + 2);

    if (
      [
        "==",
        "!=",
        "<=",
        ">=",
        "++",
        "--",
        "->",
        "+=",
        "-=",
        "*=",
        "/=",
        "%=",
        "&&",
        "||",
        "<<",
        ">>",
        "::",
      ].includes(twoCharSymbol)
    ) {
      tokens.push({ type: "symbol", value: twoCharSymbol });
      index += 2;
      continue;
    }

    tokens.push({ type: "symbol", value: char });
    index += 1;
  }

  return tokens;
};

const tokensHaveComparableShape = (
  actualTokens: Token[],
  expectedTokens: Token[],
  strictness: Strictness,
) => {
  if (expectedTokens.length !== actualTokens.length) {
    return false;
  }

  return expectedTokens.every((expectedToken, index) => {
    const actualToken = actualTokens[index];

    if (expectedToken.type !== actualToken.type) {
      return false;
    }

    if (expectedToken.type === "identifier") {
      return true;
    }

    return isLineMatch(actualToken.value, expectedToken.value, strictness);
  });
};

const pythonDefinitionIndexes = (tokens: Token[]) => {
  const indexes = new Set<number>();
  const assignmentIndex = tokens.findIndex(
    (token) => token.type === "symbol" && token.value === "=",
  );

  if (tokens[0]?.value === "def" && tokens[1]?.type === "identifier") {
    indexes.add(1);
  }

  if (tokens[0]?.value === "for") {
    const inIndex = tokens.findIndex((token) => token.value === "in");

    for (let index = 1; index < inIndex; index += 1) {
      if (tokens[index]?.type === "identifier") {
        indexes.add(index);
      }
    }
  }

  if (assignmentIndex > 0) {
    for (let index = 0; index < assignmentIndex; index += 1) {
      const previousToken = tokens[index - 1];

      if (
        tokens[index].type === "identifier" &&
        previousToken?.value !== "."
      ) {
        indexes.add(index);
      }
    }
  }

  return indexes;
};

const cDefinitionIndexes = (tokens: Token[]) => {
  const indexes = new Set<number>();

  if (
    tokens[0]?.type !== "keyword" ||
    !cDeclarationKeywords.has(tokens[0].value)
  ) {
    return indexes;
  }

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previousToken = tokens[index - 1];

    if (token.type === "symbol" && token.value === "=") {
      break;
    }

    if (
      token.type === "identifier" &&
      previousToken?.value !== "." &&
      !cDeclarationKeywords.has(token.value)
    ) {
      indexes.add(index);
    }
  }

  return indexes;
};

const definitionIndexesForLanguage = (tokens: Token[], language: Language) =>
  language === "python" ? pythonDefinitionIndexes(tokens) : cDefinitionIndexes(tokens);

export const hasRenamedIdentifierConflict = (
  actual: string,
  expected: string,
  strictness: Strictness,
  language: Language,
  mapping: IdentifierMapping,
) => {
  const expectedTokens = tokenizeForIdentifierCompare(expected, language);
  const actualTokens = tokenizeForIdentifierCompare(actual, language);

  if (!tokensHaveComparableShape(actualTokens, expectedTokens, strictness)) {
    return false;
  }

  return expectedTokens.some((expectedToken, index) => {
    const actualToken = actualTokens[index];

    if (
      expectedToken.type !== "identifier" ||
      actualToken.type !== "identifier"
    ) {
      return false;
    }

    const expectedActual = mapping.expectedToActual.get(expectedToken.value);
    const actualExpected = mapping.actualToExpected.get(actualToken.value);

    return (
      (expectedActual !== undefined &&
        expectedActual !== expectedToken.value &&
        actualToken.value === expectedToken.value) ||
      (actualExpected !== undefined && actualExpected !== expectedToken.value)
    );
  });
};

export const learnDefinitionIdentifierMappings = (
  actual: string,
  expected: string,
  strictness: Strictness,
  language: Language,
  mapping: IdentifierMapping,
) => {
  const workingMapping = cloneIdentifierMapping(mapping);
  const expectedTokens = tokenizeForIdentifierCompare(expected, language);
  const actualTokens = tokenizeForIdentifierCompare(actual, language);

  if (!tokensHaveComparableShape(actualTokens, expectedTokens, strictness)) {
    return false;
  }

  const definitionIndexes = definitionIndexesForLanguage(expectedTokens, language);

  for (const index of definitionIndexes) {
    const expectedToken = expectedTokens[index];
    const actualToken = actualTokens[index];

    if (
      expectedToken?.type !== "identifier" ||
      actualToken?.type !== "identifier"
    ) {
      return false;
    }

    const existingActual = workingMapping.expectedToActual.get(expectedToken.value);
    const existingExpected = workingMapping.actualToExpected.get(actualToken.value);

    if (existingActual && existingActual !== actualToken.value) {
      return false;
    }

    if (existingExpected && existingExpected !== expectedToken.value) {
      return false;
    }

    workingMapping.expectedToActual.set(expectedToken.value, actualToken.value);
    workingMapping.actualToExpected.set(actualToken.value, expectedToken.value);
  }

  commitIdentifierMapping(mapping, workingMapping);
  return true;
};

export const isFlexibleIdentifierLineMatch = (
  actual: string,
  expected: string,
  strictness: Strictness,
  language: Language,
  mapping: IdentifierMapping = createIdentifierMapping(),
) => {
  const workingMapping = cloneIdentifierMapping(mapping);
  const expectedTokens = tokenizeForIdentifierCompare(expected, language);
  const actualTokens = tokenizeForIdentifierCompare(actual, language);

  if (expectedTokens.length !== actualTokens.length) {
    return false;
  }

  for (let index = 0; index < expectedTokens.length; index += 1) {
    const expectedToken = expectedTokens[index];
    const actualToken = actualTokens[index];

    if (expectedToken.type !== actualToken.type) {
      return false;
    }

    if (expectedToken.type !== "identifier") {
      if (!isLineMatch(actualToken.value, expectedToken.value, strictness)) {
        return false;
      }

      continue;
    }

    const existingActual = workingMapping.expectedToActual.get(expectedToken.value);
    const existingExpected = workingMapping.actualToExpected.get(actualToken.value);

    if (existingActual && existingActual !== actualToken.value) {
      return false;
    }

    if (existingExpected && existingExpected !== expectedToken.value) {
      return false;
    }

    if (
      !existingActual &&
      workingMapping.expectedToActual.has(actualToken.value) &&
      actualToken.value !== expectedToken.value
    ) {
      return false;
    }

    workingMapping.expectedToActual.set(expectedToken.value, actualToken.value);
    workingMapping.actualToExpected.set(actualToken.value, expectedToken.value);
  }

  commitIdentifierMapping(mapping, workingMapping);
  return true;
};
