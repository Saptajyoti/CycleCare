import test from "node:test";
import assert from "node:assert/strict";
import { parseAssistantMarkdown } from "./assistantMarkdown.js";

test("formats assistant paragraphs, emphasis, and lists as Markdown blocks", () => {
  const blocks = parseAssistantMarkdown(
    "A **helpful** answer.\nStill in this paragraph.\n\n- First item\n- *Second item*"
  );

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "paragraph");
  assert.deepEqual(blocks[0].children, [
    { type: "text", value: "A " },
    { type: "strong", children: [{ type: "text", value: "helpful" }] },
    { type: "text", value: " answer. Still in this paragraph." },
  ]);
  assert.equal(blocks[1].type, "unorderedList");
  assert.deepEqual(blocks[1].items[1], [
    { type: "emphasis", children: [{ type: "text", value: "Second item" }] },
  ]);
});

test("supports headings, numbered lists, inline code, and fenced code", () => {
  const blocks = parseAssistantMarkdown(
    "# Summary\n\n1. First\n2. Use `notes`\n\n```\nplain <tag>\n```"
  );

  assert.deepEqual(
    blocks.map(({ type }) => type),
    ["heading", "orderedList", "codeBlock"]
  );
  assert.deepEqual(blocks[1].items[1], [
    { type: "text", value: "Use " },
    { type: "code", value: "notes" },
  ]);
  assert.equal(blocks[2].value, "plain <tag>");
});

test("keeps raw HTML inert and rejects unsafe Markdown link schemes", () => {
  const blocks = parseAssistantMarkdown(
    '<img src=x onerror="alert(1)"> [unsafe](javascript:alert(1)) [safe](https://example.com)'
  );

  assert.deepEqual(blocks[0].children[0], {
    type: "text",
    value: '<img src=x onerror="alert(1)"> ',
  });
  assert.deepEqual(blocks[0].children[1], {
    type: "link",
    href: null,
    children: [{ type: "text", value: "unsafe" }],
  });
  assert.equal(blocks[0].children[3].href, "https://example.com");
});
