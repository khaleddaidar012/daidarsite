export type ArticleBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; text: string }

export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string }

const DANGEROUS_PATTERNS = [
  /<\s*script\b/i,
  /<\s*iframe\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i,
  /<\s*svg\b/i,
  /<\s*style\b/i,
  /<\s*link\b/i,
  /<\s*meta\b/i,
  /\bon[a-z]+\s*=/i,
  /\bjavascript\s*:/i,
  /\bvbscript\s*:/i,
  /\bdata\s*:\s*text\/html/i,
]

export function hasUnsafeArticleMarkup(value: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(value))
}

export function isSafeHttpsUrl(raw: string): boolean {
  if (typeof raw !== 'string' || raw.length > 2000) return false
  try {
    const parsed = new URL(raw.trim())
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

export function validateMarkdownLinks(content: string): { ok: true } | { ok: false; reason: string } {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2].trim()
    if (!isSafeHttpsUrl(url)) {
      return { ok: false, reason: 'الروابط داخل المقال يجب أن تبدأ بـ https:// فقط.' }
    }
  }
  return { ok: true }
}

export function stripArticleFormatting(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractArticleExcerpt(content: string, maxLength = 190): string {
  const plain = stripArticleFormatting(content)
  if (plain.length <= maxLength) return plain
  const clipped = plain.slice(0, maxLength).trim()
  const lastSpace = clipped.lastIndexOf(' ')
  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trim()}…`
}

export function estimateReadingMinutes(content: string): number {
  const words = stripArticleFormatting(content).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 180))
}

export function parseArticleBlocks(raw: string): ArticleBlock[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const blocks: ArticleBlock[] = []
  let paragraphLines: string[] = []
  let ulItems: string[] = []
  let olItems: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push({ type: 'p', text: paragraphLines.join(' ').trim() })
      paragraphLines = []
    }
  }
  const flushUl = () => {
    if (ulItems.length) {
      blocks.push({ type: 'ul', items: ulItems })
      ulItems = []
    }
  }
  const flushOl = () => {
    if (olItems.length) {
      blocks.push({ type: 'ol', items: olItems })
      olItems = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushUl()
      flushOl()
      continue
    }
    if (line.startsWith('### ')) {
      flushParagraph(); flushUl(); flushOl()
      blocks.push({ type: 'h3', text: line.slice(4).trim() })
      continue
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushParagraph(); flushUl(); flushOl()
      blocks.push({ type: 'h2', text: line.replace(/^#{1,2}\s+/, '').trim() })
      continue
    }
    if (line.startsWith('> ')) {
      flushParagraph(); flushUl(); flushOl()
      blocks.push({ type: 'quote', text: line.slice(2).trim() })
      continue
    }
    const ulMatch = line.match(/^[-*•]\s+(.+)$/)
    if (ulMatch) {
      flushParagraph(); flushOl()
      ulItems.push(ulMatch[1].trim())
      continue
    }
    const olMatch = line.match(/^\d+[.)]\s+(.+)$/)
    if (olMatch) {
      flushParagraph(); flushUl()
      olItems.push(olMatch[1].trim())
      continue
    }
    flushUl(); flushOl()
    paragraphLines.push(line)
  }

  flushParagraph(); flushUl(); flushOl()
  return blocks
}

export function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^)\s]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    if (match[2] !== undefined) {
      tokens.push({ type: 'bold', text: match[2] })
    } else if (match[3] !== undefined) {
      tokens.push({ type: 'code', text: match[3] })
    } else if (match[4] !== undefined && match[5] !== undefined && isSafeHttpsUrl(match[5])) {
      tokens.push({ type: 'link', text: match[4], href: match[5] })
    } else {
      tokens.push({ type: 'text', text: match[0] })
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return tokens
}
