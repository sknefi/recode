import type { Language } from "../types/exercise";

export const detectLanguage = (code: string): Language | null => {
  const trimmed = code.trim();

  if (!trimmed) {
    return null;
  }

  let cScore = 0;
  let pythonScore = 0;

  if (/^\s*#include\s*[<"]/m.test(code)) cScore += 5;
  if (/\bint\s+main\s*\(/.test(code)) cScore += 4;
  if (/\b(char|int|void|struct|fd_set|size_t)\b/.test(code)) cScore += 2;
  if (/[{};]/.test(code)) cScore += 2;
  if (/\bprintf\s*\(|\bsprintf\s*\(|\bmalloc\s*\(|\bfree\s*\(/.test(code)) {
    cScore += 2;
  }

  if (/^\s*(import|from)\s+\w+/m.test(code)) pythonScore += 5;
  if (/^\s*def\s+\w+\s*\([^)]*\)\s*:/m.test(code)) pythonScore += 5;
  if (/^\s*(if|for|while|elif|else|try|except|with)\b.*:\s*$/m.test(code)) {
    pythonScore += 2;
  }
  if (/\bNone\b|\bTrue\b|\bFalse\b/.test(code)) pythonScore += 1;
  if (/\bprint\s*\(/.test(code)) pythonScore += 1;

  if (cScore >= pythonScore + 2) {
    return "c";
  }

  if (pythonScore >= cScore + 2) {
    return "python";
  }

  return null;
};
