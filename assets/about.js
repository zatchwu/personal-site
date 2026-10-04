import { renderMarkdown } from './markdown.js';

// Ignore raw HTML, including the editing instructions in Markdown comments.
const introduction = document.querySelector('[data-markdown]');

if (introduction) {
  try {
    const response = await fetch(introduction.dataset.markdown, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Markdown request failed: ${response.status}`);
    introduction.innerHTML = renderMarkdown(await response.text(), location.href);
    for (const paragraph of introduction.querySelectorAll('p')) {
      const text = paragraph.textContent.trim();
      if (text.startsWith('[') && text.endsWith(']')) paragraph.classList.add('placeholder');
    }
    introduction.dataset.markdownState = 'ready';
  } catch (error) {
    // Keep the static introduction visible if the Markdown cannot be loaded.
    introduction.dataset.markdownState = 'fallback';
    console.warn('Could not load About Me Markdown.', error);
  }
}
