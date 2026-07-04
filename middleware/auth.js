function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/admin/login');
}

function attachUser(req, res, next) {
  res.locals.currentUser = req.session && req.session.username ? req.session.username : null;
  next();
}

module.exports = { requireAuth, attachUser };
