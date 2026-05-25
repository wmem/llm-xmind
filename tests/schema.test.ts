import { describe, expect, test } from "bun:test";
import { validateMindMapDocument } from "../src/schema";
import { SchemaValidationError, type MindMapDocument } from "../src/types";

const minimal: MindMapDocument = {
  version: "1",
  sheets: [{ title: "S", root: { title: "R" } }],
};

function expectSchemaError(input: unknown): void {
  expect(() => validateMindMapDocument(input)).toThrow(SchemaValidationError);
}

function getSchemaError(input: unknown): SchemaValidationError {
  try {
    validateMindMapDocument(input);
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return error;
    }
    throw error;
  }

  throw new Error("expected SchemaValidationError");
}

describe("validateMindMapDocument schema", () => {
  test("accepts minimal document", () => {
    expect(validateMindMapDocument(minimal)).toEqual(minimal);
  });

  test("accepts every schema field", () => {
    const complete: MindMapDocument = {
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            note: "plain note",
            labels: ["a"],
            markers: ["priority-1"],
            image: {
              kind: "svg",
              name: "diagram.svg",
              content: '<svg xmlns="http://www.w3.org/2000/svg"/>',
            },
            children: [
              {
                title: "A",
                image: { kind: "data-uri", name: "a.png", data: "data:image/png;base64,AAAA" },
              },
              {
                title: "B",
                image: { kind: "file", path: "./b.png" },
              },
            ],
            relationships: [{ title: "rel", fromPath: ["A"], toPath: ["B"] }],
            summaries: [{ title: "sum", fromPath: ["A"], toPath: ["B"] }],
          },
        },
      ],
    };

    expect(validateMindMapDocument(complete)).toEqual(complete);
  });

  test("rejects missing required fields and unknown fields", () => {
    expectSchemaError({ sheets: [] });
    expectSchemaError({ ...minimal, extra: true });
    expectSchemaError({ version: "1", sheets: [] });
    expectSchemaError({ version: "2", sheets: minimal.sheets });
    expectSchemaError({ version: "1", sheets: [{ title: "S", root: { title: "R" }, extra: true }] });
    expectSchemaError({ version: "1", sheets: [{ title: "S", root: { title: "R", extra: true } }] });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", relationships: [{ fromPath: ["A"], toPath: ["B"], extra: true }] } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", summaries: [{ title: "sum", fromPath: ["A"], extra: true }] } }],
    });
  });

  test("rejects invalid image variants and marker enum", () => {
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", markers: ["bad-marker"] } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "url", url: "https://example.com/a.png" } } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "svg", content: "" } } }],
    });
  });

  test("reports helpful image variant error paths and messages", () => {
    const unknownKindError = getSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "url", url: "https://example.com/a.png" } } }],
    });
    expect(["sheets.0.root.image.kind", "sheets.0.root.image"]).toContain(unknownKindError.path ?? "");
    expect(unknownKindError.message).toContain("kind");

    const emptySvgContentError = getSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "svg", content: "" } } }],
    });
    expect(emptySvgContentError.path).toBe("sheets.0.root.image.content");
    expect(emptySvgContentError.message).toContain("content");

    const invalidDataUriError = getSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "data-uri", name: "a.png", data: "not-data-uri" } } }],
    });
    expect(invalidDataUriError.path).toBe("sheets.0.root.image.data");
    expect(invalidDataUriError.message).toContain("data");
  });

  test("rejects empty sheets", () => {
    expectSchemaError({ version: "1", sheets: [] });
  });

  test("rejects empty title at document nested levels", () => {
    expectSchemaError({ version: "1", sheets: [{ title: "", root: { title: "R" } }] });
    expectSchemaError({ version: "1", sheets: [{ title: "S", root: { title: "" } }] });
    expectSchemaError({ version: "1", sheets: [{ title: "S", root: { title: "R", children: [{ title: "" }] } }] });
  });

  test("rejects invalid labels element", () => {
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", labels: ["ok", ""] } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", labels: ["ok", 1] } }],
    });
  });

  test("rejects invalid path array element for relationship and summary", () => {
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", relationships: [{ fromPath: ["A", ""], toPath: ["B"] }] } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", relationships: [{ fromPath: ["A"], toPath: [1] }] } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", summaries: [{ title: "sum", fromPath: [""], toPath: ["B"] }] } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", summaries: [{ title: "sum", fromPath: ["A"], toPath: [1] }] } }],
    });
  });

  test("rejects each image variant missing required fields", () => {
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "data-uri", data: "data:image/png;base64,AAAA" } } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "data-uri", name: "a.png" } } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "file" } } }],
    });
    expectSchemaError({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "svg" } } }],
    });
  });
});
