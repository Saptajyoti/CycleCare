import { parseAssistantMarkdown } from "../utils/assistantMarkdown";

function renderInline(nodes) {
  return nodes.map((node, index) => {
    const key = `inline-${index}`;
    switch (node.type) {
      case "strong":
        return <strong key={key}>{renderInline(node.children)}</strong>;
      case "emphasis":
        return <em key={key}>{renderInline(node.children)}</em>;
      case "deleted":
        return <del key={key}>{renderInline(node.children)}</del>;
      case "code":
        return <code key={key}>{node.value}</code>;
      case "link":
        return node.href ? (
          <a key={key} href={node.href} rel="noreferrer" target="_blank">
            {renderInline(node.children)}
          </a>
        ) : (
          <span key={key}>{renderInline(node.children)}</span>
        );
      default:
        return node.value;
    }
  });
}

export function AssistantMarkdown({ content }) {
  return parseAssistantMarkdown(content).map((block, index) => {
    const key = `block-${index}`;
    switch (block.type) {
      case "heading": {
        const Heading = `h${block.level}`;
        return <Heading key={key}>{renderInline(block.children)}</Heading>;
      }
      case "unorderedList":
        return (
          <ul key={key}>
            {block.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      case "orderedList":
        return (
          <ol key={key}>
            {block.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      case "blockquote":
        return <blockquote key={key}>{renderInline(block.children)}</blockquote>;
      case "codeBlock":
        return (
          <pre key={key}>
            <code>{block.value}</code>
          </pre>
        );
      default:
        return <p key={key}>{renderInline(block.children)}</p>;
    }
  });
}
