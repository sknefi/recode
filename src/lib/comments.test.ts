import { describe, expect, it } from "vitest";
import { applyCommentBehavior, hasComments, stripComments } from "./comments";

describe("stripComments", () => {
  it("strips C line and block comments", () => {
    expect(
      stripComments(
        [
          "int a = 1; // note",
          "int b = 2; /* remove",
          "still remove */",
          "return (a + b);",
        ].join("\n"),
        "c",
      ),
    ).toBe(["int a = 1;", "int b = 2;", "", "return (a + b);"].join("\n"));
  });

  it("does not strip C comment markers inside strings", () => {
    expect(stripComments('char *s = "http://x"; // note', "c")).toBe(
      'char *s = "http://x";',
    );
  });

  it("detects C comments outside strings", () => {
    expect(hasComments('char *s = "http://x";', "c")).toBe(false);
    expect(hasComments("int value = 1; // note", "c")).toBe(true);
    expect(hasComments("int value = 1; /* note */", "c")).toBe(true);
  });

  it("strips Python comments", () => {
    expect(stripComments("value = 1 # note\nreturn value", "python")).toBe(
      "value = 1\nreturn value",
    );
  });

  it("does not strip Python comment markers inside strings", () => {
    expect(stripComments('value = "# not comment" # note', "python")).toBe(
      'value = "# not comment"',
    );
  });

  it("detects Python comments outside strings", () => {
    expect(hasComments('value = "# not comment"', "python")).toBe(false);
    expect(hasComments("value = 1 # note", "python")).toBe(true);
    expect(hasComments("# note", "python")).toBe(true);
  });

  it("removes Python comment-only lines when comments are ignored", () => {
    expect(
      applyCommentBehavior(
        ["value = 1", "# skipped note", "return value"].join("\n"),
        "python",
        "ignore",
      ),
    ).toBe(["value = 1", "return value"].join("\n"));
  });

  it("keeps real blank Python lines when comments are ignored", () => {
    expect(
      applyCommentBehavior(
        ["value = 1", "", "# skipped note", "return value"].join("\n"),
        "python",
        "ignore",
      ),
    ).toBe(["value = 1", "", "return value"].join("\n"));
  });

  it("removes C comment-only lines when comments are ignored", () => {
    expect(
      applyCommentBehavior(
        ["int value = 1;", "// skipped note", "return value;"].join("\n"),
        "c",
        "ignore",
      ),
    ).toBe(["int value = 1;", "return value;"].join("\n"));
  });
});
