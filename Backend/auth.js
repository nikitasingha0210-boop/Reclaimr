/* ═══════════════════════════════════════════════
   ROUTE : /api/auth
   Handles user signup, login, profile
═══════════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const protect = require('../middleware/authMiddleware');

/* ─────────────────────────────────────────────
   HELPER — generate JWT token
───────────────────────────────────────────── */
function generateToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
}

/* ─────────────────────────────────────────────
   POST /api/auth/signup
   Register a new user
───────────────────────────────────────────── */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate all fields present
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    // Password length check
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    // Create user — password hashed by pre-save hook in User model
    const user = await User.create({ name, email, password });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token: generateToken(user._id),
      user: {
        id:        user._id,
        name:      user.name,
        email:     user.email,
        hoursGoal: user.hoursGoal,
      },
    });

  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error during signup.',
    });
  }
});

/* ─────────────────────────────────────────────
   POST /api/auth/login
   Login existing user
───────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token: generateToken(user._id),
      user: {
        id:        user._id,
        name:      user.name,
        email:     user.email,
        hoursGoal: user.hoursGoal,
      },
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error during login.',
    });
  }
});

/* ─────────────────────────────────────────────
   GET /api/auth/me
   Get currently logged-in user info
   Protected — requires valid JWT token
───────────────────────────────────────────── */
router.get('/me', protect, async (req, res) => {
  try {
    // req.userId is set by the protect middleware
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
});

/* ─────────────────────────────────────────────
   PUT /api/auth/profile
   Update user name and daily hours goal
   Protected — requires valid JWT token
───────────────────────────────────────────── */
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, hoursGoal } = req.body;

    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty.',
      });
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        name:      name.trim(),
        hoursGoal: hoursGoal || 4,
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });

  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
});

/* ─────────────────────────────────────────────
   PUT /api/auth/change-password
   Change user password
   Protected — requires valid JWT token
───────────────────────────────────────────── */
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    // Get user with password
    const user = await User.findById(req.userId);

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });

  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
});

module.exports = router;