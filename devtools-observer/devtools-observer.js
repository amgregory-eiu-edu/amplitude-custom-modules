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