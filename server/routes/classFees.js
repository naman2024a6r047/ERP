const express = require('express');
const router = express.Router();
const { ClassFeeStructure, User } = require('../models');
const { protect, hasPermission } = require('../middleware/auth');

const ensureAdminModifier = (req, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Only admin can modify class fees.' });
    return false;
  }
  return true;
};

// GET /api/class-fees
router.get('/', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  try {
    const structures = await ClassFeeStructure.findAll({
      where: { is_active: true },
      include: [{ model: User, as: 'updatedByUser', attributes: ['id', 'name'] }],
      order: [['class', 'ASC']],
    });

    res.json(
      structures.map((structure) => ({
        id: structure.id,
        class: structure.class,
        monthly_fee: structure.monthly_fee,
        admission_fee: structure.admission_fee,
        updated_at: structure.updated_at,
        updated_by_user: structure.updatedByUser || null,
      }))
    );
  } catch (err) {
    console.error('[class-fees][GET /]', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/class-fees
router.post('/', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  if (!ensureAdminModifier(req, res)) return;

  try {
    const { class: cls, monthly_fee, admission_fee } = req.body;

    if (!cls) {
      return res.status(400).json({ message: 'Class is required.' });
    }

    const payload = {
      class: cls,
      monthly_fee: parseFloat(monthly_fee || 0),
      admission_fee: parseFloat(admission_fee || 0),
      updated_by: req.user.id,
      is_active: true,
    };

    const existing = await ClassFeeStructure.findOne({ where: { class: cls } });
    let structure;

    if (existing) {
      await existing.update(payload);
      structure = existing;
    } else {
      structure = await ClassFeeStructure.create(payload);
    }

    res.status(existing ? 200 : 201).json({
      message: `Class fee for ${cls} ${existing ? 'updated' : 'created'}.`,
      structure,
    });
  } catch (err) {
    console.error('[class-fees][POST /]', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/class-fees/:class
router.put('/:class', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  if (!ensureAdminModifier(req, res)) return;

  try {
    const structure = await ClassFeeStructure.findOne({
      where: { class: req.params.class, is_active: true },
    });

    if (!structure) {
      return res.status(404).json({ message: 'Class fee structure not found.' });
    }

    await structure.update({
      monthly_fee: req.body.monthly_fee !== undefined ? parseFloat(req.body.monthly_fee || 0) : structure.monthly_fee,
      admission_fee: req.body.admission_fee !== undefined ? parseFloat(req.body.admission_fee || 0) : structure.admission_fee,
      updated_by: req.user.id,
    });

    res.json({
      message: `Class fee for ${req.params.class} updated.`,
      structure,
    });
  } catch (err) {
    console.error('[class-fees][PUT /:class]', err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
