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