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