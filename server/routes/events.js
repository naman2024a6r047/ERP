const express = require('express');
const router = express.Router();
const { Event, User } = require('../models');
const { protect, isAdmin } = require('../middleware/auth');

// GET /api/events - View all active events
router.get('/', protect, async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { is_active: true },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['event_date', 'ASC']]
    });
    res.json(events);
  } catch (err) {
    console.error('[events][GET /]', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events - Create a new event (Admin/Admin2 only)
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    const { title, description, event_date, location } = req.body;
    if (!title || !event_date) {
      return res.status(400).json({ message: 'Title and event date are required.' });
    }
    const event = await Event.create({
      title,
      description,
      event_date,
      location,
      created_by: req.user.id
    });
    res.status(201).json(event);
  } catch (err) {
    console.error('[events][POST /]', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/events/:id - Update an event (Admin/Admin2 only)
router.put('/:id', protect, isAdmin, async (req, res) => {
  try {
    const { title, description, event_date, location, is_active } = req.body;
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    await event.update({
      title: title !== undefined ? title : event.title,
      description: description !== undefined ? description : event.description,
      event_date: event_date !== undefined ? event_date : event.event_date,
      location: location !== undefined ? location : event.location,
      is_active: is_active !== undefined ? is_active : event.is_active
    });
    res.json(event);
  } catch (err) {
    console.error('[events][PUT /:id]', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/events/:id - Delete an event (Admin/Admin2 only)
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    await event.destroy();
    res.json({ message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('[events][DELETE /:id]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
