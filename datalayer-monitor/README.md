# Datalayer-Monitor

## Overview

// === Amplitude DataLayer Monitor ===
// Monitors changes to the window.dataLayer and logs pushes to Amplitude.

## How it works

This module runs in the browser context and captures signals relevant to its purpose.
It typically logs events using `amplitude.logEvent()` and may modify or observe browser APIs such as cookies, performance observers, or mutation observers.

Review the JavaScript file for implementation details and customize thresholds, exclusions, or behavior as needed.
