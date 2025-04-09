# Resource-Monitor

## Overview

// === Amplitude Resource Monitor ===
// Tracks all resource loads and sends summary events when idle

## How it works

This module runs in the browser context and captures signals relevant to its purpose.
It typically logs events using `amplitude.logEvent()` and may modify or observe browser APIs such as cookies, performance observers, or mutation observers.

Review the JavaScript file for implementation details and customize thresholds, exclusions, or behavior as needed.
