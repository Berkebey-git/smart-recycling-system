// Bu dosya ne işe yarar:
// Basit kullanıcı kayıt ve giriş işlemlerini SQLite üzerinde yönetir.
const bcrypt = require("bcrypt");
const { isSQLiteReady, runSQLite, getSQLite } = require("../config/sqlite");

const allowedRoles = ["user", "admin"];

// Bu fonksiyon ne yapar:
// Basit email doğrulaması yaparak hatalı formatları erken engeller.
const isValidEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const register = async (req, res, next) => {
  try {
    if (!isSQLiteReady()) {
      return res.status(503).json({ message: "Kayit sistemi su anda kullanilamiyor." });
    }

    const { username, email, password, role = "user" } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Gecerli bir e-posta giriniz." });
    }
    const normalizedUsername = (username || "").trim();
    if (normalizedUsername.length < 2) {
      return res.status(400).json({ message: "Kullanici adi en az 2 karakter olmalidir." });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Sifre en az 6 karakter olmalidir." });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Rol user veya admin olmalidir." });
    }

    const existingUser = await getSQLite(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingUser) {
      return res.status(409).json({ message: "Bu e-posta ile kayitli kullanici var." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await runSQLite(
      `INSERT INTO users (username, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [normalizedUsername, email, hashedPassword, role, new Date().toISOString()]
    );

    return res.status(201).json({
      message: "Kayit basarili.",
      user: { id: result.lastID, username: normalizedUsername, email, role },
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    if (!isSQLiteReady()) {
      return res.status(503).json({ message: "Giris sistemi su anda kullanilamiyor." });
    }

    const { email, password } = req.body;
    if (!isValidEmail(email) || typeof password !== "string") {
      return res.status(400).json({ message: "E-posta veya sifre gecersiz." });
    }

    const user = await getSQLite(
      `SELECT id, username, email, password, role, createdAt FROM users WHERE email = ?`,
      [email]
    );
    if (!user) {
      return res.status(401).json({ message: "E-posta veya sifre hatali." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "E-posta veya sifre hatali." });
    }

    // Burada ne yapılıyor:
    // JWT yerine basitlik için token olarak kullanıcı kimliği döndürülür.
    return res.status(200).json({
      message: "Giris basarili.",
      token: String(user.id),
      userId: user.id,
      username: user.username,
      // Burada ne yapılıyor:
      // Frontend'in kolay kullanımı için rol bilgisi üst seviyede de döndürülür.
      role: user.role,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login };
