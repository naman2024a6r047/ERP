const express = require('express');
const router  = express.Router();
const { Session, Student, PromotionHistory, sequelize } = require('../models');
const { protect, isSuperAdmin, isAdmin } = require('../middleware/auth');
const { createPromotionFee } = require('../services/feeService');

const PROMOTION_MAP = {
  'day care':  'Playgroup',
  'Playgroup': 'Nursery',
  'Nursery':   'LKG',
  'LKG':       'UKG',
  'UKG':       '1st',
  '1st':       '2nd',
  '2nd':       '3rd',
  '3rd':       '4th',
  '4th':       '5th',
  '5th':       '6th',
  '6th':       '7th',
  '7th':       '8th',
  '8th':       '9th',
  '9th':       '10th',
  '10th':      'alumni',
};

// (C6 fix) — whitelisted fields for session creation
const SESSION_CREATE_FIELDS = ['name', 'start_date', 'end_date'];

const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
};

router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const sessions = await Session.findAll({ order: [['created_at', 'DESC']] });
    res.json(sessions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/active', protect, async (req, res) => {
  try {
    const session = await Session.findOne({ where: { is_active: true } });
    res.json(session);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// (C6 fix) — only whitelisted fields accepted
router.post('/', protect, isSuperAdmin, async (req, res) => {
  try {
    const safeData = pick(req.body, SESSION_CREATE_FIELDS);

    if (!safeData.name || !safeData.start_date || !safeData.end_date) {
      return res.status(400).json({ message: 'name, start_date, and end_date are required.' });
    }

    const session = await Session.create(safeData);
    res.status(201).json(session);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/activate', protect, isSuperAdmin, async (req, res) => {
  try {
    await Session.update({ is_active: false }, { where: {} });
    await Session.update({ is_active: true  }, { where: { id: req.params.id } });
    res.json({ message: 'Session activated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/**
 * POST /api/session/promote
 * Bulk promotion with:
 * - "Class 12" → alumni (not "Graduated")
 * - Auto-create promotion fee for each student
 */
router.post('/promote', protect, isSuperAdmin, async (req, res) => {
  const txn = await sequelize.transaction();
  try {
    const { from_session_id, to_session_id, class_promotion_map } = req.body;

    if (!from_session_id || !to_session_id) {
      await txn.rollback();
      return res.status(400).json({ message: 'from_session_id and to_session_id are required.' });
    }

    const promotionMapToUse = class_promotion_map || PROMOTION_MAP;

    const summary = [];

    for (const [fromClass, toClass] of Object.entries(promotionMapToUse)) {
      const students = await Student.findAll({
        where: {
          class:       fromClass,
          session_id:  from_session_id,
          is_active:   true,
        },
        transaction: txn,
      });

      if (toClass === 'alumni' || toClass === 'passed_out') {
        // ── Alumni / Passed Out ───────────────────────────────────────────────
        await Student.update(
          { is_active: false, student_status: 'alumni' },
          { where: { class: fromClass, session_id: from_session_id }, transaction: txn }
        );
      } else {
        // ── Regular promotion ─────────────────────────────────────────────────
        await Student.update(
          { class: toClass, session_id: to_session_id },
          { where: { class: fromClass, session_id: from_session_id, is_active: true }, transaction: txn }
        );

        // Create promotion fee for each student
        for (const student of students) {
          await createPromotionFee(student, toClass, to_session_id, txn);
        }
      }

      // Log promotion history
      if (students.length > 0) {
        await PromotionHistory.bulkCreate(
          students.map(s => ({
            student_id:   s.id,
            from_class:   fromClass,
            to_class:     toClass,
            from_session: from_session_id,
            to_session:   to_session_id,
            promoted_by:  req.user.id,
          })),
          { transaction: txn }
        );
      }

      summary.push({ fromClass, toClass, count: students.length });
    }

    // Archive old session
    await Session.update(
      { is_archived: true, is_active: false, promotion_completed: true },
      { where: { id: from_session_id }, transaction: txn }
    );

    await txn.commit();
    res.json({ message: 'Promotion completed!', summary });
  } catch (err) {
    await txn.rollback();
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;