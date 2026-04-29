// Bu dosya ne işe yarar:
// Geri dönüşüm kutusuna gelen her atık olayını geçmiş kayıt olarak tutan WasteLog modelini tanımlar.
const mongoose = require("mongoose");
const allowedTypes = ["plastic", "paper", "glass"];

// Burada ne yapılıyor:
// Atık kaydının alanları ve doğrulama kuralları belirlenerek şema oluşturulur.
const wasteLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: allowedTypes,
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    fillLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    detectedObject: {
      type: String,
      default: "unknown",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// WasteLog modeli veritabanındaki atık kayıtlarını temsil eder.
module.exports = mongoose.model("WasteLog", wasteLogSchema);
