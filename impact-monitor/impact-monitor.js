// === Amplitude Impact Monitor ===
// Tracks total data transfer size of page resources
function impact_monitor() {
  if (DEBUG) console.log("[Impact Monitor] Initializing");

  const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {} };

  // Use a PerformanceObserver to monitor resource loading
  const resourceEntries = [];
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    resourceEntries.push(...entries);
    if (DEBUG) console.log("[Impact Monitor] New resources observed:", entries);
  });

  observer.observe({ type: "resource", buffered: true });

  // Track fetch, XHR, and sendBeacon requests explicitly
  const apiRequests = [];
  const trackApiRequest = (method, url, size) => {
    apiRequests.push({ method, url, size });
    if (DEBUG) console.log("[Impact Monitor] API request tracked:", { method, url, size });
  };

  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = args[0];
    const response = await originalFetch.apply(this, args);
    const size = response.headers.get("content-length") || 0;
    trackApiRequest("FETCH", url, parseInt(size, 10));
    return response;
  };

  // Override XHR
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._apiMonitor = { method, url };
    return originalXhrOpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this;
    xhr.addEventListener("loadend", function () {
      const size = xhr.getResponseHeader("content-length") || 0;
      trackApiRequest(xhr._apiMonitor.method, xhr._apiMonitor.url, parseInt(size, 10));
    });
    return originalXhrSend.apply(this, args);
  };

  // Override sendBeacon
  const originalSendBeacon = navigator.sendBeacon;
  navigator.sendBeacon = function (url, data) {
    trackApiRequest("BEACON", url, data?.length || 0);
    return originalSendBeacon.apply(this, arguments);
  };

  // Function to log the summary
  const logSummary = () => {
    observer.disconnect(); // Stop observing new resources

    const totalBytes = resourceEntries.reduce((sum, e) => sum + (e.transferSize || 0), 0) +
      apiRequests.reduce((sum, req) => sum + req.size, 0);
    const totalCount = resourceEntries.length + apiRequests.length;

    const previousImpact = JSON.parse(sessionStorage.getItem("__amp_impact_summary") || '{"totalResources":0,"totalTransferSizeKB":0}');
    const sessionImpact = {
      totalResources: previousImpact.totalResources + totalCount,
      totalTransferSizeKB: +(previousImpact.totalTransferSizeKB + (totalBytes / 1024)).toFixed(2)
    };
    sessionStorage.setItem("__amp_impact_summary", JSON.stringify(sessionImpact));

    amp.logEvent("impact_page_updated", {
      totalResources: totalCount,
      totalTransferSizeKB: +(totalBytes / 1024).toFixed(2)
    });
    
    amp.logEvent("impact_session_updated", sessionImpact);

    if (DEBUG) console.log("[Impact Monitor] Logged resource summary", {
      totalResources: totalCount,
      totalTransferSizeKB: +(totalBytes / 1024).toFixed(2),
    });
  };

  // Wait for a period of inactivity after the load event
  let timeout;
  const scheduleSummary = () => {
    clearTimeout(timeout);
    timeout = setTimeout(logSummary, 10000); // Wait 10 seconds of inactivity
  };

  // Schedule the summary after the load event
  window.addEventListener("load", () => {
    if (DEBUG) console.log("[Impact Monitor] Load event fired, starting observation...");
    scheduleSummary();
  });

  // Schedule the summary whenever new resources are observed
  window.addEventListener("beforeunload", logSummary); // Ensure summary is logged before the page unloads
}