import { describe, expect, test } from "bun:test";
import { validateSemantics } from "../src/semantic";
import { SemanticValidationError, type MindMapDocument } from "../src/types";

const document = (root: MindMapDocument["sheets"][number]["root"]): MindMapDocument => ({
  version: "1",
  sheets: [{ title: "S", root }],
});

describe("validateSemantics", () => {
  test("accepts valid paths and sibling summary range", () => {
    expect(() =>
      validateSemantics(
        document({
          title: "R",
          children: [{ title: "A" }, { title: "B" }],
          relationships: [{ title: "rel", fromPath: ["A"], toPath: ["B"] }],
          summaries: [{ title: "sum", fromPath: ["A"], toPath: ["B"] }],
        }),
      ),
    ).not.toThrow();
  });

  test("returns void for valid document", () => {
    const result: void = validateSemantics(document({ title: "R" }));

    expect(result).toBeUndefined();
  });

  test("accepts empty path referencing root", () => {
    expect(() =>
      validateSemantics(
        document({
          title: "R",
          children: [{ title: "A" }],
          relationships: [{ fromPath: [], toPath: ["A"] }],
        }),
      ),
    ).not.toThrow();
  });

  test("validates nested relationships and summaries", () => {
    expect(() =>
      validateSemantics(
        document({
          title: "R",
          children: [
            {
              title: "A",
              children: [{ title: "A1" }, { title: "A2" }],
              relationships: [{ fromPath: ["A", "A1"], toPath: ["A", "A2"] }],
              summaries: [{ title: "nested", fromPath: ["A", "A1"], toPath: ["A", "A2"] }],
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  test("rejects duplicate sibling titles", () => {
    expect(() =>
      validateSemantics(
        document({
          title: "R",
          children: [{ title: "A" }, { title: "A" }],
        }),
      ),
    ).toThrow(SemanticValidationError);
  });

  test("rejects duplicate sibling titles with locatable path and message", () => {
    try {
      validateSemantics(
        document({
          title: "R",
          children: [{ title: "A", children: [{ title: "A1" }, { title: "A1" }] }],
        }),
      );
      throw new Error("expected validateSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SemanticValidationError);
      expect((error as SemanticValidationError).path).toBe("sheets[0].root.children[0].children[1].title");
      expect((error as Error).message).toContain("重复");
      expect((error as Error).message).toContain("A1");
    }
  });

  test("rejects missing relationship path", () => {
    expect(() =>
      validateSemantics(
        document({
          title: "R",
          children: [{ title: "A" }],
          relationships: [{ fromPath: ["A"], toPath: ["B"] }],
        }),
      ),
    ).toThrow(SemanticValidationError);
  });

  test("rejects summary paths with different parents", () => {
    expect(() =>
      validateSemantics(
        document({
          title: "R",
          children: [{ title: "A", children: [{ title: "A1" }] }, { title: "B" }],
          summaries: [{ title: "bad", fromPath: ["A", "A1"], toPath: ["B"] }],
        }),
      ),
    ).toThrow(SemanticValidationError);
  });

  test("rejects missing summary path with locatable path", () => {
    try {
      validateSemantics(
        document({
          title: "R",
          children: [{ title: "A" }],
          summaries: [{ title: "bad", fromPath: ["A"], toPath: ["B"] }],
        }),
      );
      throw new Error("expected validateSemantics to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SemanticValidationError);
      expect((error as SemanticValidationError).path).toBe("sheets[0].root.summaries[0].toPath");
      expect((error as Error).message).toContain("不存在");
      expect((error as Error).message).toContain("B");
    }
  });

  test("rejects same marker group", () => {
    expect(() =>
      validateSemantics(
        document({
          title: "R",
          markers: ["priority-1", "priority-2"],
        }),
      ),
    ).toThrow(SemanticValidationError);
  });
});
