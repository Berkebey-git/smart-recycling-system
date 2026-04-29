// Bu dosya ne işe yarar:
// Gerçek zamanlı algılama, canlı ağırlık, kutu doluluk takibi ve ödül puanı mantığını yönetir.
const BinStatus = require("../models/BinStatus");
const WasteLog = require("../models/WasteLog");
const mongoose = require("mongoose");
const { isSQLiteReady, runSQLite, getSQLite, allSQLite } = require("../config/sqlite");

const rewardMultipliers = { paper: 1, plastic: 2, glass: 3 };
const allowedTypes = Object.keys(rewardMultipliers);
const binCapacityKg = 20;
const detectionTimeoutMs = 5000;
const getTodayKey = () => new Date().toISOString().slice(0, 10);

// Burada ne yapılıyor:
// MongoDB çalışmasa da sistemin devam etmesi için canlı durum geçici bellekte tutulur.
const liveState = {
  detectedObject: "Algılanmadı",
  currentWeight: 0,
  lastDetectedAt: null,
  bins: {
    paper: { totalWeight: 0, fillLevel: 0 },
    plastic: { totalWeight: 0, fillLevel: 0 },
    glass: { totalWeight: 0, fillLevel: 0 },
  },
  totalPoints: 0,
  daily: {
    dateKey: getTodayKey(),
    paperWeight: 0,
    plasticWeight: 0,
    glassWeight: 0,
  },
  // Burada ne yapılıyor:
  // SQLite kapalı olduğunda geçmiş endpoint'i için son kayıtlar bellekte tutulur.
  history: [],
};

const isMongoConnected = () => mongoose.connection.readyState === 1;

// Bu fonksiyon ne yapar:
// Tür ve ağırlık bilgisinin geçerli olup olmadığını kontrol eder.
const validateTypeAndWeight = (type, weight) => {
  if (!allowedTypes.includes(type)) {
    return "Type must be one of: plastic, paper, glass.";
  }
  if (typeof weight !== "number" || Number.isNaN(weight) || weight < 0) {
    return "Weight must be a non-negative number.";
  }
  return null;
};

// Bu fonksiyon ne yapar:
// Algılama verisi belli süre güncellenmezse nesneyi "Algılanmadı" durumuna sıfırlar.
const resetDetectionIfNoObject = () => {
  if (!liveState.lastDetectedAt) return;
  const elapsed = Date.now() - liveState.lastDetectedAt;
  if (elapsed > detectionTimeoutMs) {
    liveState.detectedObject = "Algılanmadı";
    liveState.currentWeight = 0;
    liveState.lastDetectedAt = null;
  }
};

// Bu fonksiyon ne yapar:
// Gün değiştiğinde günlük verileri otomatik olarak sıfırlar.
// Basit tarih kontrolü ile sadece bugüne ait toplamlar tutulur.
const resetDailyIfNewDay = () => {
  const todayKey = getTodayKey();
  if (liveState.daily.dateKey !== todayKey) {
    liveState.daily.dateKey = todayKey;
    liveState.daily.paperWeight = 0;
    liveState.daily.plasticWeight = 0;
    liveState.daily.glassWeight = 0;
  }
};

// Bu fonksiyon ne yapar:
// UI'ın ihtiyaç duyduğu sade durum verisini tek formatta döndürür.
const buildStatusResponse = () => {
  resetDetectionIfNoObject();
  resetDailyIfNewDay();

  const dailyTotalWeight =
    liveState.daily.paperWeight +
    liveState.daily.plasticWeight +
    liveState.daily.glassWeight;

  return {
    detectedObject: liveState.detectedObject,
    currentWeight: liveState.currentWeight,
    paperTotalWeight: liveState.bins.paper.totalWeight,
    plasticTotalWeight: liveState.bins.plastic.totalWeight,
    glassTotalWeight: liveState.bins.glass.totalWeight,
    paperFillLevel: liveState.bins.paper.fillLevel,
    plasticFillLevel: liveState.bins.plastic.fillLevel,
    glassFillLevel: liveState.bins.glass.fillLevel,
    totalPoints: liveState.totalPoints,
    dailyPaperWeight: Number(liveState.daily.paperWeight.toFixed(2)),
    dailyPlasticWeight: Number(liveState.daily.plasticWeight.toFixed(2)),
    dailyGlassWeight: Number(liveState.daily.glassWeight.toFixed(2)),
    dailyTotalWeight: Number(dailyTotalWeight.toFixed(2)),
    dailyTotalRewardPoints: Number(
      (
        liveState.daily.paperWeight * rewardMultipliers.paper +
        liveState.daily.plasticWeight * rewardMultipliers.plastic +
        liveState.daily.glassWeight * rewardMultipliers.glass
      ).toFixed(2)
    ),
  };
};

// Bu fonksiyon ne yapar:
// SQLite kullanılabiliyorsa status bilgisini veritabanından üretir; sorun olursa memory fallback'e döner.
const buildStatusFromSQLiteOrMemory = async () => {
  resetDetectionIfNoObject();
  resetDailyIfNewDay();

  if (!isSQLiteReady()) {
    return buildStatusResponse();
  }

  try {
    const todayKey = getTodayKey();
    const totals = await getSQLite(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'paper' THEN weight END), 0) AS paperTotalWeight,
        COALESCE(SUM(CASE WHEN type = 'plastic' THEN weight END), 0) AS plasticTotalWeight,
        COALESCE(SUM(CASE WHEN type = 'glass' THEN weight END), 0) AS glassTotalWeight,
        COALESCE(SUM(rewardPoints), 0) AS totalPoints
      FROM waste_logs`
    );

    // Burada ne yapılıyor:
    // Günlük değerler daily_stats tablosundan değil, doğrudan waste_logs.createdAt tarihine göre hesaplanır.
    const daily = await getSQLite(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'paper' THEN weight END), 0) AS paperWeight,
        COALESCE(SUM(CASE WHEN type = 'plastic' THEN weight END), 0) AS plasticWeight,
        COALESCE(SUM(CASE WHEN type = 'glass' THEN weight END), 0) AS glassWeight,
        COALESCE(SUM(weight), 0) AS totalWeight,
        COALESCE(SUM(rewardPoints), 0) AS totalRewardPoints
      FROM waste_logs
      WHERE DATE(createdAt) = DATE(?)`,
      [todayKey]
    );

    const paperTotalWeight = Number(Number(totals?.paperTotalWeight || 0).toFixed(2));
    const plasticTotalWeight = Number(Number(totals?.plasticTotalWeight || 0).toFixed(2));
    const glassTotalWeight = Number(Number(totals?.glassTotalWeight || 0).toFixed(2));
    const totalPoints = Number(Number(totals?.totalPoints || 0).toFixed(2));

    return {
      detectedObject: liveState.detectedObject,
      currentWeight: liveState.currentWeight,
      paperTotalWeight,
      plasticTotalWeight,
      glassTotalWeight,
      paperFillLevel: Number(Math.min(100, ((paperTotalWeight / binCapacityKg) * 100).toFixed(2))),
      plasticFillLevel: Number(Math.min(100, ((plasticTotalWeight / binCapacityKg) * 100).toFixed(2))),
      glassFillLevel: Number(Math.min(100, ((glassTotalWeight / binCapacityKg) * 100).toFixed(2))),
      totalPoints,
      dailyPaperWeight: Number(Number(daily?.paperWeight || 0).toFixed(2)),
      dailyPlasticWeight: Number(Number(daily?.plasticWeight || 0).toFixed(2)),
      dailyGlassWeight: Number(Number(daily?.glassWeight || 0).toFixed(2)),
      dailyTotalWeight: Number(Number(daily?.totalWeight || 0).toFixed(2)),
      dailyTotalRewardPoints: Number(Number(daily?.totalRewardPoints || 0).toFixed(2)),
    };
  } catch (_error) {
    return buildStatusResponse();
  }
};

// Bu fonksiyon ne yapar:
// Drop kaydını SQLite'a (varsa) yazar, günlük toplamları günceller ve memory history listesine ekler.
const persistDropRecord = async ({ dropRecord, droppedType, droppedWeight, rewardPoints }) => {
  if (isSQLiteReady()) {
    try {
      await runSQLite(
        `INSERT INTO waste_logs (type, weight, fillLevel, rewardPoints, userId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          dropRecord.type,
          dropRecord.weight,
          dropRecord.fillLevel,
          dropRecord.rewardPoints,
          dropRecord.userId,
          dropRecord.createdAt,
        ]
      );

      const todayKey = getTodayKey();
      await runSQLite(
        `INSERT OR IGNORE INTO daily_stats
         (date, paperWeight, plasticWeight, glassWeight, totalWeight, totalRewardPoints)
         VALUES (?, 0, 0, 0, 0, 0)`,
        [todayKey]
      );

      await runSQLite(
        `UPDATE daily_stats
         SET
           paperWeight = paperWeight + ?,
           plasticWeight = plasticWeight + ?,
           glassWeight = glassWeight + ?,
           totalWeight = totalWeight + ?,
           totalRewardPoints = totalRewardPoints + ?
         WHERE date = ?`,
        [
          droppedType === "paper" ? droppedWeight : 0,
          droppedType === "plastic" ? droppedWeight : 0,
          droppedType === "glass" ? droppedWeight : 0,
          droppedWeight,
          rewardPoints,
          todayKey,
        ]
      );
    } catch (_sqliteError) {
      // Burada ne yapılıyor:
      // SQLite başarısız olursa servis durmasın diye memory fallback ile devam edilir.
    }
  }

  liveState.history.unshift(dropRecord);
  liveState.history = liveState.history.slice(0, 20);
};

// Bu endpoint ne yapar:
// Kamerada nesne varken gelen canlı algılama bilgisini günceller.
const postData = async (req, res, next) => {
  try {
    const { type, weight } = req.body;
    const validationError = validateTypeAndWeight(type, weight);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Burada ne yapılıyor:
    // Nesne algılanınca canlı ekranda gösterilecek obje türü ve ağırlık güncellenir.
    liveState.detectedObject = type;
    liveState.currentWeight = weight;
    liveState.lastDetectedAt = Date.now();

    if (isMongoConnected()) {
      // Burada ne yapılıyor:
      // MongoDB varsa algılama log'u veritabanına da yazılır.
      await WasteLog.create({
        type,
        weight,
        fillLevel: liveState.bins[type].fillLevel,
        detectedObject: type,
      });
      await BinStatus.findOneAndUpdate(
        {},
        {
          detectedObject: type,
          weight,
          fillLevel: liveState.bins[type].fillLevel,
          updatedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return res.status(200).json({
      message: "Detection received.",
      live: buildStatusResponse(),
    });
  } catch (error) {
    return next(error);
  }
};

// Bu endpoint ne yapar:
// Algılanan atık sisteme "atıldı/accepted" simülasyonu yapar ve ilgili kutuya ekler.
const postDrop = async (req, res, next) => {
  try {
    resetDetectionIfNoObject();
    resetDailyIfNewDay();

    const { type, weight, fillLevel } = req.body || {};
    const hasDirectPayload =
      typeof type === "string" && typeof weight === "number" && typeof fillLevel === "number";

    // Burada ne yapılıyor:
    // Eğer istemci type/weight/fillLevel gönderirse doğrudan kayıt modu çalışır.
    if (hasDirectPayload) {
      const validationError = validateTypeAndWeight(type, weight);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      if (Number.isNaN(fillLevel) || fillLevel < 0 || fillLevel > 100) {
        return res.status(400).json({ message: "fillLevel 0 ile 100 arasinda olmalidir." });
      }

      const droppedType = type;
      const droppedWeight = weight;
      const rewardPoints = Number((droppedWeight * rewardMultipliers[droppedType]).toFixed(2));
      const dropRecord = {
        type: droppedType,
        weight: droppedWeight,
        fillLevel: Number(fillLevel.toFixed(2)),
        rewardPoints,
        userId: req.userId || null,
        createdAt: new Date().toISOString(),
      };

      // Burada ne yapılıyor:
      // Canlı durum kartlarının güncel kalması için toplamlar ve günlük değerler memory'de de güncellenir.
      liveState.bins[droppedType].totalWeight = Number(
        (liveState.bins[droppedType].totalWeight + droppedWeight).toFixed(2)
      );
      liveState.bins[droppedType].fillLevel = dropRecord.fillLevel;
      liveState.totalPoints = Number((liveState.totalPoints + rewardPoints).toFixed(2));
      liveState.daily[`${droppedType}Weight`] = Number(
        (liveState.daily[`${droppedType}Weight`] + droppedWeight).toFixed(2)
      );

      await persistDropRecord({ dropRecord, droppedType, droppedWeight, rewardPoints });
      return res.status(200).json({ message: "Kayıt eklendi" });
    }

    if (liveState.detectedObject === "Algılanmadı") {
      return res.status(400).json({
        message: "No detected object to drop.",
      });
    }

    const droppedType = liveState.detectedObject;
    const droppedWeight = liveState.currentWeight;
    const rewardPoints = Number((droppedWeight * rewardMultipliers[droppedType]).toFixed(2));
    const bin = liveState.bins[droppedType];

    // Burada ne yapılıyor:
    // Atık doğru kutuya eklenir, kutu doluluk oranı hesaplanır ve puan arttırılır.
    bin.totalWeight = Number((bin.totalWeight + droppedWeight).toFixed(2));
    bin.fillLevel = Math.min(
      100,
      Number(((bin.totalWeight / binCapacityKg) * 100).toFixed(2))
    );
    liveState.totalPoints = Number((liveState.totalPoints + rewardPoints).toFixed(2));
    // Burada ne yapılıyor:
    // Drop çağrıldığında bugünkü ilgili atık türü toplamına ağırlık eklenir.
    liveState.daily[`${droppedType}Weight`] = Number(
      (liveState.daily[`${droppedType}Weight`] + droppedWeight).toFixed(2)
    );

    const dropRecord = {
      type: droppedType,
      weight: droppedWeight,
      fillLevel: bin.fillLevel,
      rewardPoints,
      userId: req.userId || null,
      createdAt: new Date().toISOString(),
    };

    await persistDropRecord({ dropRecord, droppedType, droppedWeight, rewardPoints });

    // Burada ne yapılıyor:
    // Atık düştükten sonra yeni nesne beklemek için canlı algılama sıfırlanır.
    liveState.detectedObject = "Algılanmadı";
    liveState.currentWeight = 0;
    liveState.lastDetectedAt = null;

    return res.status(200).json({
      message: "Drop accepted.",
      droppedType,
      droppedWeight,
      rewardPoints,
      live: await buildStatusFromSQLiteOrMemory(),
    });
  } catch (error) {
    return next(error);
  }
};

// Bu endpoint ne yapar:
// Ödül puanını tür ve ağırlığa göre hesaplar. (Ek yardımcı endpoint)
const postReward = (req, res) => {
  const { type, weight } = req.body;
  const validationError = validateTypeAndWeight(type, weight);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }
  return res.status(200).json({
    type,
    weight,
    multiplier: rewardMultipliers[type],
    rewardPoints: weight * rewardMultipliers[type],
  });
};

// Bu endpoint ne yapar:
// Dashboard için anlık algılama, canlı ağırlık, kutu toplamları ve puan bilgisini döner.
const getStatus = async (_req, res, next) => {
  try {
    const status = await buildStatusFromSQLiteOrMemory();
    return res.status(200).json(status);
  } catch (error) {
    return next(error);
  }
};

// Bu endpoint ne yapar:
// Son 20 atık kaydını (tür, ağırlık, doluluk, puan, zaman) geçmiş listesi olarak döner.
const getHistory = async (_req, res, next) => {
  try {
    if (isSQLiteReady()) {
      const rows = await allSQLite(
        `SELECT id, type, weight, fillLevel, rewardPoints, userId, createdAt
         FROM waste_logs
         ORDER BY datetime(createdAt) DESC
         LIMIT 20`
      );
      return res.status(200).json(rows);
    }

    return res.status(200).json(liveState.history);
  } catch (error) {
    return next(error);
  }
};

// Bu endpoint ne yapar:
// Sadece admin kullanıcı için tüm waste_logs kayıtlarını temizler.
const resetSystem = async (req, res, next) => {
  try {
    // Burada ne yapılıyor:
    // İstemci uyumsuzluklarında sorun yaşamamak için userId önce body'den, yoksa header'dan alınır.
    const requesterId = Number(req.body?.userId || req.headers["x-user-id"]);
    if (!requesterId || !isSQLiteReady()) {
      return res.status(403).json({ message: "Yetkisiz işlem" });
    }

    // Burada ne yapılıyor:
    // userId ile rol ve e-posta bilgisi okunur; geçici geliştirme kuralı da burada kontrol edilir.
    const requester = await getSQLite(`SELECT role, email FROM users WHERE id = ?`, [requesterId]);
    console.log("Reset isteyen user:", { userId: requesterId, role: requester?.role, email: requester?.email });

    // Geçici geliştirme çözümü:
    // Veritabanında admin rolü olanlar veya belirli test e-postası reset yapabilir.
    const isAdmin = requester?.role === "admin";
    const isDevByEmail = requester?.email === "berke@gmail.com";
    if (!requester || (!isAdmin && !isDevByEmail)) {
      return res.status(403).json({ message: "Yetkisiz işlem" });
    }

    await runSQLite(`DELETE FROM waste_logs`);

    // Burada ne yapılıyor:
    // Ekrandaki anlık durum ile veritabanı tutarlı kalsın diye bellek tarafı da sıfırlanır.
    liveState.bins.paper.totalWeight = 0;
    liveState.bins.paper.fillLevel = 0;
    liveState.bins.plastic.totalWeight = 0;
    liveState.bins.plastic.fillLevel = 0;
    liveState.bins.glass.totalWeight = 0;
    liveState.bins.glass.fillLevel = 0;
    liveState.totalPoints = 0;
    liveState.daily.paperWeight = 0;
    liveState.daily.plasticWeight = 0;
    liveState.daily.glassWeight = 0;
    liveState.history = [];

    return res.status(200).json({ message: "Sistem sıfırlandı" });
  } catch (error) {
    return next(error);
  }
};

module.exports = { postData, postDrop, postReward, getStatus, getHistory, resetSystem };
