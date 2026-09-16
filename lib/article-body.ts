/**
 * `CourseLesson.articleBody` — what an ARTICLE lesson says, stored as the rich
 * text editor's own JSON document.
 *
 * **JSON rather than HTML or Markdown**, because it is the one format that can
 * be checked against a whitelist exactly. Stored HTML would need sanitising on
 * every render and trusting a sanitiser with markup a student's browser runs;
 * Markdown round-trips lossily through an editor. A document tree can be walked
 * here, node by node, and anything this lesson type does not offer — a link, an
 * image, an attribute — is dropped before it is ever written. What reaches the
 * column is then renderable by anything without a second pass.
 *
 * The vocabulary is the one the editor's toolbar offers and nothing more:
 * paragraphs, two heading levels, bulleted and numbered lists, and bold and
 * italic text.
 */

export type ArticleMark = { type: "bold" | "italic" }

export type ArticleNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: ArticleNode[]
  text?: string
  marks?: ArticleMark[]
}

export type ArticleDoc = { type: "doc"; content: ArticleNode[] }

const BLOCKS = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
])
const MARKS = new Set(["bold", "italic"])

/**
 * Returns a clean document, or null when the input is not one at all. Unknown
 * nodes are dropped with their subtree; unknown marks and attributes are
 * dropped on their own.
 */
export function sanitizeArticle(input: unknown): ArticleDoc | null {
  if (!isRecord(input) || input.type !== "doc") return null
  return { type: "doc", content: cleanChildren(input.content, 0) }
}

function cleanChildren(value: unknown, depth: number): ArticleNode[] {
  // Nested lists are legitimate, but a document a hundred levels deep is not
  // something the toolbar can produce.
  if (!Array.isArray(value) || depth > 12) return []
  return value.flatMap((child) => {
    const node = cleanNode(child, depth)
    return node ? [node] : []
  })
}

function cleanNode(value: unknown, depth: number): ArticleNode | null {
  if (!isRecord(value) || typeof value.type !== "string") return null

  if (value.type === "text") {
    if (typeof value.text !== "string" || value.text === "") return null
    const marks = Array.isArray(value.marks)
      ? value.marks.flatMap((mark) =>
          isRecord(mark) &&
          typeof mark.type === "string" &&
          MARKS.has(mark.type)
            ? [{ type: mark.type as ArticleMark["type"] }]
            : []
        )
      : []
    return marks.length > 0
      ? { type: "text", text: value.text, marks }
      : { type: "text", text: value.text }
  }

  if (value.type === "hardBreak") return { type: "hardBreak" }
  if (!BLOCKS.has(value.type)) return null

  const node: ArticleNode = {
    type: value.type,
    content: cleanChildren(value.content, depth + 1),
  }

  if (value.type === "heading") {
    const level = isRecord(value.attrs) ? value.attrs.level : undefined
    node.attrs = { level: level === 3 ? 3 : 2 }
  }
  if (value.type === "orderedList") {
    const start = isRecord(value.attrs) ? value.attrs.start : undefined
    node.attrs = {
      start:
        typeof start === "number" && Number.isInteger(start) && start > 0
          ? Math.min(start, 10_000)
          : 1,
    }
  }

  return node
}

/** Every word of running text, for the lesson's "N min read". */
export function articleWordCount(doc: ArticleDoc): number {
  let words = 0
  const walk = (nodes: ArticleNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.text) {
        words += node.text.split(/\s+/).filter(Boolean).length
      }
      walk(node.content)
    }
  }
  walk(doc.content)
  return words
}

/**
 * Parses a stored column back into a document. A body written before this
 * format existed (plain prose) is kept as paragraphs rather than thrown away.
 */
export function parseArticle(stored: string | null): ArticleDoc | null {
  if (!stored) return null
  try {
    return sanitizeArticle(JSON.parse(stored))
  } catch {
    return {
      type: "doc",
      content: stored
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.trim() !== "")
        .map((paragraph) => ({
          type: "paragraph",
          content: [{ type: "text", text: paragraph.trim() }],
        })),
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
