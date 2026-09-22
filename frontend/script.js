const API_BASE = "http://localhost:5000";

const emergencyBtn = document.getElementById("emergencyBtn");
const contactInput = document.getElementById("contactInput");
const locationStatus = document.getElementById("locationStatus");
const alertStatus = document.getElementById("alertStatus");
const serverStatus = document.getElementById("serverStatus");
const resultCard = document.getElementById("resultCard");
const resultMessage = document.getElementById("resultMessage");
const alertDetails = document.getElementById("alertDetails");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const refreshAlertsBtn = document.getElementById("refreshAlertsBtn");
const mapEl = document.getElementById("map");
const mapFallback = document.getElementById("mapFallback");

let triggerInProgress = false;
let mapInstance = null;
let mapMarker = null;

function setLocationStatus(text) {
  locationStatus.textContent = text;
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE}/`);
    if (!res.ok) throw new Error("not ok");
    const text = await res.text();
    if (text.includes("SafeWord backend running")) {
      serverStatus.textContent = "Server connected";
      serverStatus.classList.add("ok");
      serverStatus.classList.remove("error");
      return true;
    }
    throw new Error("unexpected response");
  } catch {
    serverStatus.textContent = "Server offline";
    serverStatus.classList.add("error");
    serverStatus.classList.remove("ok");
    return false;
  }
}

function renderAlertDetails(alert) {
  alertDetails.innerHTML = `
    <div><dt>Alert ID</dt><dd>${alert.id}</dd></div>
    <div><dt>Latitude</dt><dd>${alert.lat}</dd></div>
    <div><dt>Longitude</dt><dd>${alert.lng}</dd></div>
    <div><dt>Timestamp</dt><dd>${formatTime(alert.timestamp)}</dd></div>
    <div><dt>Contact</dt><dd>${escapeHtml(alert.contact)}</dd></div>
    <div><dt>Status</dt><dd>${alert.status}</dd></div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updateMap(lat, lng) {
  if (typeof L === "undefined") return;

  mapFallback.classList.add("hidden");
  mapEl.classList.add("visible");

  if (!mapInstance) {
    mapInstance = L.map(mapEl).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapInstance);
    mapMarker = L.marker([lat, lng]).addTo(mapInstance);
  } else {
    mapInstance.setView([lat, lng], 14);
    mapMarker.setLatLng([lat, lng]);
    setTimeout(() => mapInstance.invalidateSize(), 100);
  }
}

function renderHistory(alerts) {
  historyList.innerHTML = "";

  if (!alerts.length) {
    historyEmpty.classList.remove("hidden");
    return;
  }

  historyEmpty.classList.add("hidden");

  const sorted = [...alerts].sort((a, b) => b.id - a.id);

  sorted.forEach((alert) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <strong>Alert #${alert.id}</strong> — ${alert.status}<br />
      📍 ${alert.lat}, ${alert.lng}<br />
      🕐 ${formatTime(alert.timestamp)}<br />
      👤 ${escapeHtml(alert.contact)}
    `;
    historyList.appendChild(li);
  });

  const latest = sorted[0];
  if (latest) {
    updateMap(latest.lat, latest.lng);
  }
}

async function loadAlerts() {
  try {
    const res = await fetch(`${API_BASE}/alerts`);
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    renderHistory(Array.isArray(data) ? data : []);
  } catch {
    alertStatus.textContent =
      "Could not load alert history. Check that the server is running.";
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

async function sendTrigger(lat, lng, contact) {
  const payload = {
    lat,
    lng,
    timestamp: new Date().toISOString(),
    contact: contact || "emergency contact",
  };

  const res = await fetch(`${API_BASE}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data.error === "Missing location data"
        ? "Location data was missing. Please try again."
        : "Unable to send alert. Please try again.";
    throw new Error(msg);
  }

  return data;
}

emergencyBtn.addEventListener("click", async () => {
  if (triggerInProgress) return;

  triggerInProgress = true;
  emergencyBtn.disabled = true;
  alertStatus.textContent = "Sending emergency alert…";
  setLocationStatus("📍 Getting location...");

  const contact = contactInput.value.trim();

  try {
    const serverOk = await checkServerHealth();
    if (!serverOk) {
      alertStatus.textContent =
        "Unable to contact SafeWord server. Please try again.";
      setLocationStatus("📍 Location ready when you trigger");
      return;
    }

    let position;
    try {
      position = await getCurrentPosition();
    } catch (geoErr) {
      if (geoErr.code === 1) {
        alertStatus.textContent =
          "Location permission denied. Enable location access to send an alert with your position.";
      } else {
        alertStatus.textContent =
          "Could not get your location. Check device settings and try again.";
      }
      setLocationStatus("⚠️ Location unavailable");
      return;
    }

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    setLocationStatus("📍 Location ready");

    const result = await sendTrigger(lat, lng, contact);

    resultMessage.textContent = "🚨 Emergency alert sent";
    renderAlertDetails(result.alert);
    resultCard.classList.remove("hidden");
    alertStatus.textContent = "Alert sent successfully.";
    updateMap(result.alert.lat, result.alert.lng);
    await loadAlerts();
  } catch (err) {
    if (err.message.includes("SafeWord") || err.message.includes("Unable")) {
      alertStatus.textContent = err.message;
    } else if (err.message.includes("fetch") || err.name === "TypeError") {
      alertStatus.textContent =
        "Unable to contact SafeWord server. Please try again.";
    } else {
      alertStatus.textContent = err.message || "Something went wrong. Please try again.";
    }
    setLocationStatus("📍 Location ready when you trigger");
  } finally {
    triggerInProgress = false;
    emergencyBtn.disabled = false;
  }
});

refreshAlertsBtn.addEventListener("click", () => {
  loadAlerts();
});

checkServerHealth();
loadAlerts();
