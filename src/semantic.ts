import { assertNoMarkerGroupConflict } from "./markers";
import { SemanticValidationError, type MindMapDocument, type MindMapTopic } from "./types";

type TopicContext = {
  topic: MindMapTopic;
  semanticPath: string[];
  sourcePath: string;
};

type SheetContext = {
  pathIndex: Map<string, MindMapTopic>;
  topics: TopicContext[];
};

export function validateSemantics(document: MindMapDocument): void {
  document.sheets.forEach((sheet, sheetIndex) => {
    const context = buildSheetContext(sheet.root, `sheets[${sheetIndex}].root`);
    validateTopicReferences(context);
  });
}

function buildSheetContext(root: MindMapTopic, rootSourcePath: string): SheetContext {
  const pathIndex = new Map<string, MindMapTopic>();
  const topics: TopicContext[] = [];

  const visit = (topic: MindMapTopic, semanticPath: string[], sourcePath: string): void => {
    pathIndex.set(pathKey(semanticPath), topic);
    topics.push({ topic, semanticPath, sourcePath });

    if (topic.markers) {
      assertNoMarkerGroupConflict(topic.markers, `${sourcePath}.markers`);
    }

    const seen = new Set<string>();
    topic.children?.forEach((child, childIndex) => {
      const childTitlePath = `${sourcePath}.children[${childIndex}].title`;
      if (seen.has(child.title)) {
        throw new SemanticValidationError(`同级 topic 标题重复: ${child.title}`, childTitlePath);
      }
      seen.add(child.title);

      visit(child, [...semanticPath, child.title], `${sourcePath}.children[${childIndex}]`);
    });
  };

  visit(root, [], rootSourcePath);

  return { pathIndex, topics };
}

function validateTopicReferences(context: SheetContext): void {
  for (const { topic, semanticPath, sourcePath } of context.topics) {
    topic.relationships?.forEach((relationship, relationshipIndex) => {
      assertExistingPath(
        context,
        relationship.fromPath,
        `${sourcePath}.relationships[${relationshipIndex}].fromPath`,
        "relationship.fromPath",
      );
      assertExistingPath(
        context,
        relationship.toPath,
        `${sourcePath}.relationships[${relationshipIndex}].toPath`,
        "relationship.toPath",
      );
    });

    topic.summaries?.forEach((summary, summaryIndex) => {
      const summaryPath = `${sourcePath}.summaries[${summaryIndex}]`;
      assertExistingPath(context, summary.fromPath, `${summaryPath}.fromPath`, "summary.fromPath");
      assertExistingPath(context, summary.toPath, `${summaryPath}.toPath`, "summary.toPath");

      if (summary.fromPath.length === 0 || summary.toPath.length === 0) {
        throw new SemanticValidationError(
          "summary 端点必须是同一 topic 的直接子 topic，不能包含 root 本身",
          summaryPath,
        );
      }

      if (!samePath(parentPath(summary.fromPath), parentPath(summary.toPath))) {
        throw new SemanticValidationError(
          `summary 范围必须引用同一个 parent 下的 sibling topic: ${formatPath(summary.fromPath)} -> ${formatPath(
            summary.toPath,
          )}`,
          summaryPath,
        );
      }

      const commonParentPath = parentPath(summary.fromPath);
      if (!samePath(commonParentPath, semanticPath)) {
        throw new SemanticValidationError(
          `summary 必须定义在共同父 topic 上: 当前 ${formatPath(semanticPath)}, 共同父 ${formatPath(
            commonParentPath,
          )}`,
          summaryPath,
        );
      }
    });
  }
}

function assertExistingPath(context: SheetContext, semanticPath: string[], sourcePath: string, fieldName: string): void {
  if (!context.pathIndex.has(pathKey(semanticPath))) {
    throw new SemanticValidationError(`${fieldName} 引用的 topic 路径不存在: ${formatPath(semanticPath)}`, sourcePath);
  }
}

function parentPath(semanticPath: string[]): string[] {
  return semanticPath.slice(0, -1);
}

function samePath(left: string[], right: string[]): boolean {
  return pathKey(left) === pathKey(right);
}

function pathKey(semanticPath: string[]): string {
  return JSON.stringify(semanticPath);
}

function formatPath(semanticPath: string[]): string {
  return semanticPath.length === 0 ? "[]" : semanticPath.join(" > ");
}
