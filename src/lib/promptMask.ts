import type { PromptMaskConfig } from "../types/exercise";

const keywords = new Set([
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
  "bool",
  "true",
  "false",
  "null",
  "NULL",
  "nullptr",
  "let",
  "const",
  "var",
  "function",
  "class",
  "new",
  "this",
  "import",
  "export",
  "from",
  "def",
  "None",
  "and",
  "or",
  "not",
  "in",
  "is",
  "elif",
  "pass",
]);

const isIdentifierStart = (char: string) => /[A-Za-z_$]/.test(char);
const isIdentifierPart = (char: string) => /[A-Za-z0-9_$]/.test(char);
const isNumberStart = (char: string, nextChar = "") =>
  /\d/.test(char) || (char === "." && /\d/.test(nextChar));

const readQuotedValue = (code: string, start: number, quote: string) => {
  let index = start + 1;

  while (index < code.length) {
    if (code[index] === "\\") {
      index += 2;
      continue;
    }

    if (code[index] === quote) {
      return index + 1;
    }

    index += 1;
  }

  return code.length;
};

const readNumber = (code: string, start: number) => {
  let index = start;

  while (index < code.length && /[A-Za-z0-9_.]/.test(code[index])) {
    index += 1;
  }

  return index;
};

const maskToken = (token: string) => "_".repeat(Math.max(token.length, 3));

export const maskPromptCode = (code: string, config: PromptMaskConfig) => {
  if (!config.hideNames && !config.hideValues) {
    return code;
  }

  let result = "";
  let index = 0;

  while (index < code.length) {
    const char = code[index];
    const nextChar = code[index + 1] ?? "";

    if (char === "/" && nextChar === "/") {
      const end = code.indexOf("\n", index);
      const commentEnd = end === -1 ? code.length : end;
      result += code.slice(index, commentEnd);
      index = commentEnd;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      const end = code.indexOf("*/", index + 2);
      const commentEnd = end === -1 ? code.length : end + 2;
      result += code.slice(index, commentEnd);
      index = commentEnd;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      const end = readQuotedValue(code, index, char);
      const token = code.slice(index, end);
      result += config.hideValues ? maskToken(token) : token;
      index = end;
      continue;
    }

    if (config.hideValues && isNumberStart(char, nextChar)) {
      const end = readNumber(code, index);
      result += maskToken(code.slice(index, end));
      index = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      let end = index + 1;

      while (end < code.length && isIdentifierPart(code[end])) {
        end += 1;
      }

      const token = code.slice(index, end);
      const shouldMask =
        config.hideNames && !keywords.has(token) && !/^_+$/.test(token);

      result += shouldMask ? maskToken(token) : token;
      index = end;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
};
