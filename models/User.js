// Bu dosya ne işe yarar:
// Kullanıcı bilgilerini ve puan alanını saklayan User modelini tanımlar.
const mongoose = require("mongoose");
// Burada ne yapılıyor:
// Kullanıcı şeması oluşturularak alan kuralları (required, unique, default vb.) belirlenir.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// User modeli veritabanındaki "users" koleksiyonuna karşılık gelir.
module.exports = mongoose.model("User", userSchema);
