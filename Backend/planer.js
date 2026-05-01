/* ═══════════════════════════════════════════════
   ROUTE : /api/planner
   Handles all planner task CRUD operations
   All routes are protected (JWT required)
═══════════════════════════════════════════════ */

const express     = require('express');
const router      = express.Router();
const PlannerTask = require('../models/PlannerTask');
const protect     = require('../middleware/authMiddleware');

// Apply protect middleware to ALL routes in this file
router.use(protect);

/* ─────────────────────────────────────────────
   GET /api/planner
   Get all planner tasks for the logged-in user
   Optional query: ?date=2025-06-01  ?subject=DSA
───────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.userId };

    // Filter by date or subject if provided
    if (req.query.date)    filter.date    = req.query.date;
    if (req.query.subject) filter.subject = req.query.subject;

    const tasks = await PlannerTask
      .find(filter)
      .sort({ date: 1 }); // earliest date first

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });

  } catch (err) {
    console.error('Get planner tasks error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching planner tasks.',
    });
  }
});

/* ─────────────────────────────────────────────
   GET /api/planner/week
   Get planner tasks for the current week (Mon-Sun)
───────────────────────────────────────────── */
router.get('/week', async (req, res) => {
  try {
    // Calculate Monday of current week
    const today   = new Date();
    const day     = today.getDay(); // 0=Sun
    const monday  = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    // Calculate Sunday of current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Get all dates in the week as YYYY-MM-DD strings
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d.toISOString().slice(0, 10));
    }

    const tasks = await PlannerTask.find({
      userId: req.userId,
      date: { $in: weekDates },
    }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      weekDates,
      count: tasks.length,
      tasks,
    });

  } catch (err) {
    console.error('Get week planner error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching week planner.',
    });
  }
});

/* ─────────────────────────────────────────────
   POST /api/planner
   Add a new planner task
───────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { name, subject, date } = req.body;

    // Validate all required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task name is required.',
      });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required.',
      });
    }
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required.',
      });
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format.',
      });
    }

    const task = await PlannerTask.create({
      userId:  req.userId,
      name:    name.trim(),
      subject: subject.trim(),
      date,
    });

    res.status(201).json({
      success: true,
      message: 'Planner task added successfully.',
      task,
    });

  } catch (err) {
    console.error('Add planner task error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error adding planner task.',
    });
  }
});

/* ─────────────────────────────────────────────
   PUT /api/planner/:id
   Update a planner task (name, subject, date)
───────────────────────────────────────────── */
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name    !== undefined) updates.name    = req.body.name.trim();
    if (req.body.subject !== undefined) updates.subject = req.body.subject.trim();
    if (req.body.date    !== undefined) updates.date    = req.body.date;

    const task = await PlannerTask.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Planner task not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Planner task updated successfully.',
      task,
    });

  } catch (err) {
    console.error('Update planner task error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating planner task.',
    });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/planner/:id
   Delete a single planner task
───────────────────────────────────────────── */
router.delete('/:id', async (req, res) => {
  try {
    const task = await PlannerTask.findOneAndDelete({
      _id:    req.params.id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Planner task not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Planner task deleted successfully.',
    });

  } catch (err) {
    console.error('Delete planner task error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting planner task.',
    });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/planner
   Delete ALL planner tasks for logged-in user
───────────────────────────────────────────── */
router.delete('/', async (req, res) => {
  try {
    await PlannerTask.deleteMany({ userId: req.userId });

    res.status(200).json({
      success: true,
      message: 'All planner tasks deleted successfully.',
    });

  } catch (err) {
    console.error('Delete all planner tasks error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting all planner tasks.',
    });
  }
});

module.exports = router;