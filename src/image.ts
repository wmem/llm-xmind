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

  const svgDataUri = parseSvgDataUri(image.data);
  if (svgDataUri !== null) {
    const svg = normalizeSvgXml(svgDataUri, "image.data");
    return { name: normalizeSvgName(image.name), data: Buffer.from(svg, "utf8") };
  }

  return { name: image.name, data: image.data };
}

function normalizeSvgName(name: string): string {
  return name.toLowerCase().endsWith(".svg") ? name : `${name}.svg`;
}

function parseSvgDataUri(value: string): string | null {
  if (!value.toLowerCase().startsWith("data:image/svg+xml")) {
    return null;
  }

  const commaIndex = value.indexOf(",");
  if (commaIndex < 0) {
    throw new ImageError("非法 SVG data URI", "image.data");
  }

  const header = value.slice(0, commaIndex);
  const payload = value.slice(commaIndex + 1);
  const parameters = parseSvgDataUriHeader(header);

  if (parameters.base64) {
    return decodeBase64SvgDataUriPayload(payload);
  }

  try {
    return decodeURIComponent(payload);
  } catch (error) {
    throw new ImageError(`非法 SVG data URI: ${(error as Error).message}`, "image.data");
  }
}

function parseSvgDataUriHeader(header: string): { base64: boolean } {
  const parts = header.split(";");
  if (parts[0]?.toLowerCase() !== "data:image/svg+xml") {
    throw new ImageError("非法 SVG data URI", "image.data");
  }

  let base64 = false;
  let charset = false;
  let utf8 = false;

  for (const rawParameter of parts.slice(1)) {
    const parameter = rawParameter.toLowerCase();
    if (parameter === "base64") {
      if (base64) {
        throw new ImageError("非法 SVG data URI", "image.data");
      }
      base64 = true;
      continue;
    }

    if (parameter.startsWith("charset=")) {
      if (charset || parameter.length === "charset=".length) {
        throw new ImageError("非法 SVG data URI", "image.data");
      }
      charset = true;
      continue;
    }

    if (parameter === "utf8") {
      if (utf8) {
        throw new ImageError("非法 SVG data URI", "image.data");
      }
      utf8 = true;
      continue;
    }

    throw new ImageError("非法 SVG data URI", "image.data");
  }

  return { base64 };
}

function decodeBase64SvgDataUriPayload(payload: string): string {
  if (!isBase64Payload(payload)) {
    throw new ImageError("非法 SVG data URI", "image.data");
  }
  return Buffer.from(payload, "base64").toString("utf8");
}

function isBase64Payload(value: string): boolean {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && !/=.*[^=]/.test(value) && value.length % 4 !== 1;
}

function normalizeSvgXml(value: string, path: string): string {
  const trimmed = value.trim();
  const isSvgDocument = /^<svg(?:\s[^>]*)?>[\s\S]*<\/svg>$/i.test(trimmed) || /^<svg(?:\s[^>]*)?\/>$/i.test(trimmed);
  if (!isSvgDocument) {
    throw new ImageError("SVG 内容必须是完整 <svg> 文档", path);
  }
  return trimmed;
}
