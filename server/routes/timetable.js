const express = require('express');
const router = express.Router();
const { Timetable, Teacher } = require('../models');
const { protect, authorize, hasPermission } = require('../middleware/auth');

// (C3 fix) — whitelisted fields for timetable
const TIMETABLE_FIELDS = ['class', 'section', 'day', 'period_number', 'subject', 'teacher_id', 'start_time', 'end_time'];

const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
};

// GET /api/timetable?class=Class 8&section=A
// (H8 fix) — now uses VIEW_TIMETABLE permission instead of just protect
router.get('/', protect, hasPermission('VIEW_TIMETABLE'), async (req, res) => {
  try {
    const { class: cls, section, teacher_id } = req.query;
    const where = {};
    if (cls)        where.class      = cls;
    if (section)    where.section    = section;
    if (teacher_id) where.teacher_id = teacher_id;

    const timetable = await Timetable.findAll({
      where,
      include: [{ model: Teacher, as: 'teacher', attributes: ['id', 'name', 'subject'] }],
      order: [
        ['day', 'ASC'],
        ['period_number', 'ASC']
      ]
    });

    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/timetable — (C3 fix) whitelisted fields
router.post('/', protect, hasPermission('MANAGE_TIMETABLE'), async (req, res) => {
  try {
    const safeData = pick(req.body, TIMETABLE_FIELDS);
    const slot = await Timetable.create(safeData);
    res.status(201).json(slot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/timetable/:id — (C3 fix) whitelisted fields
router.put('/:id', protect, hasPermission('MANAGE_TIMETABLE'), async (req, res) => {
  try {
    const safeData = pick(req.body, TIMETABLE_FIELDS);
    await Timetable.update(safeData, { where: { id: req.params.id } });
    const slot = await Timetable.findByPk(req.params.id, {
      include: [{ model: Teacher, as: 'teacher' }]
    });
    res.json(slot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/timetable/:id
router.delete('/:id', protect, hasPermission('MANAGE_TIMETABLE'), async (req, res) => {
  try {
    await Timetable.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Timetable slot deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;