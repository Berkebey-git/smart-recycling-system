// Bu dosya ne işe yarar:
// Uygulamanın ana giriş noktasıdır; veritabanı bağlantısını başlatır, middleware ve endpoint'leri yükler, sunucuyu ayağa kaldırır.
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { initSQLite } = require("./config/sqlite");
const apiRoutes = require("./routes/apiRoutes");
const authRoutes = require("./routes/authRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
// Burada ne yapılıyor:
// İstek gereği sunucu her zaman 5000 portunda çalıştırılır.
const PORT = 5000;

// MongoDB bağlantısı uygulama açılırken kurulur.
// MongoDB bağlanamazsa bile connectDB içinde hata yakalanır ve sunucu çalışmaya devam eder.
connectDB();
// SQLite bağlantısı ve tablo kurulumları uygulama açılırken hazırlanır.
// Başarısız olursa backend memory fallback ile çalışmaya devam eder.
initSQLite();

// CORS ve JSON body desteği aktif edilir.
app.use(cors());
app.use(express.json());

// Temel sağlık kontrol endpoint'i: Sunucunun çalışıp çalışmadığını hızlıca test etmek için kullanılır.
// Bu fonksiyon ne yapar:
// Kök URL'e gelen isteğe servis ayakta bilgisini JSON olarak döner.
app.get("/", (_req, res) => {
  res.status(200).json({ message: "Smart recycling backend is running." });
});

// /api ile başlayan tüm endpoint'ler route dosyasına yönlendirilir.
app.use("/api", apiRoutes);
// Auth endpoint'leri ayrı route dosyasından /api altına eklenir.
app.use("/api", authRoutes);

// Tanımsız route ve genel hata yakalama middleware'leri.
app.use(notFound);
app.use(errorHandler);

// Sunucu belirtilen portta dinlemeye başlar.
// Bu fonksiyon ne yapar:
// Sunucu başarıyla başladığında terminale bilgilendirme mesajı yazdırır.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
