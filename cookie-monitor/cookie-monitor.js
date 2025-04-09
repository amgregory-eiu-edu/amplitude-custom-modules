// === Amplitude Cookie Monitor ===
// Logs cookies on load and before unload, detects cookie changes over time

function cookie_monitor() {
  if (DEBUG) console.log("[Cookie Monitor] Initializing");

  const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {}, identify: () => {} };
  const EXCLUDE = ["_ga", "_gid", "_gat", "AMP_", "cart_value", "form_error_count"]; // Add known cookie keys to exclude
  const STORAGE_KEY = "__amp_cookie_snapshot";

  function getFilteredCookies() {
    return document.cookie
      .split("; ")
      .filter(c => !EXCLUDE.some(ex => c.startsWith(ex)))
      .sort(); // Sort to make comparison easier
  }

  function logCookieSummary(eventType) {
    const cookies = getFilteredCookies();
    amp.logEvent("cookie_summary_updated", {
      type: eventType,
      count: cookies.length,
      cookies: cookies.join("; ")
    });
    if (DEBUG) console.log(`[Cookie Monitor] ${eventType} cookies`, cookies);
  }

  function checkForChanges() {
    const currentCookies = getFilteredCookies();
    const currentMap = Object.fromEntries(currentCookies.map(c => c.split("=")));
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const previousMap = stored ? JSON.parse(stored) : {};

    const changes = [];

    // Compare keys
    const allKeys = new Set([...Object.keys(currentMap), ...Object.keys(previousMap)]);
    allKeys.forEach((key) => {
      const oldVal = previousMap[key];
      const newVal = currentMap[key];
      if (oldVal !== newVal) {
        changes.push({ cookie: key, old: oldVal || null, current: newVal || null });
      }
    });

    if (changes.length > 0) {
      amp.logEvent("cookie_changed", { changes });

      // Increment the cookie_changed user property by 1
      const identify = new amplitude.Identify().add("cookie_changed", 1);
      amp.identify(identify);

      if (DEBUG) console.log("[Cookie Monitor] Cookie changes detected", changes);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentMap));
    } else {
      if (DEBUG) console.log("[Cookie Monitor] No cookie changes detected");
    }
  }

  window.addEventListener("load", () => {
    logCookieSummary("page_load");
    checkForChanges();
  });

  window.addEventListener("beforeunload", () => {
    logCookieSummary("before_unload");
  });

  setInterval(checkForChanges, 10000); // Recheck every 10 seconds
}