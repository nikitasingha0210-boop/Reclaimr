/* ═══════════════════════════════════════════════
   ROUTE : /api/goals
   Handles all goal CRUD operations
   All routes are protected (JWT required)
═══════════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const Goal    = require('../models/Goal');
const protect = require('../middleware/authMiddleware');

// Apply protect middleware to ALL routes in this file
router.use(protect);

/* ─────────────────────────────────────────────
   GET /api/goals
   Get all goals for the logged-in user
   Optional query: ?done=true  or  ?done=false
───────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.userId };

    // Filter by completion status if provided
    if (req.query.done !== undefined) {
      filter.done = req.query.done === 'true';
    }

    const goals = await Goal
      .find(filter)
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      success: true,
      count: goals.length,
      goals,
    });

  } catch (err) {
    console.error('Get goals error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching goals.',
    });
  }
});

/* ─────────────────────────────────────────────
   POST /api/goals
   Create a new goal
───────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;

    // Validate
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Goal text is required.',
      });
    }

    // Max length check
    if (text.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Goal text cannot exceed 200 characters.',
      });
    }

    const goal = await Goal.create({
      userId: req.userId,
      text:   text.trim(),
      done:   false,
    });

    res.status(201).json({
      success: true,
      message: 'Goal created successfully.',
      goal,
    });

  } catch (err) {
    console.error('Create goal error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error creating goal.',
    });
  }
});

/* ─────────────────────────────────────────────
   PUT /api/goals/:id
   Update a goal — toggle done or edit text
───────────────────────────────────────────── */
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.text !== undefined) updates.text = req.body.text.trim();
    if (req.body.done !== undefined) updates.done = req.body.done;

    // Make sure there's something to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update fields provided.',
      });
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Goal updated successfully.',
      goal,
    });

  } catch (err) {
    console.error('Update goal error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating goal.',
    });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/goals/:id
   Delete a single goal
───────────────────────────────────────────── */
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id:    req.params.id,
      userId: req.userId,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully.',
    });

  } catch (err) {
    console.error('Delete goal error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting goal.',
    });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/goals
   Delete ALL goals for logged-in user
───────────────────────────────────────────── */
router.delete('/', async (req, res) => {
  try {
    await Goal.deleteMany({ userId: req.userId });

    res.status(200).json({
      success: true,
      message: 'All goals deleted successfully.',
    });

  } catch (err) {
    console.error('Delete all goals error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting all goals.',
    });
  }
});

module.exports = router;