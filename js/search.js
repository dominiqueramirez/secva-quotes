// js/search.js

(function () {
  const norm = (s = '') =>
    String(s)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');

  function parseDateFlexible(s = '') {
    // Accept YYYY-MM-DD or M/D/YYYY
    const t = String(s).trim();
    if (!t) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; // already ISO
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [ , mm, dd, yyyy ] = m;
      const pad = (n) => String(n).padStart(2, '0');
      return `${yyyy}-${pad(mm)}-${pad(dd)}`;
    }
    // fallback: try dayjs parsing, may return Invalid Date
    try {
      const d = dayjs(t);
      if (d.isValid()) return d.format('YYYY-MM-DD');
    } catch {}
    return null;
  }

  function rowMatches(row, q) {
    if (!q) return true;
    const hay =
      norm(row.quote_text) + ' ' +
      norm(row.tweet_text) + ' ' +
      norm(row.event_title) + ' ' +
      norm(row.show_or_host) + ' ' +
      norm(row.tags);
    return hay.includes(norm(q));
  }

  function filterRows(rows, state) {
    const { q, type, status, tag } = state;
    let out = rows.filter((r) => {
      if (!rowMatches(r, q)) return false;
      if (type && String(r.event_type).toLowerCase() !== type) return false;
      if (status && String(r.status).toLowerCase() !== status) return false;
      if (tag) {
        const tags = String(r.tags || '')
          .split('|')
          .map((t) => t.trim().toLowerCase());
        if (!tags.includes(tag.toLowerCase())) return false;
      }

      // Date range filtering (inclusive). state may provide dateStart/dateEnd as
      // either YYYY-MM-DD or M/D/YYYY; parse to ISO for safe comparison.
      const start = parseDateFlexible(state.dateStart);
      const end = parseDateFlexible(state.dateEnd);
      if (start || end) {
        const ev = parseDateFlexible(r.event_date);
        // If the event date can't be parsed, exclude it when a date filter is active.
        if (!ev) return false;
        if (start && ev < start) return false;
        if (end && ev > end) return false;
      }
      return true;
    });

    // sort by event_date
    const dir = state.sort === 'asc' ? 1 : -1;
    out.sort((a, b) => {
      const da = parseDateFlexible(a.event_date) || '';
      const db = parseDateFlexible(b.event_date) || '';
      if (da === db) return 0;
      return da < db ? -1 * dir : 1 * dir;
    });

    return out;
  }

  // Expose helpers
  window.SearchLib = {
    filterRows,
    parseDateFlexible,
  };
})();
