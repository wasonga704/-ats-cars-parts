require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool, init } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ats2026";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

function genId() {
  return "id-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
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

app.post("/api/vehicles", requireAuth, async (req, res) => {
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
    price: Number(price)
  };
  try {
    await pool.query(
      `INSERT INTO vehicles (id, name, year, mileage, fuel, transmission, price)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [row.id, row.name, row.year, row.mileage, row.fuel, row.transmission, row.price]
    );
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

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

app.post("/api/parts", requireAuth, async (req, res) => {
  const { name, fits, sku, price } = req.body || {};
  if (!name || !fits || !sku || price === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const row = {
    id: genId(),
    name: String(name).trim(),
    fits: String(fits).trim(),
    sku: String(sku).trim(),
    price: Number(price)
  };
  try {
    await pool.query(
      `INSERT INTO parts (id, name, fits, sku, price) VALUES ($1,$2,$3,$4,$5)`,
      [row.id, row.name, row.fits, row.sku, row.price]
    );
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

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
