import { Marked } from './vendor/marked/marked.js';

const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export function renderMarkdown(source, baseURL) {
  const base = new URL(baseURL);
  function safeURL(href, image = false) {
    try {
      const url = new URL(href, base);
      if (image) return ['http:', 'https:'].includes(url.protocol) && url.origin === base.origin ? url.href : null;
      return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }
  const markdown = new Marked({ renderer: {
    html: () => '',
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      const url = safeURL(href);
      if (!url) return label;
      return `<a href="${escape(url)}" rel="noopener noreferrer"${title ? ` title="${escape(title)}"` : ''}>${label}</a>`;
    },
    image({ href, title, text }) {
      const url = safeURL(href, true);
      if (!url) return escape(text);
      return `<img src="${escape(url)}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ''} loading="lazy" decoding="async">`;
    }
  }});
  return markdown.parse(source);
}
