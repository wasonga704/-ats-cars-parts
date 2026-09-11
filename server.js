require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { pool, init } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ats2026";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "josephwasonga40@gmail.com";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

function genId() {
  return "id-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
}

// ---------- Image upload handling ----------
// Images are stored directly in the database as base64 data URLs, capped at
// 2.5MB each, so they survive server restarts/redeploys on hosts with
// non-persistent disks (like Render's free tier).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2.5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
  }
});

function fileToDataUrl(file) {
  if (!file) return null;
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Image is too large. Please use a photo under 2.5MB." });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

// ---------- Auth middleware ----------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ---------- Auth route ----------
app.post("/api/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password" });
  }
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

// ---------- Vehicles ----------
app.get("/api/vehicles", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM vehicles ORDER BY created_at DESC");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

app.post(
  "/api/vehicles",
  requireAuth,
  (req, res, next) => upload.single("image")(req, res, (err) => handleUploadError(err, req, res, next)),
  async (req, res) => {
    const { name, year, mileage, fuel, transmission, price } = req.body || {};
    if (!name || !year || !mileage || !fuel || !transmission || price === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const row = {
      id: genId(),
      name: String(name).trim(),
      year: Number(year),
      mileage: String(mileage).trim(),
      fuel: String(fuel).trim(),
      transmission: String(transmission).trim(),
      price: Number(price),
      image: fileToDataUrl(req.file)
    };
    try {
      await pool.query(
        `INSERT INTO vehicles (id, name, year, mileage, fuel, transmission, price, image)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [row.id, row.name, row.year, row.mileage, row.fuel, row.transmission, row.price, row.image]
      );
      res.status(201).json(row);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Database error" });
    }
  }
);

app.delete("/api/vehicles/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM vehicles WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Vehicle not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- Spare Parts ----------
app.get("/api/parts", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM parts ORDER BY created_at DESC");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

app.post(
  "/api/parts",
  requireAuth,
  (req, res, next) => upload.single("image")(req, res, (err) => handleUploadError(err, req, res, next)),
  async (req, res) => {
    const { name, fits, sku, price } = req.body || {};
    if (!name || !fits || !sku || price === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const row = {
      id: genId(),
      name: String(name).trim(),
      fits: String(fits).trim(),
      sku: String(sku).trim(),
      price: Number(price),
      image: fileToDataUrl(req.file)
    };
    try {
      await pool.query(
        `INSERT INTO parts (id, name, fits, sku, price, image) VALUES ($1,$2,$3,$4,$5,$6)`,
        [row.id, row.name, row.fits, row.sku, row.price, row.image]
      );
      res.status(201).json(row);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Database error" });
    }
  }
);

app.delete("/api/parts/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM parts WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Part not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- Contact form -> email ----------
let mailer = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
} else {
  console.warn(
    "GMAIL_USER / GMAIL_APP_PASSWORD not set — the contact form will not be able to send emails until these are configured."
  );
}

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill in your name, email, and message." });
  }
  if (!mailer) {
    console.error("Contact form submitted but email is not configured:", { name, email, message });
    return res.status(500).json({ error: "Email is not configured on the server yet." });
  }
  try {
    await mailer.sendMail({
      from: `"ATS Website" <${process.env.GMAIL_USER}>`,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `New enquiry from ${name} — ATS website`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
             <p><strong>Email:</strong> ${escapeHtml(email)}</p>
             <p><strong>Message:</strong></p>
             <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Failed to send contact email:", e);
    res.status(500).json({ error: "Could not send your message right now. Please try again shortly." });
  }
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`ATS server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
