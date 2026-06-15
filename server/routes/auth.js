const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User, Student, Teacher } = require('../models');
const { protect, authorize, isSuperAdmin } = require('../middleware/auth');
const { validateLogin, validateRegister, validateChangePassword } = require('../middleware/validator');

// (M7 fix) — all roles including student and parent can change their own password
const PASSWORD_CHANGE_ROLES = ['admin', 'admin2', 'teacher', 'fee_collector', 'student', 'parent'];

// (L1 fix) — rate limit login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// (L2 fix) — rate limit registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 attempts per window
  message: { message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// POST /api/auth/login
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = await User.findOne({
      where: { email },
      include: [
        { model: Student, as: 'linkedStudent', attributes: ['id', 'first_name', 'last_name', 'class', 'section', 'approval_status'] },
        { model: Teacher, as: 'linkedTeacher', attributes: ['id', 'name', 'subject', 'assigned_classes'] }
      ]
    });

    console.log(`[LOGIN] Attempt for email: "${email}"`);
    if (!user) {
      console.log(`[LOGIN] ❌ Fail: No user found in DB for email "${email}"`);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      console.log(`[LOGIN] ❌ Fail: User exists but is inactive/deactivated: "${email}"`);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    console.log(`[LOGIN] Password verification result for "${email}": ${isMatch}`);

    if (!isMatch) {
      console.log(`[LOGIN] ❌ Fail: Incorrect password for "${email}"`);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.role === 'student' && user.linkedStudent?.approval_status !== 'approved') {
      return res.status(403).json({ message: 'Student account is pending approval.' });
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profile_photo: user.profile_photo,
        linkedStudent: user.linkedStudent,
        linkedTeacher: user.linkedTeacher
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// (C2 fix) — POST /api/auth/register is now protected. Only admin can create new users.
// The role field is restricted — admin cannot create another 'admin' via this endpoint.
router.post('/register', protect, isSuperAdmin, registerLimiter, validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, linked_student_id, linked_teacher_id } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    // Whitelist allowed roles for registration (prevent self-escalation)
    const ALLOWED_REGISTER_ROLES = ['admin2', 'teacher', 'student', 'parent', 'fee_collector'];
    if (role && !ALLOWED_REGISTER_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${ALLOWED_REGISTER_ROLES.join(', ')}` });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'parent',
      linked_student_id: linked_student_id || null,
      linked_teacher_id: linked_teacher_id || null,
    });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      message: 'User created successfully.',
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// PUT /api/auth/change-password — (M7 fix) all authenticated users can change password
router.put('/change-password', protect, authorize(...PASSWORD_CHANGE_ROLES), validateChangePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Current password and a 6+ character new password are required.' });
    }

    const user = await User.findByPk(req.user.id);

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    // (M5 fix) — track when password was changed so tokens issued before this are invalidated
    user.password_changed_at = new Date();
    await user.save();

    // Issue a new token so the user stays logged in
    const token = signToken(user.id);

    res.json({ message: 'Password changed successfully.', token });
  } catch (err) {
    res.status(500).json({ message: 'Password change failed. Please try again.' });
  }
});

module.exports = router;
