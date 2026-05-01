/* ═══════════════════════════════════════════════
   ROUTE : /api/tasks
   Handles all task CRUD operations
   All routes are protected (JWT required)
═══════════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const Task    = require('../models/Task');
const protect = require('../middleware/authMiddleware');

// Apply protect middleware to ALL routes in this file
router.use(protect);

/* ─────────────────────────────────────────────
   GET /api/tasks
   Get all tasks for the logged-in user
   Optional query: ?subject=DSA  ?done=true  ?due=2025-06-01
───────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    // Build filter object from query params
    const filter = { userId: req.userId };

    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.done !== undefined) filter.done = req.query.done === 'true';
    if (req.query.due)  filter.due = req.query.due;

    const tasks = await Task
      .find(filter)
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });

  } catch (err) {
    console.error('Get tasks error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching tasks.',
    });
  }
});

/* ─────────────────────────────────────────────
   GET /api/tasks/today
   Get tasks due today for the logged-in user
───────────────────────────────────────────── */
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const tasks = await Task.find({
      userId: req.userId,
      due:    today,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });

  } catch (err) {
    console.error('Get today tasks error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching today tasks.',
    });
  }
});

/* ─────────────────────────────────────────────
   POST /api/tasks
   Create a new task
───────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { name, subject, due } = req.body;

    // Validate required fields
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

    const task = await Task.create({
      userId:  req.userId,
      name:    name.trim(),
      subject: subject.trim(),
      due:     due || '',
      done:    false,
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task,
    });

  } catch (err) {
    console.error('Create task error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error creating task.',
    });
  }
});

/* ─────────────────────────────────────────────
   PUT /api/tasks/:id
   Update a task (toggle done, edit name, etc.)
───────────────────────────────────────────── */
router.put('/:id', async (req, res) => {
  try {
    // Only update fields that are sent
    const updates = {};
    if (req.body.name    !== undefined) updates.name    = req.body.name.trim();
    if (req.body.subject !== undefined) updates.subject = req.body.subject.trim();
    if (req.body.due     !== undefined) updates.due     = req.body.due;
    if (req.body.done    !== undefined) updates.done    = req.body.done;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      task,
    });

  } catch (err) {
    console.error('Update task error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating task.',
    });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/tasks/:id
   Delete a single task
───────────────────────────────────────────── */
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id:    req.params.id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });

  } catch (err) {
    console.error('Delete task error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting task.',
    });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/tasks
   Delete ALL tasks for logged-in user
───────────────────────────────────────────── */
router.delete('/', async (req, res) => {
  try {
    await Task.deleteMany({ userId: req.userId });

    res.status(200).json({
      success: true,
      message: 'All tasks deleted successfully.',
    });

  } catch (err) {
    console.error('Delete all tasks error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting all tasks.',
    });
  }
});

module.exports = router;