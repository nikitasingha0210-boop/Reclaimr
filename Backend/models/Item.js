/* ═══════════════════════════════════════════════
   ITEM MODEL
   Represents a single lost / found item report
═══════════════════════════════════════════════ */

const mongoose = require('mongoose');

// Maps each category to an icon, same list used on the frontend
const CATEGORIES = ['Electronics', 'Documents', 'Clothing', 'Keys', 'Bags', 'Jewelry', 'Other'];
const CATEGORY_ICONS = {
  Electronics: 'fa-laptop',
  Documents: 'fa-file',
  Clothing: 'fa-shirt',
  Keys: 'fa-key',
  Bags: 'fa-bag-shopping',
  Jewelry: 'fa-gem',
  Other: 'fa-box',
};

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['lost', 'found', 'claimed'],
      default: 'lost',
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: [true, 'Category is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    desc: {
      type: String,
      trim: true,
      default: 'No description provided.',
    },
    contact: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
    },
    icon: {
      type: String,
      default: 'fa-box',
    },
    image: {
      type: String, // optional image URL / base64 string sent by the frontend
      default: null,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Automatically pick an icon based on category if none was sent
itemSchema.pre('save', function (next) {
  if (!this.icon || this.icon === 'fa-box') {
    this.icon = CATEGORY_ICONS[this.category] || 'fa-box';
  }
  next();
});

module.exports = mongoose.model('Item', itemSchema);