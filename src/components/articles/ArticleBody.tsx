import { Fragment } from 'react'
import { parseArticleBlocks, parseInlineTokens } from '@/lib/article-content'

function renderInline(text: string) {
  const tokens = parseInlineTokens(text)
  return tokens.map((token, idx) => {
    if (token.type === 'bold') {
      return (
        <strong key={idx} className="font-extrabold text-[#0f2744] dark:text-[#eef5fd]">
          {token.text}
        </strong>
      )
    }
    if (token.type === 'code') {
      return (
        <code
          key={idx}
          dir="ltr"
          className="rounded-md bg-[#eef4fb] dark:bg-[#162742] px-1.5 py-0.5 font-mono text-[0.88em] text-[#0369a1] dark:text-[#7dd3fc]"
        >
          {token.text}
        </code>
      )
    }
    if (token.type === 'link') {
      return (
        <a
          key={idx}
          href={token.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-bold text-[#0284c7] dark:text-[#38bdf8] underline decoration-[#38bdf8]/50 underline-offset-4 hover:text-[#0369a1] dark:hover:text-[#7dd3fc] transition-colors break-words"
        >
          {token.text}
        </a>
      )
    }
    return <Fragment key={idx}>{token.text}</Fragment>
  })
}

export function ArticleBody({ content }: { content: string }) {
  const blocks = parseArticleBlocks(content)
  if (!blocks.length) return null

  return (
    <div className="space-y-5 text-[15.5px] sm:text-[17px] leading-[1.95] text-[#29405b] dark:text-[#c7d8ec]">
      {blocks.map((block, index) => {
        if (block.type === 'h2') {
          return (
            <h2
              key={index}
              className="pt-4 text-xl sm:text-2xl font-extrabold text-[#0f2744] dark:text-[#f0f6fe] leading-snug"
            >
              {renderInline(block.text)}
            </h2>
          )
        }
        if (block.type === 'h3') {
          return (
            <h3
              key={index}
              className="pt-2 text-lg sm:text-xl font-bold text-[#0f2744] dark:text-[#e6f0fb] leading-snug"
            >
              {renderInline(block.text)}
            </h3>
          )
        }
        if (block.type === 'quote') {
          return (
            <blockquote
              key={index}
              className="rounded-2xl border-s-4 border-[#0284c7] bg-[#f1f8fe] dark:bg-[#10223c] px-5 py-4 text-[#1e3a5f] dark:text-[#cde4fa] font-medium"
            >
              {renderInline(block.text)}
            </blockquote>
          )
        }
        if (block.type === 'ul') {
          return (
            <ul key={index} className="space-y-2.5 ps-5 list-disc marker:text-[#0284c7]">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === 'ol') {
          return (
            <ol key={index} className="space-y-2.5 ps-5 list-decimal marker:font-bold marker:text-[#0284c7]">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          )
        }
        return (
          <p key={index} className="leading-[1.95] whitespace-pre-wrap break-words">
            {renderInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}
