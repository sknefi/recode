import { describe, expect, it } from "vitest";
import { applySkeletonOptions, generateSkeleton } from "./skeleton";

describe("generateSkeleton", () => {
  it("preserves a simple function shell", () => {
    expect(
      generateSkeleton(
        ["int ft_strlen(char *str)", "{", "    int i;", "    return (0);", "}"].join(
          "\n",
        ),
      ),
    ).toBe(["int ft_strlen(char *str)", "{", "}"].join("\n"));
  });

  it("preserves multiple brace-style function shells", () => {
    expect(
      generateSkeleton(
        [
          "#include <unistd.h>",
          "",
          "int add(int a, int b)",
          "{",
          "    return (a + b);",
          "}",
          "",
          "int sub(int a, int b)",
          "{",
          "    return (a - b);",
          "}",
        ].join("\n"),
        "c",
      ),
    ).toBe(
      [
        "#include <unistd.h>",
        "",
        "int add(int a, int b)",
        "{",
        "}",
        "",
        "int sub(int a, int b)",
        "{",
        "}",
      ].join("\n"),
    );
  });

  it("empties one-line brace-style function bodies", () => {
    expect(
      generateSkeleton(
        [
          "void fatal() { write(2, \"Fatal error\\n\", 12); exit(1); }",
          "",
          "int main(void) {",
          "    fatal();",
          "}",
        ].join("\n"),
        "c",
      ),
    ).toBe(["void fatal() {}", "", "int main(void) {", "}"].join("\n"));
  });

  it("keeps one-line C helpers one-line in full-file skeletons", () => {
    expect(
      generateSkeleton(
        [
          "#include <unistd.h>",
          "#include <stdlib.h>",
          "",
          "int maxfd, nid;",
          "struct { int id; char *buf; } cl[65536];",
          "",
          "void fatal() { write(2, \"Fatal error\\n\", 12); exit(1); }",
          "",
          "void send_all(int x) {",
          "    send(x, \"ok\", 2, 0);",
          "}",
          "",
          "int main(int ac, char **av) {",
          "    return (0);",
          "}",
        ].join("\n"),
        "c",
      ),
    ).toBe(
      [
        "#include <unistd.h>",
        "#include <stdlib.h>",
        "",
        "int maxfd, nid;",
        "struct { int id; char *buf; } cl[65536];",
        "",
        "void fatal() {}",
        "",
        "void send_all(int x) {",
        "}",
        "",
        "int main(int ac, char **av) {",
        "}",
      ].join("\n"),
    );
  });

  it("can remove C includes from skeletons", () => {
    expect(
      applySkeletonOptions(
        ["#include <unistd.h>", "", "int main(void) {", "}"].join("\n"),
        "c",
        false,
      ),
    ).toBe("int main(void) {\n}");
  });

  it("can remove Python imports from skeletons", () => {
    expect(
      applySkeletonOptions(
        ["import random", "from constants import *", "", "def main():", "    "].join(
          "\n",
        ),
        "python",
        false,
      ),
    ).toBe("def main():\n    ");
  });

  it("falls back to the first meaningful line when braces are unavailable", () => {
    expect(generateSkeleton("\nSELECT * FROM users;")).toBe("SELECT * FROM users;\n");
  });

  it("generates a Python function skeleton from a def block", () => {
    expect(
      generateSkeleton(
        [
          "def ft_strlen(text):",
          "    i = 0",
          "    while i < len(text):",
          "        i += 1",
          "    return i",
        ].join("\n"),
        "python",
      ),
    ).toBe("def ft_strlen(text):\n    ");
  });

  it("generates Python skeletons for every top-level function", () => {
    expect(
      generateSkeleton(
        [
          "import random",
          "from constants import *",
          "",
          "def evaluate_strategy(ind, opponent_history):",
          "\tlookback = int(2 + ind[1] * 3)",
          "\treturn 0",
          "",
          "def init_genetic_algorithm():",
          "\ttoolbox = base.Toolbox()",
          "\treturn toolbox",
          "",
          "def fk_solution(my_history, opponent_history):",
          "\tif not opponent_history:",
          "\t\treturn 0",
          "\tdef evaluate(ind):",
          "\t\treturn (0,)",
          "\treturn evaluate_strategy([], opponent_history)",
        ].join("\n"),
        "python",
      ),
    ).toBe(
      [
        "import random",
        "from constants import *",
        "",
        "def evaluate_strategy(ind, opponent_history):",
        "\t",
        "def init_genetic_algorithm():",
        "\t",
        "def fk_solution(my_history, opponent_history):",
        "\t",
      ].join("\n"),
    );
  });

  it("preserves Python decorators before the function skeleton", () => {
    expect(
      generateSkeleton(
        ["@staticmethod", "async def build(value):", "    return value"].join("\n"),
        "python",
      ),
    ).toBe("@staticmethod\nasync def build(value):\n    ");
  });
});
