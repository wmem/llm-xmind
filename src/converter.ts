import {
  Relationship,
  RootTopic,
  Summary,
  Topic,
  Workbook,
  type RelationshipBuilder,
  type RootTopicBuilder,
  type SummaryBuilder,
  type TopicBuilder,
  type WorkbookBuilder,
} from "xmind-generator";
import { resolveMindMapImage } from "./image";
import { markerNameToMarkerId } from "./markers";
import { pathKey } from "./path";
import type { CompiledDocument, CompiledSheet, CompiledTopic, MindMapRelationship, MindMapSummary } from "./types";

export async function convertToWorkbook(document: CompiledDocument): Promise<WorkbookBuilder> {
  const roots = await Promise.all(document.sheets.map(convertSheet));
  return Workbook(roots);
}

async function convertSheet(sheet: CompiledSheet): Promise<RootTopicBuilder> {
  const root = await convertRootTopic(sheet.root, sheet);
  root.sheetTitle(sheet.title);
  root.relationships(collectRelationships(sheet));
  return root;
}

async function convertRootTopic(compiled: CompiledTopic, sheet: CompiledSheet): Promise<RootTopicBuilder> {
  const builder = RootTopic(compiled.topic.title);
  await applyTopicFields(builder, compiled, sheet);
  return builder;
}

async function convertChildTopic(compiled: CompiledTopic, sheet: CompiledSheet): Promise<TopicBuilder> {
  const builder = Topic(compiled.topic.title);
  await applyTopicFields(builder, compiled, sheet);
  return builder;
}

async function applyTopicFields(
  builder: RootTopicBuilder | TopicBuilder,
  compiled: CompiledTopic,
  sheet: CompiledSheet,
): Promise<void> {
  builder.ref(compiled.ref);

  if (compiled.topic.note) {
    builder.note(compiled.topic.note);
  }
  if (compiled.topic.labels?.length) {
    builder.labels(compiled.topic.labels);
  }
  if (compiled.topic.markers?.length) {
    builder.markers(compiled.topic.markers.map(markerNameToMarkerId));
  }
  if (compiled.topic.image) {
    builder.image(await resolveMindMapImage(compiled.topic.image));
  }
  if (compiled.children.length) {
    builder.children(await Promise.all(compiled.children.map((child) => convertChildTopic(child, sheet))));
  }

  const summaries = convertSummaries(compiled, sheet);
  if (summaries.length) {
    builder.summaries(summaries);
  }
}

function collectRelationships(sheet: CompiledSheet): RelationshipBuilder[] {
  return flattenTopics(sheet.root).flatMap((compiled) =>
    compiled.topic.relationships?.map((relationship) => convertRelationship(relationship, sheet)) ?? [],
  );
}

function convertRelationship(relationship: MindMapRelationship, sheet: CompiledSheet): RelationshipBuilder {
  return Relationship(relationship.title ?? "", {
    from: resolvePathRef(sheet, relationship.fromPath, "relationship.fromPath"),
    to: resolvePathRef(sheet, relationship.toPath, "relationship.toPath"),
  });
}

function convertSummaries(owner: CompiledTopic, sheet: CompiledSheet): SummaryBuilder[] {
  const seenRanges = new Map<string, number>();
  return (
    owner.topic.summaries?.map((summary, summaryIndex) => {
      const converted = convertSummary(summary, owner, sheet);
      const duplicateIndex = seenRanges.get(converted.rangeKey);
      if (duplicateIndex !== undefined) {
        throw new Error(
          `summary 范围重复: ${JSON.stringify(summary.fromPath)} -> ${JSON.stringify(
            summary.toPath,
          )} 与 summaries[${duplicateIndex}] 冲突`,
        );
      }
      seenRanges.set(converted.rangeKey, summaryIndex);
      return converted.builder;
    }) ?? []
  );
}

function convertSummary(
  summary: MindMapSummary,
  owner: CompiledTopic,
  sheet: CompiledSheet,
): { builder: SummaryBuilder; rangeKey: string } {
  const fromCompiled = resolveCompiledTopic(sheet, summary.fromPath, "summary.fromPath");
  const toCompiled = resolveCompiledTopic(sheet, summary.toPath, "summary.toPath");
  assertDirectChild(owner, fromCompiled, "summary.fromPath");
  assertDirectChild(owner, toCompiled, "summary.toPath");

  return {
    builder: Summary(summary.title, {
      from: fromCompiled.ref,
      to: toCompiled.ref,
    }),
    rangeKey: summaryRangeKey(owner, fromCompiled, toCompiled),
  };
}

function resolvePathRef(sheet: CompiledSheet, path: readonly string[], label: string): string {
  return resolveCompiledTopic(sheet, path, label).ref;
}

function resolveCompiledTopic(sheet: CompiledSheet, path: readonly string[], label: string): CompiledTopic {
  const found = sheet.pathIndex.get(pathKey(path));
  if (!found) {
    throw new Error(`${label} 不存在: ${JSON.stringify(path)}`);
  }
  return found;
}

function assertDirectChild(owner: CompiledTopic, topic: CompiledTopic, label: string): void {
  if (!owner.children.includes(topic)) {
    throw new Error(`${label} 不是当前 summary 所属 topic 的直接子 topic: ${JSON.stringify(topic.path)}`);
  }
}

function summaryRangeKey(owner: CompiledTopic, from: CompiledTopic, to: CompiledTopic): string {
  const fromIndex = owner.children.indexOf(from);
  const toIndex = owner.children.indexOf(to);
  return [fromIndex, toIndex].sort((left, right) => left - right).join(":");
}

function flattenTopics(topic: CompiledTopic): CompiledTopic[] {
  return [topic, ...topic.children.flatMap(flattenTopics)];
}
