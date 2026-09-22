function buildGoogleMapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatEmergencyMessage(displayName, locationUrl, timestampIso) {
  let formattedTime;
  try {
    formattedTime = new Date(timestampIso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    formattedTime = timestampIso;
  }

  return (
    `🚨 SAFEWORD EMERGENCY ALERT\n\n` +
    `${displayName} may need immediate help.\n\n` +
    `Current location:\n${locationUrl}\n\n` +
    `Time:\n${formattedTime}\n\n` +
    `Please check on them immediately.`
  );
}

function smsConfigured() {
  return Boolean(
    process.env.SMS_PROVIDER &&
      process.env.SMS_ACCOUNT_ID &&
      process.env.SMS_AUTH_TOKEN &&
      process.env.SMS_FROM_NUMBER
  );
}

function whatsappConfigured() {
  return Boolean(
    process.env.WHATSAPP_PROVIDER &&
      process.env.WHATSAPP_ACCOUNT_ID &&
      process.env.WHATSAPP_AUTH_TOKEN &&
      process.env.WHATSAPP_FROM_NUMBER
  );
}

async function sendViaTwilio({ accountId, authToken, from, to, body }) {
  const auth = Buffer.from(`${accountId}:${authToken}`).toString("base64");
  const params = new URLSearchParams();
  params.set("To", to);
  params.set("From", from);
  params.set("Body", body);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountId}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data.message || `Twilio error ${res.status}`;
    throw new Error(errMsg);
  }
  return data;
}

async function sendSMS(contact, message) {
  const provider = (process.env.SMS_PROVIDER || "").toLowerCase();

  if (!smsConfigured()) {
    console.warn("SMS credentials not configured — skipping real SMS delivery");
    return { status: "provider_not_configured", provider: "none" };
  }

  if (provider !== "twilio") {
    console.warn(`SMS provider "${provider}" is not implemented`);
    return { status: "provider_not_configured", provider: provider || "none" };
  }

  try {
    await sendViaTwilio({
      accountId: process.env.SMS_ACCOUNT_ID,
      authToken: process.env.SMS_AUTH_TOKEN,
      from: process.env.SMS_FROM_NUMBER,
      to: contact.phone,
      body: message,
    });
    return { status: "sent", provider: "twilio" };
  } catch (err) {
    console.error("SMS send failed:", err.message);
    return { status: "failed", provider: "twilio", error: err.message };
  }
}

async function sendWhatsApp(contact, message) {
  const provider = (process.env.WHATSAPP_PROVIDER || "").toLowerCase();

  if (!whatsappConfigured()) {
    console.warn("WhatsApp credentials not configured — skipping real WhatsApp delivery");
    return { status: "provider_not_configured", provider: "none" };
  }

  if (provider !== "twilio") {
    console.warn(`WhatsApp provider "${provider}" is not implemented`);
    return { status: "provider_not_configured", provider: provider || "none" };
  }

  const from = process.env.WHATSAPP_FROM_NUMBER.startsWith("whatsapp:")
    ? process.env.WHATSAPP_FROM_NUMBER
    : `whatsapp:${process.env.WHATSAPP_FROM_NUMBER}`;
  const to = contact.phone.startsWith("whatsapp:") ? contact.phone : `whatsapp:${contact.phone}`;

  try {
    await sendViaTwilio({
      accountId: process.env.WHATSAPP_ACCOUNT_ID,
      authToken: process.env.WHATSAPP_AUTH_TOKEN,
      from,
      to,
      body: message,
    });
    return { status: "sent", provider: "twilio_whatsapp" };
  } catch (err) {
    console.error("WhatsApp send failed:", err.message);
    return { status: "failed", provider: "twilio_whatsapp", error: err.message };
  }
}

async function sendEmergencyMessage(contact, message) {
  const preferWhatsApp = whatsappConfigured();
  if (preferWhatsApp) {
    const wa = await sendWhatsApp(contact, message);
    if (wa.status === "sent") return wa;
    if (wa.status === "failed") return wa;
  }

  if (smsConfigured()) {
    return sendSMS(contact, message);
  }

  if (preferWhatsApp && wa.status === "provider_not_configured") {
    return wa;
  }

  return { status: "provider_not_configured", provider: "none" };
}

function messagingConfigured() {
  return smsConfigured() || whatsappConfigured();
}

module.exports = {
  buildGoogleMapsUrl,
  formatEmergencyMessage,
  sendSMS,
  sendWhatsApp,
  sendEmergencyMessage,
  messagingConfigured,
  smsConfigured,
  whatsappConfigured,
};
