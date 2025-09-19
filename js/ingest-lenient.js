// js/ingest-lenient.js
// Lenient TSV ingestion that preserves smart punctuation and only strips real control chars.

window.lenientTSVIngest = async function lenientTSVIngest(url) {
  const res = await fetch(url);
  let text = await res.text();

  // Normalize line endings
  text = text.replace(/\r\n?/g, "\n");

  // Strip ONLY control characters (keep tab/newline/printable unicode)
  // - keep: \t (U+0009), \n (U+000A)
  // - remove: C0/C1 control blocks except the two above
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");

  // Normalize odd spaces: NBSP -> space, remove zero-widths/BOM
  text = text.replace(/\u00A0/g, " ");              // NBSP → normal space
  text = text.replace(/[\u200B-\u200D\u2060\uFEFF]/g, ""); // zero-width & BOM → remove

  const lines = text.split("\n").filter(l => l.length > 0);

  // Detect header row
  const HEADER = [
    "record_id","event_date","event_type","event_title",
    "show_or_host","clip_url","quote_text","tweet_text","tags","status"
  ];
  let startIdx = 0;
  if (lines.length) {
    const first = lines[0].split("\t").map(s => s.trim().toLowerCase());
    if (first.slice(0,10).join("|") === HEADER.join("|")) startIdx = 1;
  }

  const rows = [];
  const repairs = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let cells = line.split("\t");
    if (cells.length === 10) {
      rows.push(toRow(cells));
      continue;
    }

    let note = "";
    if (cells.length < 10) {
      const missing = 10 - cells.length;
      note = `row ${i + 1} had ${cells.length} fields; padded ${missing}`;
      cells = cells.concat(Array(missing).fill(""));
    } else {
      // >10 fields — right anchor last two, left anchor first six.
      // Middle fields probably contain parts of quote_text and (maybe) tweet_text.
      // Heuristic: take the LAST middle element as tweet_text and merge the rest into quote_text.
      const prefix = cells.slice(0, 6);    // record_id → clip_url
      const suffix = cells.slice(-2);      // tags, status
      const middle = cells.slice(6, -2);   // stuff that spilled into quote_text/tweet_text
      let mergedQuote = "";
      let tweetPart = "";
      if (middle.length === 1) {
        // only quote_text present (no tweet)
        mergedQuote = middle[0].trim();
      } else if (middle.length > 1) {
        // assume last middle column is tweet_text, rest belong to quote_text
        tweetPart = middle[middle.length - 1].trim();
        mergedQuote = middle.slice(0, -1).join(" ").trim();
      }
      cells = [...prefix, mergedQuote, tweetPart, ...suffix];
      note = `row ${i + 1} had ${cells.length} fields after merge; combined ${middle.length} middle fields into quote_text (and tweet_text if present)`;
    }

    repairs.push(note);
    rows.push(toRow(cells));
  }

  return { rows, repairs };

  function toRow(arr) {
    const [
      record_id = "", event_date = "", event_type = "", event_title = "",
      show_or_host = "", clip_url = "", quote_text = "", tweet_text = "",
      tags = "", status = ""
    ] = arr;
    return { record_id, event_date, event_type, event_title, show_or_host, clip_url, quote_text, tweet_text, tags, status };
  }
};
