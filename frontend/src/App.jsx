import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AIAssistant from "./AIAssistant";
import "./App.css";

// Bu dosya ne işe yarar:
// Akıllı geri dönüşüm sistemi için dashboard ekranını oluşturur ve API'den canlı veriyi çeker.

const STATUS_URL = "http://localhost:5000/api/status";
const CAMERA_URL = "http://127.0.0.1:8000/video_feed";
const REGISTER_URL = "http://localhost:5000/api/register";
const LOGIN_URL = "http://localhost:5000/api/login";
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: index * 0.06 },
  }),
};

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const isLoggedIn = Boolean(localStorage.getItem("userId"));
  const userRole = localStorage.getItem("role");
  // Bu state ne yapar:
  // API'den gelen canlı algılama, kutu toplamları ve puan bilgilerini saklar.
  const [status, setStatus] = useState({
    detectedObject: "Algılanmadı",
    currentWeight: 0,
    paperTotalWeight: 0,
    plasticTotalWeight: 0,
    glassTotalWeight: 0,
    paperFillLevel: 0,
    plasticFillLevel: 0,
    glassFillLevel: 0,
    totalPoints: 0,
    dailyPaperWeight: 0,
    dailyPlasticWeight: 0,
    dailyGlassWeight: 0,
    dailyTotalWeight: 0,
  });
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("-");
  // Bu state ne yapar:
  // Kamera akışının yüklenme durumunu tutar: yukleniyor, hazir veya hata.
  const [cameraState, setCameraState] = useState("yukleniyor");
  const [registerUsername, setRegisterUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assistantSpeechEvent, setAssistantSpeechEvent] = useState({ text: "", id: 0 });
  const previousStatusRef = useRef(null);

  // Bu fonksiyon ne yapar:
  // Sayfa yenilemeden URL değiştirir ve basit istemci yönlendirmesi sağlar.
  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    // Burada ne yapılıyor:
    // Kullanıcı giriş yapmadıysa tüm korumalı sayfalar otomatik /login'e yönlendirilir.
    if (!isLoggedIn && currentPath !== "/login" && currentPath !== "/register") {
      navigateTo("/login");
    }
    if (isLoggedIn && (currentPath === "/login" || currentPath === "/register")) {
      navigateTo("/");
    }
  }, [currentPath, isLoggedIn]);

  // Bu fonksiyon ne yapar:
  // Backend'den durum verisini alır ve ekrana basılacak state'i günceller.
  const fetchStatus = async () => {
    try {
      const response = await fetch(STATUS_URL);

      if (!response.ok) {
        throw new Error("Durum verisi alinamadi.");
      }

      const data = await response.json();
      setStatus(data);
      // Burada ne yapılıyor:
      // Veri her başarıyla geldiğinde "son güncelleme" saati yenilenir.
      setLastUpdated(new Date().toLocaleTimeString("tr-TR"));
      setError("");
    } catch (_err) {
      // Burada ne yapılıyor:
      // İstek başarısız olursa kullanıcıya basit bir uyarı gösterilir.
      setError("Sunucuya baglanilamadi.");
    }
  };

  // Bu hook ne yapar:
  // Sayfa açılınca /api/status verisini çeker ve her 2 saniyede bir canlı olarak yeniler.
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 2000);

    return () => clearInterval(intervalId);
  }, [isLoggedIn]);

  // Bu değişken ne yapar:
  // API'den gelen değeri kontrol ederek ekranda güvenli bir algılama metni gösterir.
  const detectedText =
    !status.detectedObject || status.detectedObject === "-" || status.detectedObject === "Algılanmadı"
      ? "Algılanmadı"
      : status.detectedObject;
  // Burada ne yapılıyor:
  // UI'da daha anlaşılır olması için "Algılanmadı" değeri "Yok" olarak gösterilir.
  const detectedDisplayText = detectedText === "Algılanmadı" ? "Yok" : detectedText;
  const isDetected = detectedText !== "Algılanmadı";

  // Burada ne yapılıyor:
  // Sağ taraftaki kutu kartlarını tek bir listeden üretmek için yapı oluşturuluyor.
  const binCards = [
    {
      icon: "📄",
      title: "Kağıt Kutusu",
      totalLabel: "Kağıt Toplam",
      className: "paper-card",
      totalWeight: status.paperTotalWeight,
      fillLevel: status.paperFillLevel,
    },
    {
      icon: "🧴",
      title: "Plastik Kutusu",
      totalLabel: "Plastik Toplam",
      className: "plastic-card",
      totalWeight: status.plasticTotalWeight,
      fillLevel: status.plasticFillLevel,
    },
    {
      icon: "🍾",
      title: "Cam Kutusu",
      totalLabel: "Cam Toplam",
      className: "glass-card",
      totalWeight: status.glassTotalWeight,
      fillLevel: status.glassFillLevel,
    },
  ];

  // Bu dizi ne yapar:
  // API'den gelen teknik key isimlerini Türkçe etiketlerle kart içinde kullanıcı dostu biçimde listeler.
  const statusSummary = [
    { label: "Algılanan Atık", value: detectedDisplayText },
    { label: "Anlık Ağırlık", value: `${status.currentWeight} kg` },
    { label: "Kağıt Toplam", value: `${status.paperTotalWeight} kg` },
    { label: "Plastik Toplam", value: `${status.plasticTotalWeight} kg` },
    { label: "Cam Toplam", value: `${status.glassTotalWeight} kg` },
    { label: "Toplam Puan", value: status.totalPoints },
  ];

  // Bu hook ne yapar:
  // Durum değişimlerini izler; algılama veya kutuya ekleme olursa AI asistanın konuşma metnini günceller.
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (!previousStatus) {
      previousStatusRef.current = status;
      return;
    }

    const typeNameMap = {
      plastic: "Plastik",
      paper: "Kağıt",
      glass: "Cam",
      "Algılanmadı": "Algılanmadı",
    };

    const currentDetected = status.detectedObject;
    const previousDetected = previousStatus.detectedObject;

    const isDropHappened =
      status.paperTotalWeight > previousStatus.paperTotalWeight ||
      status.plasticTotalWeight > previousStatus.plasticTotalWeight ||
      status.glassTotalWeight > previousStatus.glassTotalWeight;

    if (isDropHappened) {
      setAssistantSpeechEvent((prev) => ({ text: "Atık kutuya eklendi", id: prev.id + 1 }));
    } else if (currentDetected !== previousDetected && currentDetected !== "Algılanmadı") {
      setAssistantSpeechEvent((prev) => ({
        text: `${typeNameMap[currentDetected] || currentDetected} algılandı`,
        id: prev.id + 1,
      }));
    }

    previousStatusRef.current = status;
  }, [status]);

  // Bu fonksiyon ne yapar:
  // Giriş kartındaki e-posta ve şifre alanlarını kullanarak kullanıcı kaydı gönderir.
  const handleRegister = async () => {
    try {
      const response = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: registerUsername, email, password }),
      });

      if (!response.ok) {
        throw new Error("Kayit istegi basarisiz.");
      }

      alert("Kayıt başarılı, giriş yapabilirsiniz");
      navigateTo("/login");
    } catch (_error) {
      alert("Kayıt başarısız");
    }
  };

  // Bu fonksiyon ne yapar:
  // Giriş butonuna basıldığında login endpoint'ine istek atar ve başarılıysa userId'yi localStorage'a kaydeder.
  const handleLogin = async () => {
    let data = null;
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      // Burada ne yapılıyor:
      // Backend yanıtı JSON olarak okunur ve hem başarı hem hata durumunda kullanılmak üzere saklanır.
      data = await response.json();
      console.log(data);
      console.log("Login response:", data);

      if (!response.ok) {
        alert("Giriş başarısız");
        console.log(data);
        return;
      }

      // Burada ne yapılıyor:
      // Başarılı girişte kullanıcı bilgileri sonraki sayfalarda kullanılmak üzere saklanır.
      localStorage.setItem("userId", data.userId);
      // Burada ne yapılıyor:
      // SADECE geliştirme ortamı için geçici kural: belirli e-posta admin rolüne zorlanır.
      const effectiveRole = email === "berke@gmail.com" ? "admin" : data.role || "user";
      localStorage.setItem("role", effectiveRole);
      alert("Giriş başarılı");
      navigateTo("/");
    } catch (_error) {
      alert("Giriş başarısız");
      console.log(data);
    }
  };

  // Bu fonksiyon ne yapar:
  // Oturumu sonlandırır, yerel bilgileri siler ve kullanıcıyı login sayfasına gönderir.
  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    navigateTo("/login");
  };

  // Bu fonksiyon ne yapar:
  // Yalnızca admin kullanıcı için backend reset endpoint'ini çağırarak sistemi sıfırlar.
  const handleAdminReset = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await fetch("http://localhost:5000/api/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Burada ne yapılıyor:
        // Backend /api/reset endpoint'i userId bilgisini body içinden beklediği için JSON olarak gönderilir.
        body: JSON.stringify({ userId: Number(userId) }),
      });

      if (!response.ok) {
        throw new Error("Reset istegi basarisiz.");
      }

      alert("Sistem sıfırlandı");
      fetchStatus();
    } catch (_error) {
      alert("Yetkisiz işlem");
    }
  };

  const renderAuthNavigation = () => (
    <div className="auth-nav">
      <button
        type="button"
        className={`auth-nav-btn ${currentPath === "/login" ? "active" : ""}`}
        onClick={() => navigateTo("/login")}
      >
        Giriş Yap
      </button>
      <button
        type="button"
        className={`auth-nav-btn ${currentPath === "/register" ? "active" : ""}`}
        onClick={() => navigateTo("/register")}
      >
        Kayıt Ol
      </button>
    </div>
  );

  if (!isLoggedIn && currentPath === "/login") {
    return (
      <main className="dashboard-page auth-page">
        {renderAuthNavigation()}
        <section className="auth-card">
          <h2>Giriş Yap</h2>
          {/* Bu form ne yapar:
          Kullanıcının e-posta ve şifre ile sisteme giriş yapmasını sağlar. */}
          <form className="auth-form">
            <label htmlFor="login-email">E-posta</label>
            <input
              id="login-email"
              type="email"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="login-password">Şifre</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="button" onClick={handleLogin}>
              Giriş Yap
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!isLoggedIn && currentPath === "/register") {
    return (
      <main className="dashboard-page auth-page">
        {renderAuthNavigation()}
        <section className="auth-card">
          <h2>Kayıt Ol</h2>
          {/* Bu form ne yapar:
          Kullanıcı adı, e-posta ve şifre ile yeni kullanıcı hesabı oluşturur. */}
          <form className="auth-form">
            <label htmlFor="register-username">Kullanıcı Adı</label>
            <input
              id="register-username"
              type="text"
              placeholder="kullanici_adi"
              value={registerUsername}
              onChange={(event) => setRegisterUsername(event.target.value)}
            />
            <label htmlFor="register-email">E-posta</label>
            <input
              id="register-email"
              type="email"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="register-password">Şifre</label>
            <input
              id="register-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="button" onClick={handleRegister}>
              Kayıt Ol
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <nav className="top-navbar">
        {/* Burada ne yapılıyor:
        Üst başlık alanında kullanıcı adı yerine sade panel adı gösterilir. */}
        <span>Akıllı Geri Dönüşüm Yönetim Paneli</span>
        <div className="navbar-actions">
          {/* Burada ne yapılıyor:
          localStorage role bilgisi admin ise reset butonu gösterilir, normal kullanıcıdan gizlenir. */}
          {userRole === "admin" && (
            <button type="button" className="reset-btn" onClick={handleAdminReset}>
              Sistemi Sıfırla
            </button>
          )}
          <button type="button" onClick={handleLogout}>
            Çıkış Yap
          </button>
        </div>
      </nav>
      <header className="page-header">
        <h1>Akıllı Geri Dönüşüm Yönetim Paneli</h1>
        <p>Canlı algılama, kutu doluluk takibi ve ödül yönetimi</p>
        <div className="header-meta">
          <span className="last-updated">Son Güncelleme: {lastUpdated}</span>
          <span className={`detect-badge ${isDetected ? "active" : "passive"}`}>
            {isDetected ? "Nesne Algılandı" : "Bekleme Modu"}
          </span>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}

      <section className="layout-grid">
        <section className="left-panel">
          <motion.article
            className="camera-box"
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -2 }}
          >
            <h2>Kamera Görüntüsü</h2>
            <div className="camera-stream-wrapper">
              {/* Bu görsel ne yapar:
              Bu görüntü YOLO tarafından işlenmiş canlı kameradır. */}
              <img
                src={CAMERA_URL}
                alt="Canli kamera goruntusu"
                className="camera-stream-image"
                onLoad={() => setCameraState("hazir")}
                onError={() => setCameraState("hata")}
              />
              {/* Burada ne yapılıyor:
              Kamera henüz hazır değilse veya akış hatalıysa kullanıcıya durum bilgisi gösterilir. */}
              {cameraState !== "hazir" && (
                <div className="camera-connecting">
                  {cameraState === "hata" ? "Kamera bağlantısı yok" : "Kamera bağlanıyor..."}
                </div>
              )}
            </div>
          </motion.article>

          <motion.article
            className="info-card"
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -2 }}
          >
            <h2>Algılanan Atık</h2>
            <div className="status-summary-list">
              {statusSummary.map((item) => (
                <p key={item.label} className="status-summary-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </p>
              ))}
            </div>
          </motion.article>

          <motion.article
            className={`info-card ${isDetected ? "detected-glow" : ""}`}
            initial={{ opacity: 0, y: 20 }}
            whileHover={{ y: -2 }}
            // Burada ne yapılıyor:
            // Nesne algılandığında kart etrafında yumuşak parlama efekti gösterilir.
            animate={{
              opacity: 1,
              y: 0,
              boxShadow: isDetected
                ? "0 0 0 1px rgba(16,185,129,.35), 0 0 24px rgba(16,185,129,.35)"
                : "0 12px 30px rgba(15, 23, 42, 0.1)",
            }}
            transition={{ duration: 0.35, delay: 0.06 }}
          >
            <h2>Algılanan Atık</h2>
            <AnimatePresence mode="wait">
              <motion.p
                key={detectedText}
                className="value-main"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {detectedDisplayText}
              </motion.p>
            </AnimatePresence>
            <p className="sub-value">
              {isDetected ? "Sınıflandırma başarılı şekilde yapıldı." : "Kamera yeni atık bekliyor."}
            </p>
          </motion.article>

          <motion.article
            className="info-card"
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -2 }}
          >
            <h2>Anlık Ağırlık</h2>
            {/* Burada ne yapılıyor:
            Ağırlık değiştiğinde sayı yumuşak geçişle yeniden görünür. */}
            <AnimatePresence mode="wait">
              <motion.p
                key={status.currentWeight}
                className="value-main"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                {status.currentWeight} kg
              </motion.p>
            </AnimatePresence>
            <p className="sub-value">Sensör verisi canlı olarak güncellenir.</p>
          </motion.article>
        </section>

        <section className="right-panel">
          {/* Burada ne yapılıyor:
          Bu bölüm veritabanındaki tüm zamanların birikimli değerlerini "Toplam Atık" olarak gösterir. */}
          <h2 className="group-title">Toplam Atık</h2>
          {binCards.map((bin, index) => (
            <motion.article
              key={bin.title}
              className={`info-card ${bin.className}`}
              custom={index + 3}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -2 }}
            >
              <h2 className="bin-title">
                <span className="bin-icon" aria-hidden="true">
                  {bin.icon}
                </span>
                {bin.title}
              </h2>
              <AnimatePresence mode="wait">
                <motion.p
                  key={bin.totalWeight}
                  className="value-main"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {bin.totalLabel}: {bin.totalWeight} kg
                </motion.p>
              </AnimatePresence>
              <div className="progress-area">
                <div className="progress-info">
                  <span>Doluluk Oranı</span>
                  <strong>%{bin.fillLevel}</strong>
                </div>
                {/* Burada ne yapılıyor:
                Doluluk değeri değiştikçe progress bar Framer Motion ile akıcı şekilde animasyonlanır. */}
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, bin.fillLevel))}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      </section>

      <section className="bottom-grid">
        {/* Burada ne yapılıyor:
        Alt bölüm sadece genel panel kartlarını (puan ve günlük istatistik) dengeli biçimde gösterir. */}

        <motion.article
          className="info-card reward-card"
          custom={5}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -2 }}
        >
          <h2>Toplam Puan</h2>
          <div className="qr-placeholder">QR</div>
          <p className="reward-note">QR okutma modülü yakında aktif olacak.</p>
          <div className="points-box">
            <span>Toplam Puan</span>
            <AnimatePresence mode="wait">
              <motion.strong
                key={status.totalPoints}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.22 }}
              >
                {status.totalPoints}
              </motion.strong>
            </AnimatePresence>
          </div>
        </motion.article>

        <motion.article
          className="info-card daily-card"
          custom={6}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -2 }}
        >
          <h2>Günlük Atık</h2>
          {/* Burada ne yapılıyor:
          createdAt tarih filtresiyle sadece bugüne ait kayıtlar ayrı bir kartta gösterilir. */}
          <div className="daily-list">
            <p>Kağıt: {status.dailyPaperWeight} kg</p>
            <p>Plastik: {status.dailyPlasticWeight} kg</p>
            <p>Cam: {status.dailyGlassWeight} kg</p>
            <p className="daily-total">Toplam: {status.dailyTotalWeight} kg</p>
          </div>
        </motion.article>
      </section>

      <AIAssistant speechEvent={assistantSpeechEvent} />
    </main>
  );
}

export default App;
