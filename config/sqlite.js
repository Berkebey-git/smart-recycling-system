// Bu dosya ne işe yarar:
// SQLite veritabanı bağlantısını açar, gerekli tabloları oluşturur ve temel sorgu yardımcılarını sağlar.
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "smart_recycling.db");
let sqliteDb = null;
let sqliteReady = false;

const initSQLite = async () => {
  try {
    sqliteDb = await new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (error) => {
        if (error) return reject(error);
        resolve(db);
      });
    });

    await run(
      `CREATE TABLE IF NOT EXISTS waste_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        weight REAL NOT NULL,
        fillLevel REAL NOT NULL,
        rewardPoints REAL NOT NULL,
        userId INTEGER,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );

    await run(
      `CREATE TABLE IF NOT EXISTS daily_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        paperWeight REAL NOT NULL DEFAULT 0,
        plasticWeight REAL NOT NULL DEFAULT 0,
        glassWeight REAL NOT NULL DEFAULT 0,
        totalWeight REAL NOT NULL DEFAULT 0,
        totalRewardPoints REAL NOT NULL DEFAULT 0
      )`
    );

    await run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // Burada ne yapılıyor:
    // Daha önce oluşturulmuş waste_logs tablosunda userId alanı yoksa sonradan eklenir.
    const wasteLogColumns = await all(`PRAGMA table_info(waste_logs)`);
    const hasUserIdColumn = wasteLogColumns.some((column) => column.name === "userId");
    if (!hasUserIdColumn) {
      await run(`ALTER TABLE waste_logs ADD COLUMN userId INTEGER`);
    }

    // Burada ne yapılıyor:
    // Eski users tablosunda username yoksa migration ile sonradan eklenir.
    const userColumns = await all(`PRAGMA table_info(users)`);
    const hasUsernameColumn = userColumns.some((column) => column.name === "username");
    if (!hasUsernameColumn) {
      await run(`ALTER TABLE users ADD COLUMN username TEXT`);
      await run(
        `UPDATE users
         SET username = substr(email, 1, instr(email, '@') - 1)
         WHERE username IS NULL OR TRIM(username) = ''`
      );
    }

    sqliteReady = true;
    console.log(`SQLite connected: ${dbPath}`);
    return true;
  } catch (error) {
    sqliteReady = false;
    console.error(`SQLite connection failed: ${error.message}`);
    console.log("SQLite not connected, memory fallback will be used");
    return false;
  }
};

const isSQLiteReady = () => sqliteReady && !!sqliteDb;

// Bu fonksiyon ne yapar:
// INSERT/UPDATE/DELETE gibi sonuç satırı döndürmeyen sorguları Promise olarak çalıştırır.
const run = (query, params = []) =>
  new Promise((resolve, reject) => {
    if (!sqliteDb) return reject(new Error("SQLite is not initialized"));
    sqliteDb.run(query, params, function onRun(error) {
      if (error) return reject(error);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

// Bu fonksiyon ne yapar:
// Tek satır dönen SELECT sorgularını Promise olarak çalıştırır.
const get = (query, params = []) =>
  new Promise((resolve, reject) => {
    if (!sqliteDb) return reject(new Error("SQLite is not initialized"));
    sqliteDb.get(query, params, (error, row) => {
      if (error) return reject(error);
      resolve(row);
    });
  });

// Bu fonksiyon ne yapar:
// Çok satır dönen SELECT sorgularını Promise olarak çalıştırır.
const all = (query, params = []) =>
  new Promise((resolve, reject) => {
    if (!sqliteDb) return reject(new Error("SQLite is not initialized"));
    sqliteDb.all(query, params, (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });

module.exports = { initSQLite, isSQLiteReady, runSQLite: run, getSQLite: get, allSQLite: all };
