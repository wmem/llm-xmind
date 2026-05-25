import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveMindMapImage } from "../src/image";
import { ImageError } from "../src/types";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';

describe("resolveMindMapImage", () => {
  test("keeps non-SVG data URI as data URI", async () => {
    const image = await resolveMindMapImage({ kind: "data-uri", name: "pixel.png", data: "data:image/png;base64,AA==" });
    expect(image.name).toBe("pixel.png");
    expect(image.data).toBe("data:image/png;base64,AA==");
  });

  test("normalizes SVG data URI to raw SVG bytes", async () => {
    const image = await resolveMindMapImage({
      kind: "data-uri",
      name: "diagram.svg",
      data: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    });
    expect(image.name).toBe("diagram.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toContain("<svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).not.toContain("data:image/svg+xml");
  });

  test("normalizes URL-encoded SVG data URI to raw SVG bytes", async () => {
    const image = await resolveMindMapImage({
      kind: "data-uri",
      name: "diagram.svg",
      data: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    });
    expect(image.name).toBe("diagram.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toBe(svg);
  });

  test("normalizes utf8 SVG data URI to raw SVG bytes", async () => {
    const image = await resolveMindMapImage({
      kind: "data-uri",
      name: "diagram.svg",
      data: `data:image/svg+xml;utf8,${svg}`,
    });
    expect(image.name).toBe("diagram.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toBe(svg);
  });

  test("appends .svg suffix for SVG data URI name without suffix", async () => {
    const image = await resolveMindMapImage({
      kind: "data-uri",
      name: "diagram",
      data: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    });
    expect(image.name).toBe("diagram.svg");
  });

  test("normalizes inline SVG content", async () => {
    const image = await resolveMindMapImage({ kind: "svg", content: svg });
    expect(image.name).toBe("image.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toContain("<svg");
  });

  test("normalizes inline self-closing SVG content", async () => {
    const image = await resolveMindMapImage({ kind: "svg", content: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    expect(image.name).toBe("image.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toContain("<svg");
  });

  test("appends .svg suffix for inline SVG name without suffix", async () => {
    const image = await resolveMindMapImage({ kind: "svg", name: "diagram", content: svg });
    expect(image.name).toBe("diagram.svg");
  });

  test("keeps .svg suffix for inline SVG name with suffix", async () => {
    const image = await resolveMindMapImage({ kind: "svg", name: "diagram.svg", content: svg });
    expect(image.name).toBe("diagram.svg");
  });

  test("reads file image through xmind-generator compatible data", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-image-"));
    const file = join(dir, "sample.svg");
    await writeFile(file, svg);
    const image = await resolveMindMapImage({ kind: "file", path: file });
    expect(image.name).toBe("sample.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toContain("<svg");
  });

  test("rejects invalid SVG", async () => {
    await expect(resolveMindMapImage({ kind: "svg", content: "not svg" })).rejects.toBeInstanceOf(ImageError);
  });

  test("rejects invalid SVG data URI with locatable error", async () => {
    await expect(
      resolveMindMapImage({ kind: "data-uri", name: "broken.svg", data: "data:image/svg+xml,not%20svg" }),
    ).rejects.toMatchObject({
      name: "ImageError",
      message: "SVG 内容必须是完整 <svg> 文档",
      path: "image.data",
    });
  });

  test("rejects invalid base64 SVG data URI with locatable error", async () => {
    await expect(
      resolveMindMapImage({ kind: "data-uri", name: "broken.svg", data: "data:image/svg+xml;base64,%%%%" }),
    ).rejects.toMatchObject({
      name: "ImageError",
      message: expect.stringContaining("非法 SVG data URI"),
      path: "image.data",
    });
  });

  test("rejects duplicate base64 SVG data URI parameter", async () => {
    await expect(
      resolveMindMapImage({
        kind: "data-uri",
        name: "broken.svg",
        data: `data:image/svg+xml;base64;base64,${Buffer.from(svg).toString("base64")}`,
      }),
    ).rejects.toMatchObject({
      name: "ImageError",
      message: expect.stringContaining("非法 SVG data URI"),
      path: "image.data",
    });
  });

  test("rejects unknown SVG data URI parameter", async () => {
    await expect(
      resolveMindMapImage({
        kind: "data-uri",
        name: "broken.svg",
        data: `data:image/svg+xml;foo=bar,${encodeURIComponent(svg)}`,
      }),
    ).rejects.toMatchObject({
      name: "ImageError",
      message: expect.stringContaining("非法 SVG data URI"),
      path: "image.data",
    });
  });

  test("rejects missing file with file path", async () => {
    const file = join(tmpdir(), "llm-xmind-missing-image.svg");
    await expect(resolveMindMapImage({ kind: "file", path: file })).rejects.toMatchObject({
      name: "ImageError",
      path: file,
    });
  });
});
