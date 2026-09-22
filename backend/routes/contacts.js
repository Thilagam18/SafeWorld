const express = require("express");
const { requireUser } = require("../middleware/userContext");
const { sanitizeText, isValidPhone } = require("../middleware/validate");
const {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
} = require("../database/db");

const router = express.Router();

router.use(requireUser);

router.get("/", (req, res) => {
  try {
    res.json(listContacts(req.userId));
  } catch (err) {
    console.error("GET /contacts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", (req, res) => {
  try {
    const name = sanitizeText(req.body?.name, 120);
    const phone = sanitizeText(req.body?.phone, 24);
    const relationship = sanitizeText(req.body?.relationship, 80);
    const enabled = req.body?.enabled !== false;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const contact = createContact(req.userId, { name, phone, relationship, enabled });
    res.status(201).json(contact);
  } catch (err) {
    console.error("POST /contacts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", (req, res) => {
  try {
    const contactId = req.params.id;
    const updates = {};

    if (req.body?.name !== undefined) {
      const name = sanitizeText(req.body.name, 120);
      if (!name) return res.status(400).json({ error: "Name cannot be empty" });
      updates.name = name;
    }
    if (req.body?.phone !== undefined) {
      const phone = sanitizeText(req.body.phone, 24);
      if (!isValidPhone(phone)) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
      updates.phone = phone;
    }
    if (req.body?.relationship !== undefined) {
      updates.relationship = sanitizeText(req.body.relationship, 80);
    }
    if (req.body?.enabled !== undefined) {
      updates.enabled = Boolean(req.body.enabled);
    }

    const updated = updateContact(req.userId, contactId, updates);
    if (!updated) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("PUT /contacts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const ok = deleteContact(req.userId, req.params.id);
    if (!ok) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.json({ status: "deleted" });
  } catch (err) {
    console.error("DELETE /contacts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
