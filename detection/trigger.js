/**
 * SafeWord - Emergency Detection Module
 * First version for hackathon prototype.
 */

function triggerEmergency() {
  console.log("🚨 [SafeWord] triggerEmergency() initiated...");

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by this browser/environment.";
      console.error("❌ [SafeWord]", errorMsg);
      reject(new Error(errorMsg));
      return;
    }

    console.log("📡 [SafeWord] Requesting current GPS location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const alert = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          contact: "mom",
        };

        // Save generated alert data to browser localStorage using key 'safewordAlerts'
        try {
          let alerts = [];
          const stored = localStorage.getItem("safewordAlerts");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              alerts = parsed;
            } else if (parsed && typeof parsed === "object") {
              alerts = [parsed];
            }
          }
          alerts.unshift(alert);
          localStorage.setItem("safewordAlerts", JSON.stringify(alerts));
          console.log("💾 [SafeWord] Alert saved to localStorage['safewordAlerts']:", alert);
        } catch (storageErr) {
          console.error("❌ [SafeWord] Failed to save alert to localStorage:", storageErr);
        }

        console.log("✅ [SafeWord] Emergency alert created successfully:", alert);

        // Send alert data to SafeWord backend
        try {
          const response = await fetch("http://localhost:5000/trigger", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lat: alert.lat,
              lng: alert.lng,
              timestamp: alert.timestamp,
              contact: alert.contact,
            }),
          });

          if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
          }

          const data = await response.json();
          console.log("📡 [SafeWord] Backend notification dispatched:", data);
        } catch (backendErr) {
          console.warn(
            "⚠️ [SafeWord] Backend unavailable, local alert still saved.",
            backendErr.message || backendErr
          );
        }

        resolve(alert);
      },
      (error) => {
        console.error(
          `❌ [SafeWord] Failed to retrieve GPS location (Code ${error.code}): ${error.message}`
        );
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// Make accessible in browser window and module environments
if (typeof window !== "undefined") {
  window.triggerEmergency = triggerEmergency;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { triggerEmergency };
}
