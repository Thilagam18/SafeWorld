# SafeWord

SafeWord is a simple emergency safety web application for hackathon demos. A user triggers an alert, the browser captures their location, the backend stores the alert and simulates notifying an emergency contact, and the dashboard shows alert history.

## Features

- Emergency trigger button
- Browser location detection (on demand, not continuous tracking)
- Emergency contact field
- Backend alert API (in-memory storage)
- Alert history list with refresh
- Simulated contact notification (server console logs)
- Map showing the latest emergency location (Leaflet + OpenStreetMap)
- Dashboard-style status on the frontend

## Technology

**Frontend:** HTML, CSS, vanilla JavaScript, Geolocation API, Fetch API, Leaflet (CDN)

**Backend:** Node.js, Express, CORS

## Installation

1. Clone or open this repository.
2. Install backend dependencies:

```bash
cd backend
npm install
```

The frontend has no npm dependencies; open the HTML files directly or serve the `frontend` folder with any static file server.

## Running

**Backend** (port 5000):

```bash
cd backend
node server.js
```

You should see: `SafeWord backend listening on http://localhost:5000`

**Frontend:**

- Open `frontend/index.html` in a browser, or
- From the project root: `npx --yes serve frontend -p 3000` and visit `http://localhost:3000`

For geolocation, use `http://localhost` (not `file://`) if your browser restricts location on local files.

## API

Base URL: `http://localhost:5000`

### GET /

Health check.

**Response:** plain text

```
SafeWord backend running
```

### POST /trigger

Create and store an emergency alert.

**Request body (JSON):**

```json
{
  "lat": 11.0168,
  "lng": 76.9558,
  "timestamp": "2026-09-22T10:00:00Z",
  "contact": "mom"
}
```

- `lat` and `lng` are required (numbers).
- `timestamp` is optional (defaults to server time).
- `contact` is optional (defaults to `"emergency contact"`).

**Success response (200):**

```json
{
  "status": "sent",
  "contacts_notified": 1,
  "alert": {
    "id": 1,
    "lat": 11.0168,
    "lng": 76.9558,
    "timestamp": "2026-09-22T10:00:00Z",
    "contact": "mom",
    "status": "sent"
  }
}
```

**Error (400)** — missing or invalid location:

```json
{
  "error": "Missing location data"
}
```

### GET /alerts

Returns all stored alerts (newest IDs are higher; order is insertion order).

**Response (200):** JSON array of alert objects.

## Demo Flow

1. Start the backend on port 5000.
2. Open the SafeWord frontend.
3. Confirm the server status shows connected (GET `/`).
4. Enter an emergency contact name.
5. Press **Send emergency alert**.
6. Allow location when prompted.
7. The frontend POSTs to `/trigger` with lat, lng, timestamp, and contact.
8. The backend logs `🚨 ALERT RECEIVED` and a simulated notification.
9. The UI shows success details and refreshes alert history from GET `/alerts`.
10. A second trigger creates another alert in the in-memory list.

## Teammate integration

Keep using:

- `POST http://localhost:5000/trigger` with the JSON body above
- `GET http://localhost:5000/alerts`

Do not change this contract without coordinating with the team.
