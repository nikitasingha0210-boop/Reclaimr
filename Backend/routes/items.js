/* ═══════════════════════════════════════════════
   ROUTE : /api/items
   Handles reporting, browsing, updating and
   claiming lost / found items
═══════════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const Item    = require('../models/Item');
const protect = require('../middleware/authMiddleware');

/* ─────────────────────────────────────────────
   GET /api/items
   Get all items — supports optional filters:
   ?status=lost|found|claimed
   ?category=Electronics
   ?search=keyword (matches title, desc, location)
───────────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const { status, category, search } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (category) query.category = category;

    if (search) {
      const regex = new RegExp(search, 'i'); // case-insensitive search
      query.$or = [{ title: regex }, { desc: regex }, { location: regex }];
    }

    const items = await Item.find(query).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: items.length, items });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────────────────────────
   GET /api/items/:id
   Get a single item by its id
───────────────────────────────────────────── */
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────────────────────────
   POST /api/items
   Report a new lost or found item (login required)
───────────────────────────────────────────── */
router.post('/', protect, async (req, res, next) => {
  try {
    const { title, status, category, location, date, desc, contact, image } = req.body;

    if (!title || !category || !location || !date || !contact) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }

    const item = await Item.create({
      title,
      status: status || 'lost',
      category,
      location,
      date,
      desc,
      contact,
      image,
      reportedBy: req.user._id,
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────────────────────────
   PUT /api/items/:id
   Update an item (only the person who reported it)
───────────────────────────────────────────── */
router.put('/:id', protect, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit items you reported.' });
    }

    const fields = ['title', 'status', 'category', 'location', 'date', 'desc', 'contact', 'image'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    });

    await item.save();

    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/items/:id/claim
   Mark an item as claimed (login required)
───────────────────────────────────────────── */
router.patch('/:id/claim', protect, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    item.status = 'claimed';
    await item.save();

    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/items/:id
   Delete an item (only the person who reported it)
───────────────────────────────────────────── */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete items you reported.' });
    }

    await item.deleteOne();

    res.status(200).json({ success: true, message: 'Item deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;