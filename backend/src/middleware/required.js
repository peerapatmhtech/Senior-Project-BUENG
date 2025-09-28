// auth.js
export function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

export function requireOwner(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  // ตรวจสอบว่า user ใน session = user ที่ request มาหรือไม่
  if (req.params.email && req.params.email !== (req.session.userId)) {
    return res.status(403).json({ error: "Forbidden: not your resource" });
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}
