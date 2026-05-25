const jwt = require('jsonwebtoken');

const PERMS = {
  admin:   { users: true,  settings: true,  canDelete: true,  canEdit: true,  canCreate: true,  canView: true },
  manager: { users: false, settings: true,  canDelete: true,  canEdit: true,  canCreate: true,  canView: true },
  staff:   { users: false, settings: false, canDelete: false, canEdit: true,  canCreate: true,  canView: true },
  viewer:  { users: false, settings: false, canDelete: false, canEdit: false, canCreate: false, canView: true },
};

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    req.perms = PERMS[payload.role] || PERMS.viewer;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requirePerm(perm) {
  return (req, res, next) => {
    if (!req.perms || !req.perms[perm]) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { auth, requirePerm, PERMS };
