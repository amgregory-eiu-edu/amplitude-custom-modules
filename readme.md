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
| **bot_detector** | Flags potential bot behavior from Unnatural or non-human mouse movement, interaction speed, and absence of common input events. |
| **ip_address_monitor** | Evaluates the user's IP adddress (retrieved from a public endpoint) and sends changes to Amplitude. |
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

## 🧠 Use Cases

Each module in this demo captures a specific signal that could represent user struggle, suspicious behavior, or potential fraud. While a single signal may simply indicate a usability issue, the real power comes from **combining signals** to uncover deeper insights.

For example:
- `form_monitor` may detect frequent validation errors, indicating a struggle to complete a form.
- `devtools_observer` might signal that the user has opened browser developer tools.
- `ip_address_monitor` could detect a change in the user's public IP address mid-session, or mobile device switching from cellular to WIFI.
- `cookie_monitor` may detect modified or cleared cookies during a sensitive process.

Individually, these events might be harmless or accidental. But when **multiple signals occur within the same session**, it paints a much clearer picture:
> A session where devtools are open, the IP address changes, and cookies are altered strongly suggests fraudulent automation, session hijacking, or a malicious script.

By using Amplitude's analysis tools (like funnels, cohorts, and session replay), teams can isolate these compound behaviors, investigate trends, and build targeted mitigation strategies.

---

## 🎯 Demo Walkthrough

This project includes a full working demo that showcases how Amplitude's advanced analysis tools — including cohorts, experiments, feature flags, and real-time signals — can be orchestrated to detect and respond to both user struggle and fraud.

### ✅ Amplitude Setup

1. **Experiments**
   - **Struggle (Friction) Experiment** – Displays a modal offering help when user struggle is detected.
   - **Fraud Experiment** – Displays a fraud warning modal when fraud-like behavior is detected.

2. **Cohorts**
   - **Struggle Alert:** Users who trigger **3+ form errors** and have a **cart value > $500**.
   - **Fraud Alert:** Users who **open DevTools**, **change their IP**, and **modify cookies**.

3. **Feature Flags**
   - `struggle-demo-flag` — Syncs with the **Struggle Alert** cohort.
   - `fraud-demo-flag` — Syncs with the **Fraud Alert** cohort.

---

### 🧪 How the Demo Works

- Use the custom Amplitude modules and `modules.html` to simulate sessions that satisfy either the **Struggle** or **Fraud** cohort conditions.
- Analyze the custom module events and signals with developer tools and the [Amplitude Event Explorer Chrome Extension](https://chromewebstore.google.com/detail/amplitude-event-explorer/acehfjhnmhbmgkedjmjlobpgdicnhkbp?hl=en-US).
- From the Amplitude dashboard, verify that users are being segmented or identified in the appropriate cohorts based on their behavior.
- Use Postman to call the [Amplitude Experiment Evaluation API](https://amplitude.com/docs/apis/experiment/experiment-evaluation-api) and verify which **feature flag** is returned for each test user.
- Load the simulated user into `modules.html`, then trigger the **checkout** flow.
- On checkout:
  - The page evaluates the **Amplitude experiment API** to determine which modal (Struggle or Fraud) should be shown.
  - A **Slack alert** is sent in real time for either a **Struggle Alert** or **Fraud Alert**.

---

### 🔬 Real-Time Mitigation in Action

This demo illustrates how to use **Amplitude’s analysis tools** — including funnels, cohorts, and session replay — to:

- Detect nuanced behavior patterns in real time
- Isolate sessions for further investigation
- Trigger targeted mitigation strategies like personalized modals or Slack alerts

It’s a blueprint for bridging the gap between **analytics insights** and **automated response**.

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

