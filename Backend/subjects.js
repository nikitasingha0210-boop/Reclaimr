/* ═══════════════════════════════════════════════
   ROUTE : /api/subjects
   Handles all subject CRUD operations
   All routes are protected (JWT required)
═══════════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const Subject = require('../models/Subject');
const protect = require('../middleware/authMiddleware');

// Apply protect middleware to ALL routes in this file
router.use(protect);

/* ─────────────────────────────────────────────
   GET /api/subjects
   Get all subjects for the logged-in user
───────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject
      .find({ userId: req.userId })
      .sort({ createdAt: 1 }); // oldest first

    res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });

  } catch (err) {
    console.error('Get subjects error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching subjects.',
    });
  }
});

/* ─────────────────────────────────────────────
   POST /api/subjects
   Add a new subject
───────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    // Validate
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject name is required.',
      });
    }

    // Max length check
    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Subject name cannot exceed 50 characters.',
      });
    }

    // Check for duplicate (case-insensitive) for same user
    const existing = await Subject.findOne({
      userId: req.userId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have a subject with this name.',
      });
    }

    const subject = await Subject.create({
      userId: req.userId,
      name:   name.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Subject added successfully.',
      subject,
    });

  } catch (err) {
    console.error('Add subject error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error adding subject.',
    });
  }
});

/* ─────────────────────────────────────────────
   PUT /api/subjects/:id
   Rename an existing subject
───────────────────────────────────────────── */
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New subject name is required.',
      });
    }

    // Find subject that belongs to this user
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject renamed successfully.',
      subject,
    });

  } catch (err) {
    console.error('Update subject error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating subject.',
    });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/subjects/:id
   Delete a subject by ID
───────────────────────────────────────────── */
router.delete('/:id', async (req, res) => {
  try {
    // Only delete if subject belongs to this user
    const subject = await Subject.findOneAndDelete({
      _id:    req.params.id,
      userId: req.userId,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully.',
    });

  } catch (err) {
    console.error('Delete subject error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting subject.',
    });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/subjects
   Delete ALL subjects for logged-in user
───────────────────────────────────────────── */
router.delete('/', async (req, res) => {
  try {
    await Subject.deleteMany({ userId: req.userId });

    res.status(200).json({
      success: true,
      message: 'All subjects deleted successfully.',
    });

  } catch (err) {
    console.error('Delete all subjects error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting all subjects.',
    });
  }
});

module.exports = router;