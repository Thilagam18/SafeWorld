const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

const DEFAULT_CONTACT = "emergency contact";
const alerts = [];
let nextAlertId = 1;

app.use(cors());
app.use(express.json());

function notifyContact(contact, alert) {
  console.log(`📲 Notifying ${contact}`);
  console.log(`📍 Emergency location: ${alert.lat}, ${alert.lng}`);
}

app.get("/", (req, res) => {
  res.type("text").send("SafeWord backend running");
});

app.post("/trigger", (req, res) => {
  try {
    const body = req.body || {};
    const { lat, lng, timestamp, contact } = body;

    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      return res.status(400).json({ error: "Missing location data" });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return res.status(400).json({ error: "Missing location data" });
    }

    const alert = {
      id: nextAlertId++,
      lat: latNum,
      lng: lngNum,
      timestamp: timestamp || new Date().toISOString(),
      contact:
        contact && String(contact).trim()
          ? String(contact).trim()
          : DEFAULT_CONTACT,
      status: "sent",
    };

    alerts.push(alert);

    console.log("🚨 ALERT RECEIVED");
    notifyContact(alert.contact, alert);

    res.json({
      status: "sent",
      contacts_notified: 1,
      alert,
    });
  } catch (err) {
    console.error("POST /trigger error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/alerts", (req, res) => {
  try {
    res.json(alerts);
  } catch (err) {
    console.error("GET /alerts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Malformed JSON:", err.message);
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`SafeWord backend listening on http://localhost:${PORT}`);
});
