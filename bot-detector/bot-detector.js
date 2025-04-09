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