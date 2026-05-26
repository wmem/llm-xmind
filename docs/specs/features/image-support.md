# 功能规格：图片支持

## 支持形式

### file

```yaml
image:
  kind: file
  path: fixtures/image.svg
```

### data-uri

```yaml
image:
  kind: data-uri
  name: image.png
  data: data:image/png;base64,...
```

### svg

```yaml
image:
  kind: svg
  name: diagram.svg
  content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
```

## SVG data URI

SVG data URI 允许输入，但写入 XMind 前会规范化为原始 SVG bytes，不保留 `data:image/svg+xml,...` 字符串。

支持：

- base64 SVG data URI。
- URL-encoded SVG data URI。
- `utf8` SVG data URI。
- inline SVG XML。
- self-closing SVG。

## 不支持

- 不做 SVG 转 PNG。
- 不接受非法 SVG。
- 不接受未知 SVG data URI 参数。
- 不接受重复 `base64` 参数。

## 测试

- `tests/image.test.ts`
- `tests/converter.test.ts`
- `tests/cli.test.ts`

