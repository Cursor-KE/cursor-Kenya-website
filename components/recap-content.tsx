import type { ReactNode } from 'react'

function inlineText (text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
    return part
  })
}

export function RecapContent ({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) { index++; continue }

    if (line.startsWith('### ')) {
      blocks.push(<h3 key={index}>{inlineText(line.slice(4))}</h3>)
      index++; continue
    }
    if (line.startsWith('## ')) {
      blocks.push(<h2 key={index}>{inlineText(line.slice(3))}</h2>)
      index++; continue
    }
    if (line.startsWith('> ')) {
      blocks.push(<blockquote key={index}>{inlineText(line.slice(2))}</blockquote>)
      index++; continue
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = []
      const start = index
      while (index < lines.length && /^\s*[-*] /.test(lines[index])) {
        items.push(lines[index].trim().slice(2)); index++
      }
      blocks.push(<ul key={start}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineText(item)}</li>)}</ul>)
      continue
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      const start = index
      while (index < lines.length && /^\s*\d+\. /.test(lines[index])) {
        items.push(lines[index].trim().replace(/^\d+\. /, '')); index++
      }
      blocks.push(<ol key={start}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineText(item)}</li>)}</ol>)
      continue
    }

    const paragraph: string[] = [line]
    const start = index
    index++
    while (index < lines.length && lines[index].trim() && !/^(## |### |> |[-*] |\d+\. )/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim()); index++
    }
    blocks.push(<p key={start}>{inlineText(paragraph.join(' '))}</p>)
  }

  return <div className="recap-prose">{blocks}</div>
}
