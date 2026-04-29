// Bu dosya ne işe yarar:
// Kullanıcı kayıt ve giriş endpoint'lerini ayrı bir route dosyasında toplar.
const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// Burada ne yapılıyor:
// Auth endpoint'ine istek geldiğini terminalde doğrulamak için basit log atılır.
router.use((req, _res, next) => {
  console.log(`[AUTH ROUTE] ${req.method} /api${req.path} cagrildi`);
  next();
});

// Yeni kullanıcı kaydı oluşturur.
router.post("/register", register);
// Kullanıcı girişini yapar ve basit token/userId döner.
router.post("/login", login);

module.exports = router;
