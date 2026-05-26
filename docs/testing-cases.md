# 测试用例索引

本文档按模块列出当前测试用例，便于评估覆盖面和定位回归。

## Parser

测试文件：`tests/parser.test.ts`

- `parseMindMapInput > parses JSON`
- `parseMindMapInput > parses YAML and YML`
- `parseMindMapInput > rejects unsupported extensions`
- `parseMindMapInput > rejects invalid JSON`
- `parseMindMapInput > rejects invalid YAML`
- `parseMindMapInput > rejects missing file`

## Schema

测试文件：`tests/schema.test.ts`

- `validateMindMapDocument schema > accepts minimal document`
- `validateMindMapDocument schema > accepts every schema field`
- `validateMindMapDocument schema > rejects missing required fields and unknown fields`
- `validateMindMapDocument schema > rejects invalid image variants and marker enum`
- `validateMindMapDocument schema > reports helpful image variant error paths and messages`
- `validateMindMapDocument schema > rejects empty sheets`
- `validateMindMapDocument schema > rejects empty title at document nested levels`
- `validateMindMapDocument schema > rejects invalid labels element`
- `validateMindMapDocument schema > rejects invalid path array element for relationship and summary`
- `validateMindMapDocument schema > rejects each image variant missing required fields`

## Semantic

测试文件：`tests/semantic.test.ts`

- `validateSemantics > accepts valid paths and sibling summary range`
- `validateSemantics > returns void for valid document`
- `validateSemantics > accepts empty path referencing root`
- `validateSemantics > validates nested relationships and summaries`
- `validateSemantics > rejects summary defined outside common parent topic`
- `validateSemantics > rejects root as summary endpoint`
- `validateSemantics > rejects duplicate sibling titles`
- `validateSemantics > rejects duplicate sibling titles with locatable path and message`
- `validateSemantics > rejects missing relationship path`
- `validateSemantics > rejects summary paths with different parents`
- `validateSemantics > rejects missing summary path with locatable path`
- `validateSemantics > rejects duplicate summary ranges under the same owner topic`
- `validateSemantics > rejects duplicate summary ranges in the same direction under the same owner topic`
- `validateSemantics > rejects single-topic summary ranges`
- `validateSemantics > accepts overlapping summary ranges with different endpoint sets under the same owner topic`
- `validateSemantics > rejects single-topic summary when it overlaps with another summary range`
- `validateSemantics > accepts non-overlapping summary ranges under the same owner topic`
- `validateSemantics > rejects same marker group`

## Compiler

测试文件：`tests/compiler.test.ts`

- `compileMindMapDocument > generates stable refs and path index`
- `compileMindMapDocument > uses different sheet indexes for refs`
- `compileMindMapDocument > preserves original topic references and children structure`
- `compileMindMapDocument > keeps JSON stringified path keys scoped to each sheet path index`
- `compileMindMapDocument > throws SemanticValidationError before duplicate topic paths overwrite path index entries`

## Converter

测试文件：`tests/converter.test.ts`

- `convertToWorkbook > maps all convertible root fields into content.json and stores SVG resources as raw SVG`
- `convertToWorkbook > collects relationships defined on nested topics into sheet relationships`
- `convertToWorkbook > creates nested summaries on the compiled owner topic`
- `convertToWorkbook > converts deeply nested child topics without an artificial schema depth limit`
- `convertToWorkbook > fails fast with a clear error when relationship paths are missing from the sheet path index`
- `convertToWorkbook > fails fast with a clear error when summary paths are missing from the sheet path index`
- `convertToWorkbook > fails fast when duplicate summary ranges would be silently dropped by xmind-generator`
- `convertToWorkbook > keeps overlapping summary ranges with different endpoint sets under the same owner topic`
- `convertToWorkbook > fails fast when a single-topic summary is converted directly`
- `convertToWorkbook > converts multiple sheets without mixing same-title paths or refs`

## Image

测试文件：`tests/image.test.ts`

- `resolveMindMapImage > keeps non-SVG data URI as data URI`
- `resolveMindMapImage > normalizes SVG data URI to raw SVG bytes`
- `resolveMindMapImage > normalizes URL-encoded SVG data URI to raw SVG bytes`
- `resolveMindMapImage > normalizes utf8 SVG data URI to raw SVG bytes`
- `resolveMindMapImage > appends .svg suffix for SVG data URI name without suffix`
- `resolveMindMapImage > normalizes inline SVG content`
- `resolveMindMapImage > normalizes inline self-closing SVG content`
- `resolveMindMapImage > appends .svg suffix for inline SVG name without suffix`
- `resolveMindMapImage > keeps .svg suffix for inline SVG name with suffix`
- `resolveMindMapImage > reads file image through xmind-generator compatible data`
- `resolveMindMapImage > rejects invalid SVG`
- `resolveMindMapImage > rejects invalid SVG data URI with locatable error`
- `resolveMindMapImage > rejects invalid base64 SVG data URI with locatable error`
- `resolveMindMapImage > rejects duplicate base64 SVG data URI parameter`
- `resolveMindMapImage > rejects unknown SVG data URI parameter`
- `resolveMindMapImage > rejects missing file with file path`

## Markers

测试文件：`tests/markers.test.ts`

- `markers > recognizes supported marker names`
- `markers > exports all Marker ids supported by xmind-generator`
- `markers > maps marker name to MarkerId`
- `markers > maps every supported marker name to same MarkerId id`
- `markers > rejects same marker group in one topic`
- `markers > rejects same marker group conflict for every marker group`

## Writer

测试文件：`tests/writer.test.ts`

- `public writer API > generates a non-empty xmind file from parsed input`
- `public writer API > runs semantic validation before writing`
- `public writer API > writes a zip file containing content and manifest`
- `public writer API > rejects filesystem errors from failed writes`

## CLI

测试文件：`tests/cli.test.ts`

- `CLI > generates xmind from fixture`
- `CLI > supports long output option`
- `CLI > prints validation error and exits non-zero`
- `CLI > prints usage and exits non-zero when arguments are missing`
- `CLI > prints schema JSON for AI/tool integration`
- `CLI > prints the AI template`
- `CLI > generates xmind from complete fixtures`
- `CLI > complete fixtures cover file images`

## Assets

测试文件：`tests/assets.test.ts`

- `AI-facing assets > schema.json mirrors the runtime schema`
- `AI-facing assets > ai-template.md contains the prompt contract and YAML skeleton`

## Package

测试文件：`tests/package.test.ts`

- `package scripts > provides a compile command for a standalone binary`

## Public API 和 Types

测试文件：`tests/scaffold.test.ts`

- `public API scaffold > exports the planned public entry points`

测试文件：`tests/types.test.ts`

- `domain errors > carry code, path and message`
- `domain errors > exports all domain error classes`
- `domain errors > exports runtime error classes from public entry`
- `domain errors > public entry errors can be caught by class`

