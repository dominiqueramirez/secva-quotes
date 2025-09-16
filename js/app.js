// js/app.js
document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');

  // Normalize display text but KEEP smart punctuation; just map to readable ASCII where needed.
  function cleanText(str) {
    if (!str) return '';
    return String(str)
      // normalize spaces
      .replace(/\u00A0/g, ' ')                    // NBSP → space
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')// zero-width → remove
      // quotes
      .replace(/[\u2018\u2019]/g, "'")            // curly single → '
      .replace(/[\u201C\u201D]/g, '"')            // curly double → "
      // dashes
      .replace(/([\w])[\u2013\u2014]([\w])/g, '$1 — $2') // ensure spacing around en/em dash between letters
      .replace(/[\u2013\u2014]/g, '—')            // unify to em dash
      // misc
      .replace(/\u2026/g, '...')                  // ellipsis
      .replace(/\uFFFD/g, '');                    // replacement char
  }
  window.cleanText = cleanText;

  // Toolbar elements
  const $q = document.getElementById('q');
  const $type = document.getElementById('typeFilter');
  const $status = document.getElementById('statusFilter');
  const $sort = document.getElementById('sortOrder');
  const $clear = document.getElementById('clearFilters');
  const $activeTagWrap = document.getElementById('activeTagWrap');

  const state = { q: '', type: '', status: '', tag: '', sort: 'desc' };
  let allRows = [];

  function renderActiveTag() {
    if (!state.tag) { $activeTagWrap.innerHTML = ''; return; }
    $activeTagWrap.innerHTML = `<span class="tag" role="button" title="Click to clear tag filter">${state.tag} ✕</span>`;
  }

  function renderGrid(rows) {
    const grid = document.getElementById('grid');
    const html = rows.map((row) => {
      const cleaned = {
        ...row,
        record_id: cleanText(row.record_id),
        event_date: cleanText(row.event_date),
        event_type: cleanText(row.event_type),
        event_title: cleanText(row.event_title),
        show_or_host: cleanText(row.show_or_host),
        clip_url: cleanText(row.clip_url),
        quote_text: cleanText(row.quote_text),
        tweet_text: cleanText(row.tweet_text),
        tags: cleanText(row.tags),
        status: cleanText(row.status),
      };
      return window.renderQuoteCard(cleaned, []);
    }).join('');
    grid.innerHTML = html;
  }

  function applyAndRender() {
    const filtered = window.SearchLib.filterRows(allRows, state);
    const statusLine = document.getElementById('status');
    statusLine.textContent = `Loaded ${filtered.length} quotes${state.tag ? ` · tag: ${state.tag}` : ''}.`;
    renderActiveTag();
    renderGrid(filtered);
  }

  try {
    app.innerHTML = '';
    app.insertAdjacentHTML('afterbegin', `<p id="status" class="muted" aria-live="polite">Loading…</p>`);
    app.insertAdjacentHTML('beforeend', `<section class="grid" id="grid" aria-live="polite"></section>`);

    // Use lenient ingest (now preserves punctuation)
    const { rows: lenientRows } = await window.lenientTSVIngest('data/secretary_quotes.tsv');
    allRows = lenientRows;

    applyAndRender();

    // Toolbar handlers
    $q.addEventListener('input', (e) => { state.q = e.target.value; applyAndRender(); });
    $type.addEventListener('change', (e) => { state.type = e.target.value; applyAndRender(); });
    $status.addEventListener('change', (e) => { state.status = e.target.value; applyAndRender(); });
    $sort.addEventListener('change', (e) => { state.sort = e.target.value; applyAndRender(); });
    $clear.addEventListener('click', () => {
      state.q = state.type = state.status = state.tag = ''; state.sort = 'desc';
      $q.value = ''; $type.value = ''; $status.value = ''; $sort.value = 'desc';
      applyAndRender();
    });

    const grid = document.getElementById('grid');
    grid.addEventListener('click', async (e) => {
      // Tag filter
      const chip = e.target.closest('.tag');
      if (chip && chip.dataset && chip.dataset.tag) { state.tag = chip.dataset.tag; applyAndRender(); return; }

      // Expand/Collapse
      const toggle = e.target.closest('.toggle-btn');
      if (toggle) {
        const container = toggle.closest('.collapsible');
        if (container) {
          const expanded = container.classList.toggle('expanded');
          container.querySelectorAll('.toggle-btn').forEach((btn) => btn.setAttribute('aria-expanded', expanded ? 'true' : 'false'));
          container.querySelectorAll('.toggle-btn').forEach((btn) => (btn.textContent = expanded ? 'Collapse ▴' : 'Expand ▾'));
        }
        return;
      }

      // Copy buttons
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        const text = copyBtn.getAttribute('data-copy') || '';
        try {
          await navigator.clipboard.writeText(text);
          const prev = copyBtn.textContent; copyBtn.textContent = 'Copied!'; setTimeout(() => (copyBtn.textContent = prev), 1200);
        } catch {
          const prev = copyBtn.textContent; copyBtn.textContent = 'Copy failed'; setTimeout(() => (copyBtn.textContent = prev), 1400);
        }
      }
    });

    // Clear active tag by click
    $activeTagWrap.addEventListener('click', () => { if (!state.tag) return; state.tag = ''; applyAndRender(); });

  } catch (err) {
    console.error(err);
    app.insertAdjacentHTML('beforeend', `<p style="color:red;">Error: ${err.message}</p>`);
  }
});
