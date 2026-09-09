const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL. Set it in your .env file (local) or your host's environment variables (live)."
  );
  process.exit(1);
}

// Neon, Supabase, and most hosted Postgres providers require SSL.
// Local databases (e.g. testing on your own machine) usually don't support it,
// so it's switched off automatically for localhost connections.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      mileage TEXT NOT NULL,
      fuel TEXT NOT NULL,
      transmission TEXT NOT NULL,
      price INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS parts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fits TEXT NOT NULL,
      sku TEXT NOT NULL,
      price INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  const { rows: vRows } = await pool.query("SELECT COUNT(*)::int AS n FROM vehicles");
  if (vRows[0].n === 0) {
    const defaultVehicles = [
      ["v1", "Toyota Axio", 2015, "82,400 km", "Petrol", "Auto", 1150000],
      ["v2", "Subaru Forester", 2016, "96,100 km", "Petrol", "4WD", 1890000],
      ["v3", "Toyota Land Cruiser Prado", 2014, "110,300 km", "Diesel", "4WD", 4650000],
      ["v4", "Mazda Demio", 2017, "58,900 km", "Petrol", "Auto", 980000]
    ];
    for (const row of defaultVehicles) {
      await pool.query(
        `INSERT INTO vehicles (id, name, year, mileage, fuel, transmission, price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        row
      );
    }
  }

  const { rows: pRows } = await pool.query("SELECT COUNT(*)::int AS n FROM parts");
  if (pRows[0].n === 0) {
    const defaultParts = [
      ["p1", "Brake Pad Set (Front)", "Toyota Axio / Fielder", "BP-1042-F", 3800],
      ["p2", "Shock Absorber", "Nissan Note", "SA-2210-N", 5500],
      ["p3", "Alternator", "Toyota Probox / Succeed", "AL-3305-P", 9200],
      ["p4", "Radiator", "Subaru Forester", "RD-4118-S", 12600],
      ["p5", "Timing Belt Kit", "Mazda Demio", "TB-5027-D", 6900],
      ["p6", "Headlamp Assembly", "Toyota Land Cruiser Prado", "HL-6134-LC", 15300]
    ];
    for (const row of defaultParts) {
      await pool.query(
        `INSERT INTO parts (id, name, fits, sku, price) VALUES ($1,$2,$3,$4,$5)`,
        row
      );
    }
  }
}

module.exports = { pool, init };
