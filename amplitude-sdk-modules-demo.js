// === Amplitude Kitchen Sink Modules ===
// Loads all custom monitoring modules after Amplitude is initialized

const AMPLITUDE_PROJECT_KEY = "your_project_key"; // Replace with your Amplitude project key
const DEBUG = true;

console.log(AMPLITUDE_PROJECT_KEY);

// Dynamically load Amplitude SDK using latest official bundle (with Experiment + Replay + Autocapture)
(function loadAmplitudeSDK() {
  if (DEBUG) console.log("[amplitude-sdk-modules-demo.js] Loading Amplitude SDK from https://cdn.amplitude.com/script/{key}.js");

  // Clear the __devtools_open session key
  if (sessionStorage.getItem("__devtools_open")) {
    sessionStorage.removeItem("__devtools_open");
    if (DEBUG) console.log("[amplitude-sdk-modules-demo.js] Cleared __devtools_open session key.");
  }

  // Prevent the SDK from initializing automatically
  window.amplitude = window.amplitude || { _q: [], _iq: {} };

  const ampScript = document.createElement("script");
  ampScript.src = `https://cdn.amplitude.com/script/${AMPLITUDE_PROJECT_KEY}.js`;
  ampScript.async = true;
  ampScript.onload = () => {
    if (DEBUG) console.log("[amplitude-sdk-modules-demo.js] Amplitude SDK loaded, initializing...");

    // Explicitly initialize Amplitude
    // amplitude.init(AMPLITUDE_PROJECT_KEY, {
    //   fetchRemoteConfig: true,
    //   autocapture: true,
    //   defaultTracking: true // Explicitly set defaultTracking to suppress the warning
    // }, (response) => {
    //   if (response && response.error) {
    //     console.error("[amplitude-sdk-modules-demo.js] Amplitude initialization error:", response.error);
    //   } else {
    //     console.log("[amplitude-sdk-modules-demo.js] Amplitude initialized successfully.");
    //   }
    // });
  };
  document.head.appendChild(ampScript);
})();

function runAllModules() {
	if (DEBUG) console.log("[amplitude-modules.js] Running all custom monitoring modules...");
  
	// === Include all modules below ===
	try { network_monitor(); } catch (e) { console.error("Network Monitor failed", e); }
	try { devtools_observer(); } catch (e) { console.error("DevTools Observer failed", e); }
	try { datalayer_monitor(); } catch (e) { console.error("DataLayer Monitor failed", e); }
	try { js_error_monitor(); } catch (e) { console.error("JS Error Monitor failed", e); }
	try { impact_monitor(); } catch (e) { console.error("Impact Monitor failed", e); }
	try { bot_detector(); } catch (e) { console.error("Bot Detector failed", e); }
	try { ip_address_monitor(); } catch (e) { console.error("IP Address Monitor failed", e); }
	//try { resource_monitor(); } catch (e) { console.error("Resource Monitor failed", e); }
	try { cookie_monitor(); } catch (e) { console.error("Cookie Monitor failed", e); }
	try { form_monitor(); } catch (e) { console.error("Form Monitor failed", e); }
}
  
  
// === Embedded Module: api-monitor.js ===
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
  
// === Embedded Module: bot-detector.js ===
// === Amplitude Bot Detector ===
// Detects bot-like behavior based on interaction patterns.
function bot_detector() {
	if (DEBUG) console.log("[Bot Detector] Initializing");
  
	const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {} };
	const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  
	let hadClick = false;
	let hadMove = false;
	let mouseMoveLogged = false; // Flag to track if mouse move has been logged
  
	const markClicked = () => { 
	  hadClick = true; 
	  if (DEBUG) console.log("[Bot Detector] Click/tap detected"); 
	};
  
	const markMoved = () => { 
	  hadMove = true; 
	  if (!mouseMoveLogged) { // Log only the first time
		if (DEBUG) console.log("[Bot Detector] Mouse move detected");
		mouseMoveLogged = true; // Set the flag to true
	  }
	};
  
	window.addEventListener('click', markClicked);
	window.addEventListener('touchstart', markClicked);
	if (!isMobile) window.addEventListener('mousemove', markMoved);
  
	window.addEventListener('beforeunload', () => {
	  if (!hadClick && !hadMove) {
		amp.logEvent("no_interaction_detected", { mobile: isMobile });
		if (DEBUG) console.log("[Bot Detector] No interaction detected");
	  }
	});
  
	if (!isMobile) {
	  let last = null;
	  let angles = [];
	  window.addEventListener('mousemove', (e) => {
		if (last) {
		  const dx = e.clientX - last.x;
		  const dy = e.clientY - last.y;
		  const angle = Math.atan2(dy, dx).toFixed(2);
		  angles.push(angle);
		}
		last = { x: e.clientX, y: e.clientY };
	  });
  
	  window.addEventListener('beforeunload', () => {
		const uniqueAngles = new Set(angles);
		if (uniqueAngles.size <= 2 && angles.length > 20) {
		  const details = {
			sample_size: angles.length,
			unique_angles: uniqueAngles.size,
			angles: Array.from(uniqueAngles)
		  };
		  amp.logEvent("linear_mouse_movement_detected", details);
		  console.log("[Bot Detector] Linear movement detected", details);
		}
	  });
	}
}
  
// === Embedded Module: datalayer-monitor.js ===
// === Amplitude DataLayer Monitor ===
// Monitors changes to the window.dataLayer and logs pushes to Amplitude.
function datalayer_monitor() {
	if (DEBUG) console.log("[DataLayer Monitor] Initializing");
  
	const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {} };
	if (!Array.isArray(window.dataLayer)) window.dataLayer = [];
  
	const originalPush = window.dataLayer.push;
	window.dataLayer.push = function (...args) {
	  const result = originalPush.apply(this, args);
	  amp.logEvent("datalayer_updated", {
		pushed: JSON.stringify(args),
		dataLayerSize: window.dataLayer.length
	  });
	  if (DEBUG) console.log("[DataLayer Monitor] dataLayer.push intercepted", args);
	  return result;
	};
}
  
// === Embedded Module: js-error-monitor.js ===
// === Amplitude JS Error Monitor ===
// Tracks uncaught errors and unhandled promise rejections
function js_error_monitor() {
	if (DEBUG) console.log("[JS Error Monitor] Initializing");
  
	const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {} };
  
	window.onerror = function (message, source, lineno, colno, error) {
	  const stack = error?.stack || null;
	  amp.logEvent("js_error_detected", { message, source, lineno, colno, stack });
	  if (DEBUG) console.log("[JS Error Monitor] Caught JS error", { message, source, lineno, colno, stack });
	};
  
	window.addEventListener("unhandledrejection", (e) => {
	  amp.logEvent("js_error_detected", {
		message: e.reason?.message || "unhandledrejection",
		stack: e.reason?.stack || null
	  });
	  if (DEBUG) console.log("[JS Error Monitor] Unhandled Promise rejection", e.reason);
	});
}
  
// === Embedded Module: devtools-observer.js ===
// === Amplitude DevTools Observer ===
// Detects if DevTools is opened by measuring side effects.
function devtools_observer() {
  if (DEBUG) console.log("[DevTools Observer] Initializing");

  const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {}, identify: () => {} };
  const threshold = 50; // Lower threshold for more sensitivity
  const DEVTOOLS_OPEN_KEY = "__devtools_open"; // Key to track DevTools state in sessionStorage

  let previousInnerHeight = window.innerHeight; // Track the previous window height
  let previousInnerWidth = window.innerWidth; // Track the previous window width

  const checkDevTools = () => {
    if (!sessionStorage.getItem(DEVTOOLS_OPEN_KEY)) {
      const start = performance.now();
      debugger; // Introduces a delay when DevTools is open
      const duration = performance.now() - start;

      // Check if DevTools is open and hasn't been logged yet
      if (duration > threshold) {
        sessionStorage.setItem(DEVTOOLS_OPEN_KEY, "true"); // Mark DevTools as open
        amp.logEvent("devtools_opened", { duration });

        // Increment the devtools_opened user property by 1
        const identify = new amplitude.Identify().add("devtools_opened", 1);
        amp.identify(identify);

        if (DEBUG) console.log("[DevTools Observer] DevTools detected and user property incremented", { duration });
      }
    }
  };

  const handleResize = () => {
    const currentInnerHeight = window.innerHeight;
    const currentInnerWidth = window.innerWidth;

    // If the window size changes significantly, assume DevTools was opened or closed
    if (
      sessionStorage.getItem(DEVTOOLS_OPEN_KEY) &&
      (Math.abs(currentInnerHeight - previousInnerHeight) > 100 || // Significant height change
        Math.abs(currentInnerWidth - previousInnerWidth) > 100) // Significant width change
    ) {
      sessionStorage.removeItem(DEVTOOLS_OPEN_KEY); // Clear the flag when DevTools is closed
      if (DEBUG) console.log("[DevTools Observer] DevTools closed");
    }

    // Update the previous dimensions
    previousInnerHeight = currentInnerHeight;
    previousInnerWidth = currentInnerWidth;
  };

  // Run the check every 2 seconds
  setInterval(checkDevTools, 2000);

  // Listen for resize events to detect when DevTools is closed
  window.addEventListener("resize", handleResize);
}
  
// === Embedded Module: impact-monitor.js ===
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
  
// === Embedded Module: ip-address-monitor.js ===
// === Amplitude IP Address Monitor ===
// Detects changes in the user's public IP address and sends an event to Amplitude.
function ip_address_monitor() {
	if (DEBUG) console.log("[Amplitude IP Address Monitor] Initializing");
  
	const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {} };
	const IP_CHECK_URL = "https://api.ipify.org?format=json";
	const LOCAL_STORAGE_KEY = "__amp_ip";
  
	fetch(IP_CHECK_URL)
	  .then(res => res.json())
	  .then(data => {
		const currentIp = data.ip;
		const previousIp = localStorage.getItem(LOCAL_STORAGE_KEY);
  
		if (DEBUG) console.log("[Amplitude IP Address Monitor] Current IP:", currentIp, "Previous IP:", previousIp);
  
		if (previousIp && previousIp !== currentIp) {
		  if (DEBUG) console.log("[Amplitude IP Address Monitor] IP address changed!");
		  amp.logEvent("ip_address_changed", {
			previous_ip: previousIp,
			new_ip: currentIp
		  });
		  if (DEBUG) console.log("[Amplitude IP Address Monitor] Logged event: IP Address Changed");
		}
  
		localStorage.setItem(LOCAL_STORAGE_KEY, currentIp);
	  })
	  .catch(err => {
		if (DEBUG) console.error("[Amplitude IP Address Monitor] Failed to check IP address", err);
	  });
}

function waitForAmplitude() {
  const interval = setInterval(() => {
    if (window.amplitude?.invoked) {
      console.log("Amplitude is running.");
	  // Call the function to run all modules
	  runAllModules();
      clearInterval(interval); // Stop checking once the condition is met
    }
  }, 100); // Check every 100ms
}

// === Embedded Module: resource-monitor.js ===
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

// === Embedded Module: cookie-monitor.js ===
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

// === Embedded Module: form-monitor.js ===
// === Amplitude Form Monitor ===
// Detects form validation errors based on DOM changes, error class visibility, and keyword detection

function form_monitor() {
  if (DEBUG) console.log("[Form Monitor] Initializing");

  const amp = window.amplitude?.logEvent ? window.amplitude : { logEvent: () => {}, identify: () => {} };
  const INCLUDE_CONTAINERS = ["errorSummary", "formErrors"]; // IDs or classNames that aggregate error messages
  const ENABLE_TRIGGER_WORD_CHECK = true; // Flag to enable/disable trigger word logic
  const TRIGGER_WORDS = ["error", "required", "invalid"]; // List of trigger words to detect errors

  function extractErrorDetails(node, maxTraversalLevel = 5) {
    const errorText = node.innerText || node.textContent || "";
    let closestInput = null;
    let closestLabel = null;

    // Helper function to traverse up and check siblings
    function traverseUpAndCheck(currentNode, level) {
      if (!currentNode || level > maxTraversalLevel) return;

      // Check siblings for input fields
      const siblingInput = currentNode.previousElementSibling?.querySelector("input, select, textarea") ||
        currentNode.nextElementSibling?.querySelector("input, select, textarea");
      if (siblingInput) closestInput = siblingInput;

      // Check siblings for labels
      const siblingLabel = currentNode.previousElementSibling?.querySelector("label") ||
        currentNode.nextElementSibling?.querySelector("label");
      if (siblingLabel) closestLabel = siblingLabel;

      // Check parent for input fields or labels
      const parentInput = currentNode.closest("form")?.querySelector("input, select, textarea");
      const parentLabel = currentNode.closest("form")?.querySelector(`label[for="${parentInput?.id}"]`);
      if (parentInput) closestInput = parentInput;
      if (parentLabel) closestLabel = parentLabel;

      // Traverse up to the parent node
      traverseUpAndCheck(currentNode.parentElement, level + 1);
    }

    // Start traversal from the current node
    traverseUpAndCheck(node, 0);

    return {
      message: errorText.trim(),
      element_id: node.id || null,
      element_class: node.className || null,
      input_id: closestInput?.id || null,
      input_name: closestInput?.name || null,
      label_text: closestLabel?.innerText?.trim() || null
    };
  }

  function logValidationError(node) {
    const details = extractErrorDetails(node);

    // Increment the form_error_count user property in Amplitude
    const identify = new amplitude.Identify().add("form_error_count", 1);
    amp.identify(identify);

    // Increment the form_error_count cookie
    const cookieName = "form_error_count";
    const currentCount = parseInt(getCookie(cookieName)) || 0;
    const newCount = currentCount + 1;
    setCookie(cookieName, newCount, 7); // Set the cookie with a 7-day expiration

    if (DEBUG) console.log(`[Form Monitor] Incremented form_error_count cookie to: ${newCount}`);

    // Debounce timer
    const DEBOUNCE_DELAY = 200; // Delay in milliseconds
    let debounceTimer = null;

    // Check if Amplitude is ready
    if (window.amplitude?.logEvent) {
      clearTimeout(debounceTimer); // Clear any existing timer
      debounceTimer = setTimeout(() => {
        try {
          // Send the event to Amplitude
          window.amplitude.logEvent("form_error_detected", details);
          if (DEBUG) console.log("[Form Monitor] Validation error sent to Amplitude", details);
        } catch (error) {
          console.error("[Form Monitor] Failed to send validation error to Amplitude", error, details);
        }
      }, DEBOUNCE_DELAY);
    } else {
      if (DEBUG) console.warn("[Form Monitor] Amplitude not ready. Event not sent.", details);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Handle added nodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const id = node.id?.toLowerCase() || "";
          const className = node.className?.toLowerCase() || "";
          const text = node.innerText?.trim() || node.textContent?.trim() || "";

          // Check if the node matches known containers or contains error-like content
          const isIncludedContainer = INCLUDE_CONTAINERS.some((key) =>
            id.includes(key) || className.includes(key)
          );

          const looksLikeError =
            id.includes("error") ||
            className.includes("error") ||
            (ENABLE_TRIGGER_WORD_CHECK && TRIGGER_WORDS.some((word) => text.toLowerCase().includes(word))) ||
            className.includes("required") ||
            id.includes("required");

          if (isIncludedContainer || looksLikeError) {
            if (DEBUG) console.log("[Form Monitor] Error detected in added node:", { id, className, text });
            logValidationError(node);
          }
        }
      });

      // Handle child nodes added to known containers
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const container = mutation.target;

        // Debug: Log the container being monitored
        if (DEBUG) console.log("[Form Monitor] Mutation detected in container:", container.id || container.className);

        const isIncludedContainer = INCLUDE_CONTAINERS.some((key) =>
          container.id?.includes(key) || container.className?.includes(key)
        );

        if (isIncludedContainer) {
          // Debug: Log the added nodes
          if (DEBUG) console.log("[Form Monitor] Nodes added to container:", container.id, mutation.addedNodes);

          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Log all child nodes added to the container without checking for keywords
              if (DEBUG) console.log("[Form Monitor] Logging node in error container:", node);
              logValidationError(node);
            }
          });
        }
      }

      // Handle attribute changes (e.g., class or style changes)
      if (mutation.type === "attributes" && mutation.target) {
        const target = mutation.target;
        const attrVal = target.getAttribute(mutation.attributeName)?.toLowerCase() || "";

        if (
          mutation.attributeName === "class" &&
          (attrVal.includes("error") || target.className?.toLowerCase().includes("error"))
        ) {
          if (DEBUG) console.log("[Form Monitor] Class mutation detected:", { target, attrVal });
          logValidationError(target);
        }

        // Handle style mutations
        if (mutation.attributeName === "style") {
          const content = target.innerText || target.textContent || "";
          const style = window.getComputedStyle(target);
          const isVisible = style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";

          if (DEBUG) console.log("[Form Monitor] Style mutation detected:", { content, style });

          const looksLikeError =
            content.includes("*") ||
            (ENABLE_TRIGGER_WORD_CHECK && TRIGGER_WORDS.some((word) => content.toLowerCase().includes(word)));

          if (isVisible && looksLikeError) {
            logValidationError(target);
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
}

// Helper function to set a cookie at the top-level domain
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    const expires = "expires=" + date.toUTCString();

    // Determine the top-level domain (TLD)
    const hostParts = window.location.hostname.split(".");
    const domain =
        hostParts.length > 2
            ? `.${hostParts.slice(-2).join(".")}` // Remove subdomain (e.g., app.amplitude.com.co → .amplitude.com.co)
            : window.location.hostname; // Use the full hostname if no subdomain exists

    // Set the cookie
    document.cookie = `${name}=${value}; ${expires}; path=/; domain=${domain}`;
    if (DEBUG) console.log(`[Cookie] Set cookie: ${name}=${value}; domain=${domain}`);
}

// Helper function to get a cookie value
function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split("; ");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length);
        }
    }
    return null;
}

// Call the function to start waiting for Amplitude
waitForAmplitude();
