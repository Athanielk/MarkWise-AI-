const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'Name and password required' });
  if (!email && !phone) return res.status(400).json({ error: 'Email or phone required' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const id = uuid();
    const stmt = db.prepare('INSERT INTO users (id,name,email,phone,password) VALUES (?,?,?,?,?)');
    stmt.run(id, name, email || null, phone || null, hash);
    const user = db.prepare('SELECT id,name,email,phone,role FROM users WHERE id=?').get(id);
    const token = signToken(user);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 });
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: 'Account already exists' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Credentials required' });
  const user = db.prepare('SELECT * FROM users WHERE email=? OR phone=?').get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const safe = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  const token = signToken(safe);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 });
  res.json({ user: safe, token });
});

// Forgot password (demo: just return message)
router.post('/forgot', (req, res) => {
  const { identifier } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=? OR phone=?').get(identifier, identifier);
  if (!user) return res.status(404).json({ error: 'No account found' });
  res.json({ message: 'Password reset link sent (demo).' });
});

// Me
router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id,name,email,phone,role,school,plan,scripts_marked,plan_limit FROM users WHERE id=?').get(req.user.id);
  res.json({ user });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

module.exports = router;
