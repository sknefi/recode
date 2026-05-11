import { describe, expect, it } from "vitest";
import { maskPromptCode } from "./promptMask";

describe("maskPromptCode", () => {
  it("hides variable and function names while keeping keywords", () => {
    expect(
      maskPromptCode("int ft_strlen(char *str)\n{\n    return (str[0]);\n}", {
        hideNames: true,
        hideValues: false,
      }),
    ).toBe("int _________(char *___)\n{\n    return (___[0]);\n}");
  });

  it("hides string, char, and number values", () => {
    expect(
      maskPromptCode("i = 0;\nwhile (str[i] != '\\0')\nname = \"42\";", {
        hideNames: false,
        hideValues: true,
      }),
    ).toBe("i = ___;\nwhile (str[i] != ____)\nname = ____;");
  });

  it("does not mask comments", () => {
    expect(
      maskPromptCode("// ft_strlen uses str\nint value = 42;", {
        hideNames: true,
        hideValues: true,
      }),
    ).toBe("// ft_strlen uses str\nint _____ = ___;");
  });

  it("returns the original code when masks are disabled", () => {
    expect(
      maskPromptCode("int value = 42;", {
        hideNames: false,
        hideValues: false,
      }),
    ).toBe("int value = 42;");
  });
});
