import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import { compileMindMapDocument } from "../src/compiler";
import { convertToWorkbook } from "../src/converter";
import { pathKey } from "../src/path";

type SerializedTopic = {
  id: string;
  title: string;
  notes?: { plain?: { content?: string } };
  labels?: string[];
  markers?: Array<{ markerId: string }>;
  image?: { src: string };
  children?: {
    attached?: SerializedTopic[];
    summary?: SerializedTopic[];
  };
  summaries?: Array<{ class: string; range: string; topicId: string }>;
};

type SerializedSheet = {
  title: string;
  rootTopic: SerializedTopic;
  relationships?: Array<{ title: string; end1Id: string; end2Id: string }>;
};

async function archiveContent(workbook: { archive(): Promise<ArrayBuffer> }) {
  const zip = await JSZip.loadAsync(await workbook.archive());
  const content = JSON.parse(await zip.file("content.json")!.async("string")) as SerializedSheet[];
  return { zip, content };
}

describe("convertToWorkbook", () => {
  test("maps all convertible root fields into content.json and stores SVG resources as raw SVG", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            note: "note",
            labels: ["label"],
            markers: ["priority-1"],
            image: { kind: "svg", content: svg },
            children: [{ title: "A" }, { title: "B" }],
            relationships: [{ title: "rel", fromPath: ["A"], toPath: ["B"] }],
            summaries: [{ title: "sum", fromPath: ["A"], toPath: ["B"] }],
          },
        },
      ],
    });

    const workbook = await convertToWorkbook(compiled);
    const { zip, content } = await archiveContent(workbook);
    const root = content[0].rootTopic;

    expect(content[0].title).toBe("S");
    expect(root.title).toBe("R");
    expect(root.notes?.plain?.content).toContain("note");
    expect(root.labels).toEqual(["label"]);
    expect(root.markers).toEqual([{ markerId: "priority-1" }]);
    expect(root.image?.src).toMatch(/^xap:resources\/.+\.svg$/);
    expect(root.children?.attached?.map((child) => child.title)).toEqual(["A", "B"]);
    expect(content[0].relationships?.[0]?.title).toBe("rel");
    expect(content[0].relationships?.[0]?.end1Id).toBe(root.children?.attached?.[0]?.id);
    expect(content[0].relationships?.[0]?.end2Id).toBe(root.children?.attached?.[1]?.id);
    expect(root.summaries?.[0]?.class).toBe("summary");
    expect(root.summaries?.[0]?.range).toBe("(0,1)");
    expect(root.summaries?.[0]?.topicId).toBe(root.children?.summary?.[0]?.id);
    expect(root.children?.summary?.[0]?.title).toBe("sum");

    const resourcePath = root.image!.src.replace("xap:", "");
    expect(await zip.file(resourcePath)!.async("string")).toBe(svg);
  });

  test("collects relationships defined on nested topics into sheet relationships", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [
              {
                title: "A",
                children: [{ title: "A1" }, { title: "A2" }],
                relationships: [{ title: "nested rel", fromPath: ["A", "A1"], toPath: ["A", "A2"] }],
              },
            ],
          },
        },
      ],
    });

    const workbook = await convertToWorkbook(compiled);
    const { content } = await archiveContent(workbook);

    expect(content[0].relationships?.map((relationship) => relationship.title)).toEqual(["nested rel"]);
  });

  test("creates nested summaries on the compiled owner topic", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [
              {
                title: "A",
                children: [{ title: "A1" }, { title: "A2" }],
                summaries: [{ title: "nested sum", fromPath: ["A", "A1"], toPath: ["A", "A2"] }],
              },
            ],
          },
        },
      ],
    });

    const workbook = await convertToWorkbook(compiled);
    const { content } = await archiveContent(workbook);
    const nested = content[0].rootTopic.children?.attached?.[0];

    expect(nested?.title).toBe("A");
    expect(nested?.summaries?.[0]?.class).toBe("summary");
    expect(nested?.summaries?.[0]?.range).toBe("(0,1)");
    expect(nested?.children?.summary?.[0]?.title).toBe("nested sum");
  });

  test("fails fast with a clear error when relationship paths are missing from the sheet path index", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [{ title: "A" }, { title: "B" }],
            relationships: [{ fromPath: ["A"], toPath: ["B"] }],
          },
        },
      ],
    });
    compiled.sheets[0].pathIndex.delete(pathKey(["B"]));

    await expect(convertToWorkbook(compiled)).rejects.toThrow('relationship.toPath 不存在: ["B"]');
  });

  test("fails fast with a clear error when summary paths are missing from the sheet path index", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [{ title: "A" }, { title: "B" }],
            summaries: [{ title: "sum", fromPath: ["A"], toPath: ["B"] }],
          },
        },
      ],
    });
    compiled.sheets[0].pathIndex.delete(pathKey(["B"]));

    await expect(convertToWorkbook(compiled)).rejects.toThrow('summary.toPath 不存在: ["B"]');
  });
});
