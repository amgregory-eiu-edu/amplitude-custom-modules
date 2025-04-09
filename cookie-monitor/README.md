# Cookie-Monitor

## Overview

// === Amplitude Cookie Monitor ===
// Logs cookies on load and before unload, detects cookie changes over time

## How it works

This module runs in the browser context and captures signals relevant to its purpose.
It typically logs events using `amplitude.logEvent()` and may modify or observe browser APIs such as cookies, performance observers, or mutation observers.

Review the JavaScript file for implementation details and customize thresholds, exclusions, or behavior as needed.
