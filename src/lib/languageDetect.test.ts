import { describe, expect, it } from "vitest";
import { detectLanguage } from "./languageDetect";

describe("detectLanguage", () => {
  it("detects C code", () => {
    expect(
      detectLanguage(
        [
          "#include <unistd.h>",
          "",
          "int main(int ac, char **av) {",
          "    return (0);",
          "}",
        ].join("\n"),
      ),
    ).toBe("c");
  });

  it("detects Python code", () => {
    expect(
      detectLanguage(
        [
          "import random",
          "from constants import *",
          "",
          "def evaluate(ind):",
          "    return ind[0]",
        ].join("\n"),
      ),
    ).toBe("python");
  });

  it("returns null for ambiguous snippets", () => {
    expect(detectLanguage("return value")).toBeNull();
    expect(detectLanguage("")).toBeNull();
  });
});
