/**
 * Formats raw HTML string with clean indentation
 */
export function formatHtml(html: string): string {
  if (!html) return '';

  // Limit processing size to prevent freezing the browser thread on massive DOM dumps
  const MAX_PROCESS_LEN = 150000;
  const isTruncated = html.length > MAX_PROCESS_LEN;
  const safeHtml = isTruncated ? html.slice(0, MAX_PROCESS_LEN) : html;

  let formatted = '';
  let indent = 0;
  const tab = '  ';

  // Fast, linear tag splitting without catastrophic backtracking regex
  const tokens = safeHtml
    .replace(/>\s*</g, '>\n<')
    .split('\n');

  const maxLines = 1500;
  const lineCount = Math.min(tokens.length, maxLines);

  for (let i = 0; i < lineCount; i++) {
    const rawLine = tokens[i].trim();
    if (!rawLine) continue;

    // Check closing tag
    if (rawLine.startsWith('</')) {
      indent = Math.max(0, indent - 1);
    }

    formatted += tab.repeat(indent) + rawLine + '\n';

    // Check opening tag that isn't self-closing and isn't doctype/comment
    const isOpeningTag =
      rawLine.startsWith('<') &&
      !rawLine.startsWith('</') &&
      !rawLine.startsWith('<!') &&
      !rawLine.startsWith('<?') &&
      !rawLine.endsWith('/>') &&
      !isVoidElement(rawLine);

    if (isOpeningTag) {
      indent++;
    }
  }

  if (tokens.length > maxLines || isTruncated) {
    formatted += '\n<!-- Remaining content truncated for performance -->\n';
  }

  return formatted.trimEnd();
}

function isVoidElement(tagLine: string): boolean {
  const match = tagLine.match(/^<([a-zA-Z0-9-]+)/);
  if (!match) return false;
  const tagName = match[1].toLowerCase();
  const voidTags = [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ];
  return voidTags.includes(tagName);
}

export interface SyntaxToken {
  type: 'tag' | 'attr-name' | 'attr-val' | 'text' | 'comment' | 'doctype' | 'punctuation';
  content: string;
}

/**
 * Parses an HTML line into syntax tokens for rich coloring
 */
export function tokenizeHtmlLine(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    if (line.startsWith('<!--', i)) {
      const end = line.indexOf('-->', i);
      if (end !== -1) {
        tokens.push({ type: 'comment', content: line.slice(i, end + 3) });
        i = end + 3;
      } else {
        tokens.push({ type: 'comment', content: line.slice(i) });
        i = len;
      }
      continue;
    }

    if (line.startsWith('<!', i)) {
      const end = line.indexOf('>', i);
      if (end !== -1) {
        tokens.push({ type: 'doctype', content: line.slice(i, end + 1) });
        i = end + 1;
      } else {
        tokens.push({ type: 'doctype', content: line.slice(i) });
        i = len;
      }
      continue;
    }

    if (line[i] === '<') {
      tokens.push({ type: 'punctuation', content: '<' });
      i++;
      if (line[i] === '/') {
        tokens.push({ type: 'punctuation', content: '/' });
        i++;
      }

      // Tag name
      let tag = '';
      while (i < len && /[a-zA-Z0-9-]/.test(line[i])) {
        tag += line[i];
        i++;
      }
      if (tag) {
        tokens.push({ type: 'tag', content: tag });
      }

      // Attributes inside the tag until '>'
      while (i < len && line[i] !== '>') {
        if (line[i] === '/' && line[i + 1] === '>') {
          tokens.push({ type: 'punctuation', content: '/>' });
          i += 2;
          break;
        }

        // Whitespace
        if (/\s/.test(line[i])) {
          let ws = '';
          while (i < len && /\s/.test(line[i])) {
            ws += line[i];
            i++;
          }
          tokens.push({ type: 'text', content: ws });
          continue;
        }

        // Attribute name
        let attr = '';
        while (i < len && /[^\s=>/]/.test(line[i])) {
          attr += line[i];
          i++;
        }
        if (attr) {
          tokens.push({ type: 'attr-name', content: attr });
        }

        if (i < len && line[i] === '=') {
          tokens.push({ type: 'punctuation', content: '=' });
          i++;

          // Attribute value
          if (i < len && (line[i] === '"' || line[i] === "'")) {
            const quote = line[i];
            let val = quote;
            i++;
            while (i < len && line[i] !== quote) {
              val += line[i];
              i++;
            }
            if (i < len && line[i] === quote) {
              val += quote;
              i++;
            }
            tokens.push({ type: 'attr-val', content: val });
          } else {
            // Unquoted value
            let val = '';
            while (i < len && /[^\s>]/.test(line[i])) {
              val += line[i];
              i++;
            }
            if (val) {
              tokens.push({ type: 'attr-val', content: val });
            }
          }
        }
      }

      if (i < len && line[i] === '>') {
        tokens.push({ type: 'punctuation', content: '>' });
        i++;
      }
      continue;
    }

    // Plain text content
    let text = '';
    while (i < len && line[i] !== '<') {
      text += line[i];
      i++;
    }
    if (text) {
      tokens.push({ type: 'text', content: text });
    }
  }

  return tokens;
}
