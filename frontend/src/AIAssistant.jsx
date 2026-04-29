import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./AIAssistant.css";

// Bu dosya ne işe yarar:
// Dashboard sağ alt köşesinde konuşabilen AI avatarı gösterir.
// Gelen mesaja göre tarayıcı TTS ile konuşur, konuşurken ağız ve pulse animasyonu çalışır.

function AIAssistant({ speechEvent }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Bu fonksiyon ne yapar:
  // Kullanıcı sesi kapatıp açabilsin diye mute durumunu değiştirir.
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    if (!isMuted) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Bu hook ne yapar:
  // Yeni mesaj geldiğinde SpeechSynthesis ile konuşma başlatır.
  useEffect(() => {
    if (!speechEvent?.text || isMuted) return;

    const utterance = new SpeechSynthesisUtterance(speechEvent.text);
    utterance.lang = "tr-TR";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [speechEvent, isMuted]);

  return (
    <div className="ai-assistant-wrapper">
      <motion.div
        className={`ai-avatar ${isSpeaking ? "talking" : ""}`}
        animate={isSpeaking ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={{ repeat: isSpeaking ? Infinity : 0, duration: 1 }}
      >
        <div className="ai-face">
          <span className="ai-eye" />
          <span className="ai-eye" />
        </div>
        <div className="ai-cheeks" aria-hidden="true">
          <span />
          <span />
        </div>
        {/* Burada ne yapılıyor:
        Konuşma anında ağız açılıp kapanıyor, konuşma bitince animasyon duruyor. */}
        <div className={`ai-mouth ${isSpeaking ? "moving" : ""}`} />
      </motion.div>

      <button type="button" className="mute-button" onClick={toggleMute}>
        {isMuted ? "Sesi Aç" : "Sesi Kapat"}
      </button>
    </div>
  );
}

export default AIAssistant;
