// Bu dosya ne işe yarar:
// Kutunun en son algılanan durumunu (obje, ağırlık, doluluk) tutan BinStatus modelini tanımlar.
const mongoose = require("mongoose");
const allowedTypes = ["plastic", "paper", "glass"];

// Burada ne yapılıyor:
// Anlık kutu durumu için şema ve alan kısıtları tanımlanır.
const binStatusSchema = new mongoose.Schema(
  {
    detectedObject: {
      type: String,
      required: true,
      enum: allowedTypes,
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
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// BinStatus modeli kutunun "anlık/latest" verisini temsil eder.
module.exports = mongoose.model("BinStatus", binStatusSchema);
