// === Amplitude API Monitor ===
// Intercepts and logs metadata from fetch, XHR, and sendBeacon calls to Amplitude.
function network_monitor() {
  if (DEBUG) console.log("[Network Monitor] Initializing");
  const excludedStatusCodes = [200];

  const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {} };
  if (DEBUG) console.log("[Network Monitor] window.amplitude.logEvent is", typeof window.amplitude?.logEvent);

  const excludeList = ["amplitude.com", "api.amplitude.com"]; // Add specific domains to exclude

  const shouldExclude = (url) => {
    try {
      const domain = new URL(url).hostname; // Extract the hostname from the URL
      return excludeList.some((excludedDomain) => domain.endsWith(excludedDomain));
    } catch (e) {
      if (DEBUG) console.error("[API Monitor] Invalid URL:", url, e);
      return false; // If the URL is invalid, do not exclude it
    }
  };

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = args[0];
    if (shouldExclude(url)) {
      if (DEBUG) console.log("[API Monitor] Excluded fetch call to:", url);
      return originalFetch.apply(this, args);
    }

    const method = (args[1]?.method || 'GET').toUpperCase();
    const start = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const duration = Math.round(performance.now() - start);
      if (!excludedStatusCodes.includes(response.status)) {
        amp.logEvent("network_error_detected", { method, url, status: response.status, duration });
      } else if (DEBUG) {
        console.log("[Network Monitor] Excluded event for status code:", response.status, url);
      }
      if (DEBUG) console.log("[Network Monitor] Logged fetch", { method, url, status: response.status, duration });
      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      amp.logEvent("network_error_detected", { method, url, status: 0, duration, error: error.message });
      if (DEBUG) console.log("[Network Monitor] Fetch error", { method, url, error: error.message });
      throw error;
    }
  };

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._apiMonitor = { method, url, start: null };
    return originalXhrOpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this;
    if (shouldExclude(xhr._apiMonitor.url)) {
      if (DEBUG) console.log("[API Monitor] Excluded XHR call to:", xhr._apiMonitor.url);
      return originalXhrSend.apply(this, args);
    }

    xhr._apiMonitor.start = performance.now();
    xhr.addEventListener('loadend', function () {
      const duration = Math.round(performance.now() - xhr._apiMonitor.start);
      if (!excludedStatusCodes.includes(xhr.status)) {
        amp.logEvent("network_error_detected", {
          method: xhr._apiMonitor.method,
          url: xhr._apiMonitor.url,
          status: xhr.status,
          duration
        });
      } else if (DEBUG) {
        console.log("[Network Monitor] Excluded XHR for status code:", xhr.status, xhr._apiMonitor.url);
      }
      if (DEBUG) console.log("[Network Monitor] Logged XHR", {
        method: xhr._apiMonitor.method,
        url: xhr._apiMonitor.url,
        status: xhr.status,
        duration
      });
    });
    return originalXhrSend.apply(this, args);
  };

  const originalSendBeacon = navigator.sendBeacon;
  navigator.sendBeacon = function (url, data) {
    if (shouldExclude(url)) {
      if (DEBUG) console.log("[API Monitor] Excluded sendBeacon call to:", url);
      return originalSendBeacon.apply(this, arguments);
    }

    const start = performance.now();
    const success = originalSendBeacon.apply(this, arguments);
    const duration = Math.round(performance.now() - start);
    const beaconStatus = success ? 200 : 0;
    if (!excludedStatusCodes.includes(beaconStatus)) {
      amp.logEvent("network_error_detected", {
        method: "BEACON",
        url,
        status: beaconStatus,
        duration,
        dataSize: data?.length || 0
      });
    } else if (DEBUG) {
      console.log("[Network Monitor] Excluded sendBeacon for status code:", beaconStatus, url);
    }
    if (DEBUG) console.log("[Network Monitor] Logged sendBeacon", {
      url, status: beaconStatus, duration, dataSize: data?.length || 0
    });
    return success;
  };
}