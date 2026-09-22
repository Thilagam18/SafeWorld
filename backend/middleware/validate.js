function sanitizeText(value, maxLen = 200) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLen);
}

function isValidPhone(phone) {
  const normalized = String(phone).trim();
  if (normalized.length < 8 || normalized.length > 20) return false;
  return /^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/.test(normalized);
}

function parseLocation(body) {
  const { lat, lng } = body || {};
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    return { error: "Missing location data" };
  }
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return { error: "Missing location data" };
  }
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return { error: "Invalid location coordinates" };
  }
  return { lat: latNum, lng: lngNum };
}

module.exports = { sanitizeText, isValidPhone, parseLocation };
