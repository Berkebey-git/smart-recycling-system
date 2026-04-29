// Bu dosya ne işe yarar:
// API URL yollarını controller fonksiyonlarına bağlayarak endpoint yönlendirmesini yapar.
const express = require("express");
const {
  postData,
  postDrop,
  postReward,
  getStatus,
  getHistory,
  resetSystem,
} = require("../controllers/recyclingController");
const { attachOptionalUser } = require("../middleware/authMiddleware");
const router = express.Router();

// Bu endpoint geri dönüşüm verisini alır ve veritabanına kaydeder.
router.post("/data", postData);
// Bu endpoint atığın kutuya bırakılma (drop) olayını simüle eder.
router.post("/drop", attachOptionalUser, postDrop);
// Bu endpoint atık türü ve ağırlığa göre ödül puanını hesaplar.
router.post("/reward", postReward);
// Bu endpoint kutunun en güncel durumunu getirir.
router.get("/status", getStatus);
// Bu endpoint son 20 atık kaydını geçmiş olarak listeler.
router.get("/history", getHistory);
// Bu endpoint yalnızca admin için sistemi sıfırlar (waste_logs temizlenir).
router.post("/reset", attachOptionalUser, resetSystem);

// Bu route, kamera görüntü akışını test etmek için şimdilik yer tutucu bir görsel döner.
// İleride gerçek kamera (RTSP/USB/IP) entegrasyonu burada yapılacak ve canlı akış bu endpoint üzerinden verilecektir.
router.get("/camera", (_req, res) => {
  const placeholderSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#1f2937" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#f9fafb" font-size="26" font-family="Arial, sans-serif">
    Camera stream placeholder
  </text>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.status(200).send(placeholderSvg);
});

module.exports = router;
