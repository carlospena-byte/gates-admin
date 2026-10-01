import type { ReactNode } from "react";

/**
 * Renders an incident description written in the resident app's editor:
 * a tiny HTML subset (`p`, `strong`, `em`, `a`, `ul`/`li`). The markup is
 * parsed and rebuilt as React elements, so nothing is ever injected as raw
 * HTML; any other tag is flattened to its text, and links are limited to
 * http(s)/mailto. Legacy plain-text descriptions render as-is.
 */
const LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

function isSafeHref(href: string | null): href is string {
  if (!href) return false;
  try {
    return LINK_PROTOCOLS.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

function renderNodes(nodes: NodeListOf<ChildNode>, keyPrefix: string): ReactNode[] {
  return Array.from(nodes).map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as Element;
    const children = renderNodes(el.childNodes, key);
    switch (el.tagName.toLowerCase()) {
      case "p":
        return <p key={key}>{children}</p>;
      case "strong":
      case "b":
        return <strong key={key}>{children}</strong>;
      case "em":
      case "i":
        return <em key={key}>{children}</em>;
      case "ul":
        return (
          <ul key={key} className="list-disc pl-5">
            {children}
          </ul>
        );
      case "li":
        return <li key={key}>{children}</li>;
      case "a": {
        const href = el.getAttribute("href");
        return isSafeHref(href) ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline">
            {children}
          </a>
        ) : (
          <span key={key}>{children}</span>
        );
      }
      default:
        return <span key={key}>{children}</span>;
    }
  });
}

export function RichDescription({ html }: { html: string }) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return <div className="space-y-1 text-sm text-muted-foreground">{renderNodes(doc.body.childNodes, "d")}</div>;
}
