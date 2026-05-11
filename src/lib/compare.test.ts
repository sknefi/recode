import { describe, expect, it } from "vitest";
import {
  compareAttempt,
  getLineStatuses,
  isLineMatch,
  isPrefixMatch,
} from "./compare";

describe("compare", () => {
  it("matches exact lines in strict mode", () => {
    expect(isLineMatch("return (i);", "return (i);", "strict")).toBe(true);
    expect(isLineMatch("return(i);", "return (i);", "strict")).toBe(false);
  });

  it("ignores spaces and tabs in whitespace tolerant mode", () => {
    expect(isLineMatch("while(str[i])", "while (str[i])", "whitespace-tolerant")).toBe(
      true,
    );
    expect(isLineMatch("\treturn(i);", "return (i);", "whitespace-tolerant")).toBe(
      true,
    );
  });

  it("ignores C newlines in whitespace tolerant mode", () => {
    const comparison = compareAttempt("a\nb", "ab", "whitespace-tolerant", "c", "require");

    expect(comparison.completed).toBe(true);
    expect(comparison.mismatchCount).toBe(0);
  });

  it("keeps Python newlines meaningful in whitespace tolerant mode", () => {
    const comparison = compareAttempt(
      "value = 1\nreturn value",
      "value = 1 return value",
      "whitespace-tolerant",
      "python",
      "require",
    );

    expect(comparison.completed).toBe(false);
    expect(comparison.mismatchCount).toBe(2);
  });

  it("ignores all C whitespace in whitespace tolerant mode", () => {
    const comparison = compareAttempt(
      ["int main(void)", "{", "\treturn (0);", "}"].join("\n"),
      "intmain(void){return(0);}",
      "whitespace-tolerant",
      "c",
      "require",
    );

    expect(comparison.completed).toBe(true);
  });

  it("uses normalized C prefix feedback in whitespace tolerant mode", () => {
    const statuses = getLineStatuses(
      ["int main(void)", "{", "    return (0);", "}"].join("\n"),
      "int main(void) { return",
      "whitespace-tolerant",
      "instant",
      false,
      "c",
      "require",
    );

    expect(statuses.some((line) => line.status === "incorrect")).toBe(false);
  });

  it("marks the first mismatched C line in whitespace tolerant line feedback", () => {
    const statuses = getLineStatuses(
      [
        "#include <unistd.h>",
        "",
        "void fatal() { write(2, \"Fatal error\\n\", 12); exit(1); }",
        "",
        "int main(int ac, char **av) {",
        "    if (ac != 2) fatal();",
        "    return (0);",
        "}",
      ].join("\n"),
      [
        "#include <unistd.h>",
        "",
        "void fatal() { write(2, \"Fatal error\\n\", 12); exit(1); }",
        "",
        "int main(int a, char **av) {",
        "    if (ac != 2) fatal();",
        "    return (0);",
        "}",
        "",
      ].join("\n"),
      "whitespace-tolerant",
      "line",
      false,
      "c",
      "require",
      "exact",
    );

    expect(statuses[4].status).toBe("incorrect");
    expect(statuses[7].status).not.toBe("incorrect");
  });

  it("supports prefix checks for instant feedback", () => {
    expect(isPrefixMatch("ret", "return (i);", "strict")).toBe(true);
    expect(isPrefixMatch("rex", "return (i);", "strict")).toBe(false);
  });

  it("does not show line-check errors for the active line before submit", () => {
    const statuses = getLineStatuses(
      "a\nb",
      "a\nx",
      "strict",
      "line",
      false,
      "c",
      "require",
    );

    expect(statuses[0].status).toBe("correct");
    expect(statuses[1].status).toBe("pending");
  });

  it("can ignore C comments during comparison", () => {
    const comparison = compareAttempt(
      "int i; // reference note\nreturn (i);",
      "int i;\nreturn (i); // user note",
      "strict",
      "c",
      "ignore",
    );

    expect(comparison.completed).toBe(true);
  });

  it("can ignore Python comments during comparison", () => {
    const comparison = compareAttempt(
      "value = 42 # reference note\nreturn value",
      "value = 42\nreturn value # user note",
      "strict",
      "python",
      "ignore",
    );

    expect(comparison.completed).toBe(true);
  });

  it("does not cascade errors when ignored Python comment lines are skipped", () => {
    const comparison = compareAttempt(
      [
        "toolbox.register(\"select\", tools.selTournament)",
        "",
        "# Create and evolve population",
        "pop = toolbox.population(n=POP_SIZE)",
        "algorithms.eaSimple(pop, toolbox)",
        "",
        "# Get best strategy",
        "best = tools.selBest(pop, k=1)[0]",
      ].join("\n"),
      [
        "toolbox.register(\"select\", tools.selTournament)",
        "",
        "pop = toolbox.population(n=POP_SIZE)",
        "algorithms.eaSimple(pop, toolbox)",
        "",
        "best = tools.selBest(pop, k=1)[0]",
      ].join("\n"),
      "strict",
      "python",
      "ignore",
    );

    expect(comparison.completed).toBe(true);
  });

  it("requires Python comment lines when comments are required", () => {
    const comparison = compareAttempt(
      "# Create and evolve population\npop = toolbox.population(n=POP_SIZE)",
      "pop = toolbox.population(n=POP_SIZE)",
      "strict",
      "python",
      "require",
    );

    expect(comparison.completed).toBe(false);
  });

  it("allows consistent C identifier renaming in flexible names mode", () => {
    const comparison = compareAttempt(
      ["int i;", "i = 0;", "return (i);"].join("\n"),
      ["int index;", "index = 0;", "return (index);"].join("\n"),
      "whitespace-tolerant",
      "c",
      "require",
      "flexible",
    );

    expect(comparison.completed).toBe(true);
  });

  it("rejects inconsistent C identifier renaming in flexible names mode", () => {
    const comparison = compareAttempt(
      ["int i;", "i = 0;", "return (i);"].join("\n"),
      ["int index;", "count = 0;", "return (index);"].join("\n"),
      "whitespace-tolerant",
      "c",
      "require",
      "flexible",
    );

    expect(comparison.completed).toBe(false);
    expect(comparison.mismatchCount).toBe(1);
  });

  it("rejects use of the original C identifier after it was renamed", () => {
    const comparison = compareAttempt(
      ["int i;", "i = 0;", "return (i);"].join("\n"),
      ["int a;", "i = 0;", "return (i);"].join("\n"),
      "whitespace-tolerant",
      "c",
      "require",
      "flexible",
    );

    expect(comparison.completed).toBe(false);
  });

  it("flags every later C line that uses the original identifier after a rename", () => {
    const comparison = compareAttempt(
      [
        "int ft_strlen(char *str)",
        "{",
        "    int i;",
        "",
        "    i = 0;",
        "    while (str[i] != '\\0')",
        "        i++;",
        "    return (i);",
        "}",
      ].join("\n"),
      [
        "int ft_strlen(char *str)",
        "{",
        "    int a;",
        "",
        "    a = 0;",
        "    while (str[i] != '\\0')",
        "        i++;",
        "    return (i);",
        "}",
      ].join("\n"),
      "whitespace-tolerant",
      "c",
      "require",
      "flexible",
    );

    expect(comparison.lineComparisons[5].status).toBe("incorrect");
    expect(comparison.lineComparisons[6].status).toBe("incorrect");
    expect(comparison.lineComparisons[7].status).toBe("incorrect");
    expect(comparison.mismatchCount).toBe(3);
  });

  it("carries flexible C identifier mappings through live line feedback", () => {
    const statuses = getLineStatuses(
      [
        "int ft_strlen(char *str)",
        "{",
        "    int i;",
        "",
        "    i = 0;",
        "    while (str[i] != '\\0')",
        "        i++;",
        "    return (i);",
        "}",
      ].join("\n"),
      [
        "int ft_strlen(char *str)",
        "{",
        "    int a;",
        "",
        "    a = 0;",
        "    while (str[i] != '\\0')",
        "        i++;",
        "    return (i);",
        "}",
        "",
      ].join("\n"),
      "whitespace-tolerant",
      "line",
      false,
      "c",
      "require",
      "flexible",
    );

    expect(statuses[5].status).toBe("incorrect");
    expect(statuses[6].status).toBe("incorrect");
    expect(statuses[7].status).toBe("incorrect");
  });

  it("allows consistent Python identifier renaming in flexible names mode", () => {
    const comparison = compareAttempt(
      ["def size(text):", "    index = 0", "    return index"].join("\n"),
      ["def length(value):", "    i = 0", "    return i"].join("\n"),
      "whitespace-tolerant",
      "python",
      "require",
      "flexible",
    );

    expect(comparison.completed).toBe(true);
  });

  it("flags later Python uses of the original name after an assignment rename", () => {
    const comparison = compareAttempt(
      [
        "def evaluate(ind):",
        "    correct = 0",
        "    for i in range(1, len(opponent_history)):",
        "        pred = evaluate_strategy(ind, opponent_history[:i])",
        "        if pred == opponent_history[i]:",
        "            correct += 1",
        "    return (correct,)",
      ].join("\n"),
      [
        "def evaluate(ind):",
        "    correct = 0",
        "    for i in range(1, len(opponent_history)):",
        "        preddddd = evaluate_strategy(ind, opponent_history[:i])",
        "        if pred == opponent_history[i]:",
        "            correct += 1",
        "    return (correct,)",
      ].join("\n"),
      "whitespace-tolerant",
      "python",
      "ignore",
      "flexible",
    );

    expect(comparison.lineComparisons[3].status).toBe("correct");
    expect(comparison.lineComparisons[4].status).toBe("incorrect");
    expect(comparison.mismatchCount).toBe(1);
  });

  it("flags later Python uses of a renamed assignment in exact names mode", () => {
    const comparison = compareAttempt(
      [
        "def evaluate(ind):",
        "    pred = evaluate_strategy(ind, opponent_history[:i])",
        "    if pred == opponent_history[i]:",
        "        return pred",
      ].join("\n"),
      [
        "def evaluate(ind):",
        "    preddddd = evaluate_strategy(ind, opponent_history[:i])",
        "    if pred == opponent_history[i]:",
        "        return pred",
      ].join("\n"),
      "whitespace-tolerant",
      "python",
      "ignore",
      "exact",
    );

    expect(comparison.lineComparisons[1].status).toBe("incorrect");
    expect(comparison.lineComparisons[2].status).toBe("incorrect");
    expect(comparison.lineComparisons[3].status).toBe("incorrect");
    expect(comparison.mismatchCount).toBe(3);
  });

  it("carries exact-mode Python assignment conflicts through live feedback", () => {
    const statuses = getLineStatuses(
      [
        "def evaluate(ind):",
        "    pred = evaluate_strategy(ind, opponent_history[:i])",
        "    if pred == opponent_history[i]:",
        "        return pred",
      ].join("\n"),
      [
        "def evaluate(ind):",
        "    preddddd = evaluate_strategy(ind, opponent_history[:i])",
        "    if pred == opponent_history[i]:",
        "        return pred",
        "",
      ].join("\n"),
      "whitespace-tolerant",
      "line",
      false,
      "python",
      "ignore",
      "exact",
    );

    expect(statuses[1].status).toBe("incorrect");
    expect(statuses[2].status).toBe("incorrect");
    expect(statuses[3].status).toBe("incorrect");
  });

  it("carries flexible Python assignment renames through live line feedback", () => {
    const statuses = getLineStatuses(
      [
        "def evaluate(ind):",
        "    correct = 0",
        "    for i in range(1, len(opponent_history)):",
        "        pred = evaluate_strategy(ind, opponent_history[:i])",
        "        if pred == opponent_history[i]:",
        "            correct += 1",
        "    return (correct,)",
      ].join("\n"),
      [
        "def evaluate(ind):",
        "    correct = 0",
        "    for i in range(1, len(opponent_history)):",
        "        preddddd = evaluate_strategy(ind, opponent_history[:i])",
        "        if pred == opponent_history[i]:",
        "            correct += 1",
        "    return (correct,)",
        "",
      ].join("\n"),
      "whitespace-tolerant",
      "line",
      false,
      "python",
      "ignore",
      "flexible",
    );

    expect(statuses[3].status).toBe("correct");
    expect(statuses[4].status).toBe("incorrect");
  });

  it("does not allow keywords to be renamed in flexible names mode", () => {
    const comparison = compareAttempt(
      "return value",
      "yield value",
      "whitespace-tolerant",
      "python",
      "require",
      "flexible",
    );

    expect(comparison.completed).toBe(false);
  });
});
