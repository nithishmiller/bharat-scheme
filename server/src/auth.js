import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HttpError } from './validate.js';

export const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };

export function makeAuth({ jwtSecret }, repo) {
  const sign = (user) => jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const verify = (pw, h) => bcrypt.compareSync(pw, h);

  async function userFromRequest(req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) return null;
    try {
      const { sub } = jwt.verify(m[1], jwtSecret);
      return (await repo.findUserById(sub)) || null;
    } catch {
      return null;
    }
  }

  const optionalAuth = async (req, _res, next) => {
    req.user = await userFromRequest(req);
    next();
  };
  const requireAuth = async (req, _res, next) => {
    req.user = await userFromRequest(req);
    if (!req.user) return next(new HttpError(401, 'unauthorized', 'Sign in required'));
    next();
  };
  const requireAdmin = (req, _res, next) =>
    req.user?.role === 'admin' ? next() : next(new HttpError(403, 'forbidden', 'Admin only'));

  return { sign, hash, verify, optionalAuth, requireAuth, requireAdmin };
}
