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