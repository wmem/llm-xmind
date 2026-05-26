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

  test("fails fast when duplicate summary ranges would be silently dropped by xmind-generator", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [{ title: "A" }, { title: "B" }],
            summaries: [
              { title: "first", fromPath: ["A"], toPath: ["B"] },
              { title: "second", fromPath: ["B"], toPath: ["A"] },
            ],
          },
        },
      ],
    });

    await expect(convertToWorkbook(compiled)).rejects.toThrow("summary 范围冲突");
  });

  test("keeps overlapping summary ranges with different endpoint sets under the same owner topic", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [{ title: "A" }, { title: "B" }, { title: "C" }],
            summaries: [
              { title: "first", fromPath: ["A"], toPath: ["B"] },
              { title: "second", fromPath: ["B"], toPath: ["C"] },
            ],
          },
        },
      ],
    });

    const workbook = await convertToWorkbook(compiled);
    const { content } = await archiveContent(workbook);
    const root = content[0].rootTopic;

    expect(root.summaries?.map((summary) => summary.range)).toEqual(["(0,1)", "(1,2)"]);
    expect(root.children?.summary?.map((summary) => summary.title)).toEqual(["first", "second"]);
  });

  test("fails fast when a single-topic summary is converted directly", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [{ title: "A" }, { title: "B" }],
            summaries: [{ title: "single", fromPath: ["A"], toPath: ["A"] }],
          },
        },
      ],
    });

    await expect(convertToWorkbook(compiled)).rejects.toThrow("summary 不支持单点范围");
  });

  test("converts multiple sheets without mixing same-title paths or refs", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [
        {
          title: "S1",
          root: {
            title: "R1",
            children: [{ title: "A" }, { title: "B" }],
            relationships: [{ title: "rel-1", fromPath: ["A"], toPath: ["B"] }],
          },
        },
        {
          title: "S2",
          root: {
            title: "R2",
            children: [{ title: "A" }, { title: "B" }],
            relationships: [{ title: "rel-2", fromPath: ["A"], toPath: ["B"] }],
          },
        },
      ],
    });

    const workbook = await convertToWorkbook(compiled);
    const { content } = await archiveContent(workbook);
    const [first, second] = content;
    const firstChildren = first.rootTopic.children?.attached ?? [];
    const secondChildren = second.rootTopic.children?.attached ?? [];

    expect(content.map((sheet) => sheet.title)).toEqual(["S1", "S2"]);
    expect(first.relationships?.[0]).toMatchObject({
      title: "rel-1",
      end1Id: firstChildren[0].id,
      end2Id: firstChildren[1].id,
    });
    expect(second.relationships?.[0]).toMatchObject({
      title: "rel-2",
      end1Id: secondChildren[0].id,
      end2Id: secondChildren[1].id,
    });
    expect(first.relationships?.[0]?.end1Id).not.toBe(second.relationships?.[0]?.end1Id);
  });
});
