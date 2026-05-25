import type {
  CompiledDocument,
  CompiledSheet,
  CompiledTopic,
  MindMapDocument,
  MindMapTopic,
} from "./types";

export function compileMindMapDocument(document: MindMapDocument): CompiledDocument {
  return {
    version: document.version,
    sheets: document.sheets.map((sheet, sheetIndex) => compileSheet(sheet.title, sheet.root, sheetIndex)),
  };
}

function compileSheet(title: string, root: MindMapTopic, sheetIndex: number): CompiledSheet {
  const pathIndex = new Map<string, CompiledTopic>();
  const compiledRoot = compileTopic(root, [], `sheet-${sheetIndex}/topic`, pathIndex);

  return { title, root: compiledRoot, pathIndex };
}

function compileTopic(
  topic: MindMapTopic,
  path: string[],
  ref: string,
  pathIndex: Map<string, CompiledTopic>,
): CompiledTopic {
  const compiled: CompiledTopic = {
    ref,
    path,
    topic,
    children: [],
  };

  pathIndex.set(JSON.stringify(path), compiled);
  compiled.children = (topic.children ?? []).map((child, index) =>
    compileTopic(child, [...path, child.title], `${ref}-${index}`, pathIndex),
  );

  return compiled;
}
