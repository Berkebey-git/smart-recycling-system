// Bu dosya ne işe yarar:
// MongoDB bağlantısını merkezi olarak kurar.
// Bağlantı başarısız olsa bile sunucu çalışmaya devam eder ve fallback sistemi devreye girer.
const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    // MONGO_URI bilgisini .env dosyasından alarak MongoDB'ye bağlanır.
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    // MongoDB neden başarısız olabilir:
    // Servis kapalı olabilir, URI yanlış olabilir veya ağ erişim sorunu yaşanabilir.
    // Burada uygulama kapatılmaz; sadece bilgilendirme log'u atılır.
    console.error(`MongoDB connection failed: ${error.message}`);
    console.log("MongoDB not connected, running without database");
    return false;
  }
};

module.exports = connectDB;
