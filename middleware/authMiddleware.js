// Bu middleware ne yapar:
// Basit oturum modeli için istemciden gelen userId bilgisini isteğe opsiyonel olarak ekler.
const attachOptionalUser = (req, _res, next) => {
  const rawUserId = req.headers["x-user-id"] || req.body?.userId;
  const parsedUserId = Number(rawUserId);

  if (Number.isInteger(parsedUserId) && parsedUserId > 0) {
    req.userId = parsedUserId;
  } else {
    req.userId = null;
  }

  next();
};

module.exports = { attachOptionalUser };
