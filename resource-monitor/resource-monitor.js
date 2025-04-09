// === Amplitude Resource Monitor ===
// Tracks all resource loads and sends summary events when idle

function resource_monitor() {
  if (DEBUG) console.log("[Resource Monitor] Initializing");

  const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {} };
  let allResources = [];
  let idleTimeout = null;
  const IDLE_DELAY = 1000; // 1 second of no activity triggers summary
  const excludeList = ["amplitude.com", "api.amplitude.com"];
  
  const shouldExclude = (url) => {
    try {
      const domain = new URL(url).hostname;
      return excludeList.some(excluded => domain.endsWith(excluded));
    } catch (e) {
      if (DEBUG) console.error("[Resource Monitor] Invalid URL in exclusion check:", url, e);
      return false;
    }
  };

  const updateSummary = () => {
    const uniqueResources = Array.from(new Set(allResources.map(r => r.name)));
    const totalBytes = allResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

    const previousResources = JSON.parse(sessionStorage.getItem("__amp_resource_summary") || '{"totalResources":0,"totalTransferSizeKB":0}');
    const sessionResource = {
      totalResources: previousResources.totalResources + uniqueResources.length,
      totalTransferSizeKB: +(previousResources.totalTransferSizeKB + (totalBytes / 1024)).toFixed(2)
    };
    sessionStorage.setItem("__amp_resource_summary", JSON.stringify(sessionResource));

    amp.logEvent("resource_page_updated", {
      totalResources: uniqueResources.length,
      totalTransferSizeKB: +(totalBytes / 1024).toFixed(2)
    });
    
    amp.logEvent("resource_session_updated", sessionResource);

    if (DEBUG) console.log("[Resource Monitor] Logged summary", {
      totalResources: uniqueResources.length,
      totalTransferSizeKB: +(totalBytes / 1024).toFixed(2)
    });
  };

  const debounceSummary = () => {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(updateSummary, IDLE_DELAY);
  };

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    let shouldTrigger = false;
    entries.forEach(entry => {
      allResources.push(entry);
      if (!shouldExclude(entry.name)) {
        shouldTrigger = true;
      }
    });
    if (DEBUG) console.log("[Resource Monitor] New resources observed:", entries.map(e => e.name));
    if (shouldTrigger) debounceSummary();
  });

  observer.observe({ type: "resource", buffered: true });

  window.addEventListener("beforeunload", updateSummary);
}