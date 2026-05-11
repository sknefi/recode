import { describe, expect, it } from "vitest";
import { generateMissingPieces } from "./missingPieces";
import type { MissingPiecesConfig } from "../types/exercise";

const baseConfig: MissingPiecesConfig = {
  strategy: "pattern",
  patterns: ["while", "return"],
  everyNth: 3,
  manualLines: "",
};

describe("generateMissingPieces", () => {
  it("blanks pattern lines while preserving indentation", () => {
    const result = generateMissingPieces(
      ["int main(void)", "{", "    while (1)", "        return (0);", "}"].join("\n"),
      baseConfig,
    );

    expect(result.blankedLines).toEqual([3, 4]);
    expect(result.template).toContain("    ____");
  });

  it("supports manual line selection and ranges", () => {
    const result = generateMissingPieces("a\nb\nc\nd", {
      ...baseConfig,
      strategy: "manual",
      manualLines: "2, 4-5",
    });

    expect(result.blankedLines).toEqual([2, 4]);
    expect(result.template).toBe("a\n____\nc\n____");
  });

  it("supports every nth content line", () => {
    const result = generateMissingPieces("a\n{\nb\n\nc\nd\n}", {
      ...baseConfig,
      strategy: "every-nth",
      everyNth: 2,
    });

    expect(result.blankedLines).toEqual([3, 6]);
  });

  it("supports Python control-flow pattern lines", () => {
    const result = generateMissingPieces(
      [
        "def classify(value):",
        "    if value == 0:",
        "        return 'zero'",
        "    elif value > 0:",
        "        return 'positive'",
        "    else:",
        "        return 'negative'",
      ].join("\n"),
      {
        ...baseConfig,
        patterns: ["if", "elif", "else", "return"],
      },
    );

    expect(result.blankedLines).toEqual([2, 3, 4, 5, 6, 7]);
    expect(result.template).toContain("    ____");
  });

  it("supports C include pattern lines", () => {
    const result = generateMissingPieces("#include <unistd.h>\nint main(void) {}", {
      ...baseConfig,
      patterns: ["include"],
    });

    expect(result.blankedLines).toEqual([1]);
    expect(result.template).toBe("____\nint main(void) {}");
  });

  it("supports Python import pattern lines", () => {
    const result = generateMissingPieces("import random\nfrom os import path\ndef main():", {
      ...baseConfig,
      patterns: ["import"],
    });

    expect(result.blankedLines).toEqual([1, 2]);
    expect(result.template).toBe("____\n____\ndef main():");
  });
});
