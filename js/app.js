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
  const $dateStart = document.getElementById('dateStart');
  const $dateEnd = document.getElementById('dateEnd');
  const $sort = document.getElementById('sortOrder');
  const $clear = document.getElementById('clearFilters');
  const $activeTagWrap = document.getElementById('activeTagWrap');

  const state = { q: '', type: '', status: '', tag: '', sort: 'desc', dateStart: '', dateEnd: '' };
  let allRows = [];
  const $tagPanelToggle = document.getElementById('tagPanelToggle');
  const $tagList = document.getElementById('tagList');

  function renderActiveTag() {
    if (!state.tag) { $activeTagWrap.innerHTML = ''; return; }
    $activeTagWrap.innerHTML = `<span class="tag" role="button" title="Click to clear tag filter">${state.tag} ✕</span>`;
  }

  function computeTagCounts(rows) {
    const counts = Object.create(null);
    rows.forEach((r) => {
      const tags = String(r.tags || '').split('|').map(t => t.trim()).filter(Boolean);
      tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    });
    return counts;
  }

  function renderTagList(rows) {
    if (!$tagList) return;
    const counts = computeTagCounts(rows);
    const entries = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
    $tagList.innerHTML = entries.map((t) => {
      const c = counts[t];
      const active = state.tag === t ? ' active' : '';
      return `<button class="tag-item${active}" data-tag="${t}">${esc(t)}<span class="tag-count">${c}</span></button>`;
    }).join('');
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
  // Render tag list using allRows (hidden by default)
  if ($tagList) { $tagList.classList.remove('open'); $tagList.hidden = true; }
  renderTagList(allRows);

    // Toolbar handlers
    $q.addEventListener('input', (e) => { state.q = e.target.value; applyAndRender(); });
    $type.addEventListener('change', (e) => { state.type = e.target.value; applyAndRender(); });
    $status.addEventListener('change', (e) => { state.status = e.target.value; applyAndRender(); });
    if ($dateStart) $dateStart.addEventListener('change', (e) => { state.dateStart = e.target.value; applyAndRender(); });
    if ($dateEnd) $dateEnd.addEventListener('change', (e) => { state.dateEnd = e.target.value; applyAndRender(); });
    $sort.addEventListener('change', (e) => { state.sort = e.target.value; applyAndRender(); });
    $clear.addEventListener('click', () => {
      state.q = state.type = state.status = state.tag = state.dateStart = state.dateEnd = ''; state.sort = 'desc';
      $q.value = ''; $type.value = ''; $status.value = ''; $sort.value = 'desc';
      if ($dateStart) $dateStart.value = ''; if ($dateEnd) $dateEnd.value = '';
      applyAndRender();
    });

    const grid = document.getElementById('grid');
    grid.addEventListener('click', async (e) => {
      // Tag filter
      const chip = e.target.closest('.tag');
      if (chip && chip.dataset && chip.dataset.tag) { state.tag = chip.dataset.tag; applyAndRender(); renderTagList(allRows); return; }

      // Tag panel item click
      const tagItem = e.target.closest('.tag-item');
      if (tagItem && tagItem.dataset && tagItem.dataset.tag) {
        state.tag = tagItem.dataset.tag;
        applyAndRender();
        renderTagList(allRows);
        return;
      }

      // Expand/Collapse (quote-level collapsible and the new card-level toggle)
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

      const cardToggle = e.target.closest('.card-toggle');
      if (cardToggle) {
        const card = cardToggle.closest('.card');
        if (card) {
          const isCollapsed = card.classList.toggle('collapsed');
          cardToggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
          cardToggle.textContent = isCollapsed ? 'Expand ▾' : 'Collapse ▴';
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

    // Tag panel toggle
    if ($tagPanelToggle && $tagList) {
      $tagPanelToggle.addEventListener('click', (ev) => {
        // ensure this is treated as a plain button across browsers
        ev.preventDefault();
        const expanded = $tagPanelToggle.getAttribute('aria-expanded') === 'true';
        const willExpand = !expanded;
        $tagPanelToggle.setAttribute('aria-expanded', willExpand.toString());
        // Toggle a class instead of relying solely on hidden (Edge has quirks with focus/hidden)
        if (willExpand) {
          $tagList.classList.add('open');
          $tagList.hidden = false;
        } else {
          $tagList.classList.remove('open');
          // keep hidden attribute in sync for accessibility
          $tagList.hidden = true;
        }
      });
      // Handle clicks on tag items inside the header panel
      $tagList.addEventListener('click', (ev) => {
        const item = ev.target.closest('.tag-item');
        if (!item || !item.dataset) return;
        ev.preventDefault();
        const t = item.dataset.tag;
        state.tag = t;
        applyAndRender();
        renderTagList(allRows);
        // Close the tag list after selection and move focus back to toggle
        $tagList.classList.remove('open');
        $tagList.hidden = true;
        $tagPanelToggle.setAttribute('aria-expanded', 'false');
        $tagPanelToggle.focus();
      });
    }

  } catch (err) {
    console.error(err);
    app.insertAdjacentHTML('beforeend', `<p style="color:red;">Error: ${err.message}</p>`);
  }
});
