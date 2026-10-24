const headingPattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const unorderedListPattern = /^\s*[-+*]\s+(.+)$/;
const orderedListPattern = /^\s*\d+[.)]\s+(.+)$/;
const codeFencePattern = /^\s*```/;

function parseInline(text) {
  const inlinePattern =
    /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|~~(.+?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      nodes.push({ type: "strong", children: parseInline(match[2]) });
    } else if (match[3]) {
      nodes.push({ type: "emphasis", children: parseInline(match[4]) });
    } else if (match[5]) {
      nodes.push({ type: "deleted", children: parseInline(match[5]) });
    } else if (match[6]) {
      nodes.push({ type: "code", value: match[6] });
    } else {
      const href = /^(https?:\/\/|mailto:)/i.test(match[8]) ? match[8] : null;
      nodes.push({ type: "link", href, children: parseInline(match[7]) });
    }

    lastIndex = inlinePattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", value: text.slice(lastIndex) });
  }

  return nodes;
}

function isBlockStart(line) {
  return (
    headingPattern.test(line) ||
    unorderedListPattern.test(line) ||
    orderedListPattern.test(line) ||
    /^\s*>/.test(line) ||
    codeFencePattern.test(line)
  );
}

export function parseAssistantMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(headingPattern);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        children: parseInline(heading[2]),
      });
      index += 1;
      continue;
    }

    if (codeFencePattern.test(line)) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !codeFencePattern.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "codeBlock", value: codeLines.join("\n") });
      continue;
    }

    const listType = unorderedListPattern.test(line)
      ? "unorderedList"
      : orderedListPattern.test(line)
        ? "orderedList"
        : null;
    if (listType) {
      const items = [];
      const pattern =
        listType === "unorderedList" ? unorderedListPattern : orderedListPattern;
      while (index < lines.length) {
        const item = lines[index].match(pattern);
        if (!item) break;
        items.push(parseInline(item[1]));
        index += 1;
      }
      blocks.push({ type: listType, items });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({
        type: "blockquote",
        children: parseInline(quoteLines.join(" ")),
      });
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({
      type: "paragraph",
      children: parseInline(paragraphLines.join(" ")),
    });
  }

  return blocks;
}
