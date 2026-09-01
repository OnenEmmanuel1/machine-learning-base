/**
 * Authentication & Authorization Middleware (NFR4 Security)
 */

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Please log in to access this resource.');
  return res.redirect('/auth/login');
}

function ensureRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error', 'Please log in to access this resource.');
      return res.redirect('/auth/login');
    }

    if (allowedRoles.includes(req.session.user.role)) {
      return next();
    }

    req.flash('error', 'Access denied. You do not have permission for this section.');
    if (req.session.user.role === 'student') {
      return res.redirect('/student/dashboard');
    } else {
      return res.redirect('/lecturer/dashboard');
    }
  };
}

function ensureLecturerOrAdmin(req, res, next) {
  return ensureRole(['lecturer', 'administrator'])(req, res, next);
}

function ensureAdmin(req, res, next) {
  return ensureRole(['administrator'])(req, res, next);
}

function ensureStudent(req, res, next) {
  return ensureRole(['student'])(req, res, next);
}

function exposeLocals(req, res, next) {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.userRole = req.session && req.session.user ? req.session.user.role : null;
  res.locals.flashSuccess = req.flash ? req.flash('success') : [];
  res.locals.flashError = req.flash ? req.flash('error') : [];
  res.locals.flashInfo = req.flash ? req.flash('info') : [];
  res.locals.currentPath = req.path;
  next();
}

module.exports = {
  ensureAuthenticated,
  ensureRole,
  ensureLecturerOrAdmin,
  ensureAdmin,
  ensureStudent,
  exposeLocals
};
