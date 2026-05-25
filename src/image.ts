import { readImageFile, type NamedResourceData } from "xmind-generator";
import { ImageError, type MindMapImage } from "./types";

export async function resolveMindMapImage(image: MindMapImage): Promise<NamedResourceData> {
  if (image.kind === "file") {
    try {
      return await readImageFile(image.path);
    } catch (error) {
      throw new ImageError(`读取图片文件失败: ${(error as Error).message}`, image.path);
    }
  }

  if (image.kind === "svg") {
    const svg = normalizeSvgXml(image.content, "image.content");
    return { name: normalizeSvgName(image.name ?? "image.svg"), data: Buffer.from(svg, "utf8") };
  }

  if (isSvgDataUri(image.data)) {
    const svg = normalizeSvgXml(decodeSvgDataUri(image.data), "image.data");
    return { name: normalizeSvgName(image.name), data: Buffer.from(svg, "utf8") };
  }

  return { name: image.name, data: image.data };
}

function isSvgDataUri(value: string): boolean {
  return /^data:image\/svg\+xml[;,]/i.test(value);
}

function normalizeSvgName(name: string): string {
  return name.toLowerCase().endsWith(".svg") ? name : `${name}.svg`;
}

function decodeSvgDataUri(value: string): string {
  const match = value.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) {
    throw new ImageError("非法 SVG data URI", "image.data");
  }

  const payload = match[2] ?? "";
  if (match[1]) {
    return Buffer.from(payload, "base64").toString("utf8");
  }

  try {
    return decodeURIComponent(payload);
  } catch (error) {
    throw new ImageError(`非法 SVG data URI: ${(error as Error).message}`, "image.data");
  }
}

function normalizeSvgXml(value: string, path: string): string {
  const trimmed = value.trim();
  if (!/^<svg[\s>]/i.test(trimmed) || !/<\/svg>$/i.test(trimmed)) {
    throw new ImageError("SVG 内容必须是完整 <svg> 文档", path);
  }
  return trimmed;
}
