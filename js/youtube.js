// js/youtube.js
// Helpers to extract a YouTube ID, parse start times, and build a normalized URL.

(function () {
  function extractYouTubeId(url = "") {
    if (!url) return null;
    const u = String(url).trim();

    // youtu.be/<id>
    let m = u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
    if (m) return m[1];

    // youtube.com/watch?v=<id>
    m = u.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
    if (m) return m[1];

    // youtube.com/embed/<id>
    m = u.match(/\/embed\/([A-Za-z0-9_-]{6,})/i);
    if (m) return m[1];

    // youtube.com/shorts/<id>
    m = u.match(/\/shorts\/([A-Za-z0-9_-]{6,})/i);
    if (m) return m[1];

    return null;
  }

  // Parse t/start like 1h2m3s, 90, 1m30s, etc
  function parseStartSeconds(url = "") {
    if (!url) return 0;
    try {
      const u = new URL(url, location.origin);
      const t = u.searchParams.get("t") || u.searchParams.get("start");
      if (!t) return 0;

      if (/^\d+$/.test(t)) return parseInt(t, 10);

      const r = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i.exec(t);
      if (!r) return 0;
      const h = parseInt(r[1] || "0", 10);
      const m = parseInt(r[2] || "0", 10);
      const s = parseInt(r[3] || "0", 10);
      return h * 3600 + m * 60 + s;
    } catch {
      // If it's not a valid URL, try a loose parse
      const q = String(url);
      const tParam = (q.match(/[?&](?:t|start)=([^&]+)/) || [])[1];
      if (!tParam) return 0;
      if (/^\d+$/.test(tParam)) return parseInt(tParam, 10);
      const r = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i.exec(tParam);
      if (!r) return 0;
      const h = parseInt(r[1] || "0", 10);
      const m = parseInt(r[2] || "0", 10);
      const s = parseInt(r[3] || "0", 10);
      return h * 3600 + m * 60 + s;
    }
  }

  // Build a neat, short URL like https://youtu.be/ID?t=123
  function normalizeYouTubeUrl(input = "") {
    const id = extractYouTubeId(input);
    if (!id) return input || "";
    const start = parseStartSeconds(input);
    return `https://youtu.be/${id}${start ? `?t=${start}` : ""}`;
  }

  // Expose
  window.extractYouTubeId = extractYouTubeId;
  window.normalizeYouTubeUrl = normalizeYouTubeUrl;
  window.extractYouTubeStartSeconds = parseStartSeconds;
})();
