// js/ui-components.js

// HTML escaping helpers
function esc(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
function escAttr(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// Word-safe truncation around ~300 chars
function truncateAtWord(str = '', max = 300) {
  const text = String(str);
  if (text.length <= max) return { short: text, truncated: false };
  const cut = text.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  const short = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, max)).trim() + '…';
  return { short, truncated: true };
}

window.renderQuoteCard = function renderQuoteCard(row, repairNotes = []) {
  const safe = (v) => (window.cleanText ? window.cleanText(v) : (v || ''));

  const {
    record_id, event_date, event_type, event_title,
    show_or_host, clip_url, quote_text, tweet_text, tags, status,
  } = row;

  // YouTube helpers
  const ytId = window.extractYouTubeId ? window.extractYouTubeId(safe(clip_url)) : null;
  const normalizedURL = window.normalizeYouTubeUrl ? window.normalizeYouTubeUrl(safe(clip_url)) : safe(clip_url);

  // Tags → chips
  const tagChips = safe(tags)
    .split('|')
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => `<span class="tag" data-tag="${escAttr(t)}">${esc(t)}</span>`)
    .join(' ');

  // Repair badge
  const repaired = (repairNotes && repairNotes.length)
    ? `<span class="badge" title="${esc(repairNotes.join(' • '))}">⚠︎ auto-repaired</span>`
    : '';

  // Tweet ABOVE the quote (full text) + copy button
  const tweetTextClean = safe(tweet_text);
  const tweetHtml = tweetTextClean
    ? `
      <div class="line-header">
        <strong>Tweet:</strong>
        <button class="button sm copy-btn" data-copy="${escAttr(tweetTextClean)}">Copy tweet</button>
      </div>
      <div class="quote-body" aria-label="Tweet text">${esc(tweetTextClean).replaceAll('\n', '<br>')}</div>
    `
    : '';

  // Quote with button-driven toggle; header has Expand/Collapse + Copy Quote
  const fullQuoteText = safe(quote_text);
  const fullQuoteHtml = esc(fullQuoteText).replaceAll('\n', '<br>');
  const { short, truncated } = truncateAtWord(fullQuoteText, 300);
  const shortQuoteHtml = esc(short).replaceAll('\n', '<br>');

  const quoteHtml = truncated
    ? `
      <div class="collapsible" data-record="${escAttr(safe(record_id))}">
        <div class="line-header">
          <strong>Quote:</strong>
          <button class="button accent sm toggle-btn" aria-expanded="false">Expand ▾</button>
          <button class="button sm copy-btn" data-copy="${escAttr(fullQuoteText)}">Copy quote</button>
        </div>
        <div class="quote-body trunc">${shortQuoteHtml}</div>
        <div class="quote-body full">${fullQuoteHtml}</div>
      </div>
    `
    : `
      <div class="line-header">
        <strong>Quote:</strong>
        <button class="button sm copy-btn" data-copy="${escAttr(fullQuoteText)}">Copy quote</button>
      </div>
      <div class="quote-body" aria-label="Quote text">${fullQuoteHtml}</div>
    `;

  // Build the card
  return `
  <article class="card" data-record="${escAttr(safe(record_id))}" aria-label="Quote card">
    <header>
      <h2>${esc(safe(event_title) || '(untitled)')}</h2>
      <div class="meta">
        <span>${esc(safe(event_date))}</span>
        <span class="type-badge">${esc(safe(event_type))}</span>
        <span class="muted">${esc(safe(show_or_host))}</span>
        <span class="muted">Status: ${esc(safe(status))}</span>
        ${repaired}
      </div>
    </header>

    ${tweetHtml}
    ${quoteHtml}

    ${tagChips ? `<div class="tags">${tagChips}</div>` : ''}

    <div class="embed" role="group" aria-label="Clip">
      ${ytId ? `<iframe width="100%" height="215" src="https://www.youtube.com/embed/${esc(ytId)}"
                title="YouTube video" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen loading="lazy"></iframe>`
             : `<div class="muted">No video available</div>`}
    </div>

    ${normalizedURL ? `
      <div class="clip-block" style="margin-top:.5rem">
        <div class="line-header"><strong>Clip:</strong></div>
        <div class="clip-url" style="margin:.25rem 0;">
          <a href="${escAttr(normalizedURL)}" target="_blank" rel="noopener" style="word-break:break-all;">${esc(normalizedURL)}</a>
        </div>
        <div class="clip-actions">
          <button class="button sm copy-btn" data-copy="${escAttr(normalizedURL)}">Copy URL</button>
        </div>
      </div>
    ` : ''}

  </article>
  `;
};
