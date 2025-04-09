# Amplitude SDK Modules Demo

This project includes a suite of custom-built JavaScript modules that enhance Amplitude’s capabilities for friction and fraud detection. It supports deeper visibility into real-time struggles, anomalous behavior, and system health — ideal for proactive CX and risk teams.

> **"From Monitoring to Mitigation: Using Amplitude for Friction & Fraud Detection"**

---

## 🔍 Modules Overview

Each module below is included in `amplitude-sdk-modules-demo.js`. These can also be split into separate folders for easier testing and maintenance.

| Module | Description |
|--------|-------------|
| **network_monitor** | Monitors API response timing and errors (e.g., 4xx, 5xx). Tracks fetch/XHR anomalies and logs them to Amplitude. |
| **devtools_observer** | Detects if browser DevTools are open. Helpful for flagging scraping attempts or session tampering. |
| **datalayer_monitor** | Observes changes to the `dataLayer` array (e.g., GTM or analytics variables). Flags unexpected or malicious mutations. |
| **js_error_monitor** | Captures global JS errors and unhandled promise rejections. Sends them as Amplitude events with stack traces. |
| **impact_monitor** | Measures page load size, resource timings, and transfer weight. Helps track bloat and performance regression. |
| **bot_detector** | Flags potential bot behavior based on user agent, interaction speed, and absence of common input events. |
| **ip_address_monitor** | Sends the user's IP (retrieved from a public endpoint) to Amplitude for fraud/geolocation alerts. |
| **cookie_monitor** | Observes cookie values and changes (e.g., auth tokens, tracking IDs). Optionally flags unusual modifications. |
| **form_monitor** | Detects suspicious form interaction. Primary use case: automatically captures validation errors to detect user struggle during form submissions. |

---

## 🧪 Usage Files

### `modules.html`
> A minimal HTML test page. Load this in your browser after updating the Amplitude key to see modules in action.

### `reset.php`
> A developer-only utility for clearing cookies or session states during local testing.

---

## 🛠 Getting Started

1. Add your Amplitude project key in `amplitude-sdk-modules-demo.js`
2. Open `modules.html` in a browser
3. Review console logs or use Amplitude Debugger to confirm events

---

## 📁 Optional Folder Structure

If you prefer modular organization:

```
amplitude-sdk-modules/
├── network_monitor/
│   ├── network-monitor.js
│   └── README.md
├── devtools_observer/
│   ├── devtools-observer.js
│   └── README.md
├── datalayer_monitor/
│   ├── datalayer-monitor.js
│   └── README.md
├── js_error_monitor/
│   ├── js-error-monitor.js
│   └── README.md
├── impact_monitor/
│   ├── impact-monitor.js
│   └── README.md
├── bot_detector/
│   ├── bot-detector.js
│   └── README.md
├── ip_address_monitor/
│   ├── ip-address-monitor.js
│   └── README.md
├── cookie_monitor/
│   ├── cookie-monitor.js
│   └── README.md
├── form_monitor/
│   ├── form-monitor.js
│   └── README.md
├── modules.html
├── reset.php
└── README.md
```
