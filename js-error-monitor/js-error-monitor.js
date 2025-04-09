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