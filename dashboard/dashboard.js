/**
 * SafeWord - Emergency Dashboard Logic
 * Connects to detection/trigger.js and reads from browser localStorage ('safewordAlerts').
 */

// Fallback initial sample alerts if localStorage is empty
const DEFAULT_ALERTS = [
  {
    id: "ALT-1041",
    status: "Resolved",
    latitude: 37.774929,
    longitude: -122.419416,
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    contact: "mom",
    contactPhone: "+1 (555) 234-5678"
  },
  {
    id: "ALT-1040",
    status: "Resolved",
    latitude: 37.783333,
    longitude: -122.416667,
    timestamp: new Date(Date.now() - 1000 * 60 * 125).toISOString(),
    contact: "mom",
    contactPhone: "+1 (555) 234-5678"
  },
  {
    id: "ALT-1039",
    status: "Resolved",
    latitude: 37.76904,
    longitude: -122.44675,
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    contact: "mom",
    contactPhone: "+1 (555) 234-5678"
  }
];

// Current dashboard state
const state = {
  systemStatus: "Active / Monitoring",
  alertStatus: "STANDBY", // "STANDBY" | "EMERGENCY ACTIVE"
  currentAlert: null,
  recentAlerts: []
};

/**
 * Retrieve alerts stored in browser localStorage under key 'safewordAlerts'
 */
function getStoredAlerts() {
  try {
    const raw = localStorage.getItem("safewordAlerts");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === "object") {
      return [parsed];
    }
  } catch (err) {
    console.error("❌ [SafeWord Dashboard] Error reading safewordAlerts from localStorage:", err);
  }
  return null;
}

/**
 * Sync dashboard state with localStorage ('safewordAlerts')
 */
function syncWithStorage() {
  const stored = getStoredAlerts();

  if (stored && stored.length > 0) {
    state.recentAlerts = stored;
    state.currentAlert = stored[0];

    // If the latest alert is not explicitly marked resolved, mark as active emergency
    if (stored[0].status === "Resolved") {
      state.alertStatus = "STANDBY";
    } else {
      state.alertStatus = "EMERGENCY ACTIVE";
    }
  } else {
    // If no localStorage alerts yet, use default fallback
    state.recentAlerts = [...DEFAULT_ALERTS];
    state.currentAlert = DEFAULT_ALERTS[0];
    state.alertStatus = "STANDBY";
  }

  renderDashboard();
}

/**
 * Update the UI with current state values
 */
function renderDashboard() {
  // 1. System Status
  const systemStatusBadge = document.getElementById("systemStatusBadge");
  if (systemStatusBadge) {
    systemStatusBadge.textContent = state.systemStatus;
  }

  // 2. Alert Status Banner
  const alertBanner = document.getElementById("alertBanner");
  const bannerTitle = document.getElementById("bannerTitle");
  const bannerIcon = document.getElementById("bannerIcon");
  const resolveBtn = document.getElementById("resolveBtn");
  const telemetryBadge = document.getElementById("telemetryBadge");

  if (state.alertStatus === "EMERGENCY ACTIVE") {
    if (alertBanner) alertBanner.className = "alert-banner active-alert";
    if (bannerIcon) bannerIcon.textContent = "🚨";
    if (bannerTitle) bannerTitle.textContent = "CRITICAL ALERT ACTIVE";
    if (resolveBtn) resolveBtn.style.display = "inline-flex";
    if (telemetryBadge) {
      telemetryBadge.textContent = "Live Emergency Telemetry";
      telemetryBadge.className = "telemetry-badge active";
    }
  } else {
    if (alertBanner) alertBanner.className = "alert-banner standby";
    if (bannerIcon) bannerIcon.textContent = "🟢";
    if (bannerTitle) bannerTitle.textContent = "NORMAL / STANDBY";
    if (resolveBtn) resolveBtn.style.display = "none";
    if (telemetryBadge) {
      telemetryBadge.textContent = "Standby Telemetry";
      telemetryBadge.className = "telemetry-badge";
    }
  }

  // 3. Telemetry fields
  const dispLatitude = document.getElementById("dispLatitude");
  const dispLongitude = document.getElementById("dispLongitude");
  const dispTimestamp = document.getElementById("dispTimestamp");
  const dispContact = document.getElementById("dispContact");
  const dispContactPhone = document.getElementById("dispContactPhone");
  const dispRelativeTime = document.getElementById("dispRelativeTime");
  const mapsLink = document.getElementById("mapsLink");

  if (state.currentAlert) {
    const lat = typeof state.currentAlert.latitude === "number"
      ? state.currentAlert.latitude.toFixed(6)
      : state.currentAlert.latitude;
    const lng = typeof state.currentAlert.longitude === "number"
      ? state.currentAlert.longitude.toFixed(6)
      : state.currentAlert.longitude;

    if (dispLatitude) dispLatitude.textContent = lat;
    if (dispLongitude) dispLongitude.textContent = lng;
    if (dispTimestamp) dispTimestamp.textContent = state.currentAlert.timestamp || "-";
    if (dispContact) dispContact.textContent = state.currentAlert.contact || "mom";
    if (dispContactPhone) {
      dispContactPhone.textContent = state.currentAlert.contactPhone || "+1 (555) 234-5678";
    }

    if (dispRelativeTime && state.currentAlert.timestamp) {
      try {
        const timeStr = new Date(state.currentAlert.timestamp).toLocaleTimeString();
        dispRelativeTime.textContent = state.alertStatus === "EMERGENCY ACTIVE"
          ? `Reported at ${timeStr} (Active Incident)`
          : `Logged: ${timeStr}`;
      } catch (e) {
        dispRelativeTime.textContent = state.currentAlert.timestamp;
      }
    }

    if (mapsLink) {
      mapsLink.href = `https://maps.google.com/?q=${lat},${lng}`;
    }
  }

  // 4. Recent Alerts Table
  const tableBody = document.getElementById("recentAlertsBody");
  const alertsCount = document.getElementById("alertsCount");

  if (alertsCount) {
    alertsCount.textContent = `${state.recentAlerts.length} recorded`;
  }

  if (tableBody) {
    tableBody.innerHTML = "";
    state.recentAlerts.forEach((alert, index) => {
      const tr = document.createElement("tr");
      if (index === 0 && state.alertStatus === "EMERGENCY ACTIVE") {
        tr.className = "new-alert-row";
      }

      const alertId = alert.id || `ALT-${9999 - index}`;
      const alertStatus = alert.status || (index === 0 && state.alertStatus === "EMERGENCY ACTIVE" ? "Active Alert" : "Resolved");
      const isAlert = alertStatus === "Active Alert";
      const statusBadge = `<span class="badge ${isAlert ? "badge-alert" : "badge-resolved"}">${alertStatus}</span>`;

      const latDisplay = typeof alert.latitude === "number" ? alert.latitude.toFixed(4) : alert.latitude;
      const lngDisplay = typeof alert.longitude === "number" ? alert.longitude.toFixed(4) : alert.longitude;

      tr.innerHTML = `
        <td class="monospace">${alertId}</td>
        <td>${statusBadge}</td>
        <td class="monospace">${latDisplay}, ${lngDisplay}</td>
        <td><strong>${alert.contact || "mom"}</strong></td>
        <td class="monospace">${formatDate(alert.timestamp)}</td>
      `;
      tableBody.appendChild(tr);
    });
  }
}

/**
 * Format ISO date for table display
 */
function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch (e) {
    return isoStr || "-";
  }
}

/**
 * Trigger emergency test from Dashboard
 * Calls triggerEmergency() from detection/trigger.js if available
 */
async function triggerMockAlert() {
  console.log("🚨 [SafeWord Dashboard] 'Test Alert' button clicked.");

  if (typeof triggerEmergency === "function") {
    try {
      console.log("📡 [SafeWord Dashboard] Invoking triggerEmergency()...");
      await triggerEmergency();
      syncWithStorage();
      return;
    } catch (err) {
      console.warn("⚠️ [SafeWord Dashboard] triggerEmergency() failed or GPS unavailable, using mock fallback:", err);
    }
  }

  // Fallback: If triggerEmergency isn't loaded or GPS is blocked, simulate and write to localStorage
  const fallbackAlert = {
    latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
    longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
    timestamp: new Date().toISOString(),
    contact: "mom"
  };

  try {
    let alerts = [];
    const stored = localStorage.getItem("safewordAlerts");
    if (stored) {
      const parsed = JSON.parse(stored);
      alerts = Array.isArray(parsed) ? parsed : [parsed];
    }
    alerts.unshift(fallbackAlert);
    localStorage.setItem("safewordAlerts", JSON.stringify(alerts));
  } catch (e) {
    console.error("Storage error:", e);
  }

  syncWithStorage();
}

/**
 * Resolve the active emergency alert and update localStorage
 */
function resolveCurrentAlert() {
  console.log("🛡️ [SafeWord Dashboard] Resolving active emergency alert.");
  state.alertStatus = "STANDBY";

  const stored = getStoredAlerts();
  if (stored && stored.length > 0) {
    stored[0].status = "Resolved";
    try {
      localStorage.setItem("safewordAlerts", JSON.stringify(stored));
    } catch (e) {
      console.error(e);
    }
  }

  syncWithStorage();
}

// Listen for updates across tabs/windows (e.g. from detection/test.html)
window.addEventListener("storage", (event) => {
  if (event.key === "safewordAlerts") {
    console.log("🔄 [SafeWord Dashboard] 'safewordAlerts' changed in localStorage, updating UI...");
    syncWithStorage();
  }
});

// Refresh on window focus to ensure fresh data
window.addEventListener("focus", () => {
  syncWithStorage();
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  syncWithStorage();
  console.log("✅ [SafeWord Dashboard] Connected to safewordAlerts in localStorage.");
});
