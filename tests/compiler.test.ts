import { describe, expect, test } from "bun:test";
import { compileMindMapDocument } from "../src/compiler";

describe("compileMindMapDocument", () => {
  test("generates stable refs and path index", () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [{ title: "A", children: [{ title: "A1" }] }, { title: "B" }],
          },
        },
      ],
    });

    const sheet = compiled.sheets[0];
    expect(sheet.root.ref).toBe("sheet-0/topic");
    expect(sheet.pathIndex.get(JSON.stringify([]))?.ref).toBe("sheet-0/topic");
    expect(sheet.pathIndex.get(JSON.stringify(["A"]))?.ref).toBe("sheet-0/topic-0");
    expect(sheet.pathIndex.get(JSON.stringify(["A", "A1"]))?.ref).toBe("sheet-0/topic-0-0");
    expect(sheet.pathIndex.get(JSON.stringify(["B"]))?.ref).toBe("sheet-0/topic-1");
  });

  test("uses different sheet indexes for refs", () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        { title: "S1", root: { title: "R1" } },
        { title: "S2", root: { title: "R2" } },
      ],
    });

    expect(compiled.sheets[0].root.ref).toBe("sheet-0/topic");
    expect(compiled.sheets[1].root.ref).toBe("sheet-1/topic");
  });

  test("preserves original topic references and children structure", () => {
    const childTopic = { title: "A", note: "child note" };
    const rootTopic = { title: "R", children: [childTopic] };

    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [{ title: "S", root: rootTopic }],
    });

    expect(compiled.sheets[0].root.topic).toBe(rootTopic);
    expect(compiled.sheets[0].root.children).toHaveLength(1);
    expect(compiled.sheets[0].root.children[0].topic).toBe(childTopic);
    expect(compiled.sheets[0].root.children[0].children).toEqual([]);
  });

  test("keeps JSON stringified path keys scoped to each sheet path index", () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        { title: "S1", root: { title: "R1", children: [{ title: "Same" }] } },
        { title: "S2", root: { title: "R2", children: [{ title: "Same" }] } },
      ],
    });

    const firstSheet = compiled.sheets[0];
    const secondSheet = compiled.sheets[1];
    const samePathKey = JSON.stringify(["Same"]);

    expect(firstSheet.pathIndex.get(samePathKey)?.ref).toBe("sheet-0/topic-0");
    expect(secondSheet.pathIndex.get(samePathKey)?.ref).toBe("sheet-1/topic-0");
    expect(firstSheet.pathIndex.get(samePathKey)).not.toBe(secondSheet.pathIndex.get(samePathKey));
    expect(firstSheet.pathIndex.has("Same")).toBe(false);
  });
});
