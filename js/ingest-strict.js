// js/ingest-strict.js
// Stage A — Strict parse using Papa Parse with TSV settings
window.strictTSVIngest = async function strictTSVIngest(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const text = await res.text();

  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,               // use the header row
      delimiter: '\t',            // TSV
      skipEmptyLines: false,      // we’ll filter empties manually
      quoteChar: '\0',            // disable quote handling (let quotes be literal)
      newline: '\n',              // normalize later if needed
      transformHeader: (h) => (h || '').trim(),
      complete: (results) => {
        // Drop fully-empty rows that appear after the data
        const rows = (results.data || []).filter((r) =>
          Object.values(r).some((v) => (v ?? '').toString().trim() !== '')
        );
        resolve({ rows, errors: results.errors || [] });
      },
    });
  });
};
