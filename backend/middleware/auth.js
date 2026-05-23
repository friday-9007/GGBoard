/**
 * Authentication & Authorization Middleware
 * Handles JWT verification and role-based access control.
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * Verify JWT token from Authorization header.
 * Attaches decoded user info to req.user
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, teamId }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Require authenticated user (any role)
 */
function requireAuth(req, res, next) {
  verifyToken(req, res, next);
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

/**
 * Require team leader role
 */
function requireTeamLeader(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'team_leader') {
      return res.status(403).json({ error: 'Team leader access required.' });
    }
    next();
  });
}

/**
 * Require admin OR team leader
 */
function requireAdminOrLeader(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'team_leader') {
      return res.status(403).json({ error: 'Admin or team leader access required.' });
    }
    next();
  });
}

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      teamId: user.team_id || null
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = {
  verifyToken,
  requireAuth,
  requireAdmin,
  requireTeamLeader,
  requireAdminOrLeader,
  generateToken
};
