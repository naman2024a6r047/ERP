const express = require('express');
const router = express.Router();
const { Setting } = require('../models');
const { protect, authorize } = require('../utils/auth');

// GET /api/settings - Public (or protected if you want only logged-in users to see)
// Since receipt generation needs it, it can be protected for all users.
router.get('/', protect, async (req, res) => {
  try {
    const settings = await Setting.findAll();
    // Convert array of {key, value} to an object {key: value}
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    // Provide defaults if not set
    const defaultSettings = {
      school_name: 'EduSmart Public School',
      school_address: '123 Education Lane, City, Country',
      school_phone: '+1 234 567 890',
      school_email: 'info@edusmart.com',
      receipt_footer: 'This is a computer-generated receipt. No signature required.',
      ...settingsObj
    };

    res.json(defaultSettings);
  } catch (err) {
    console.error('[GET /settings]', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT /api/settings - Update settings (Admin only)
router.put('/', protect, authorize('admin'), async (req, res) => {
  try {
    const updates = req.body; // e.g., { school_name: 'New Name', school_address: 'New Addr' }
    
    for (const [key, value] of Object.entries(updates)) {
      await Setting.upsert({
        key,
        value: String(value)
      });
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('[PUT /settings]', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
