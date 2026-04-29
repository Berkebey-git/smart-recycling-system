// Bu dosya ne işe yarar:
// Uygulamadaki 404 ve genel hata cevaplarını tek bir yerde standart şekilde yönetir.

// Bu fonksiyon ne yapar:
// Tanımlı olmayan bir endpoint çağrıldığında 404 hatası döner.
const notFound = (_req, res) => {
  res.status(404).json({ message: "Route not found." });
};

// Bu fonksiyon ne yapar:
// Uygulama içinde oluşan hataları yakalar ve uygun HTTP kodu ile kullanıcıya iletir.
const errorHandler = (err, _req, res, _next) => {
  // Burada ne yapılıyor:
  // Eğer daha önce bir hata kodu atanmışsa o korunur, yoksa varsayılan olarak 500 kullanılır.
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || "Internal server error.",
  });
};

module.exports = { notFound, errorHandler };
