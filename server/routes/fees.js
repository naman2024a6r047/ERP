const express  = require('express');
const router   = express.Router();
const { Op }   = require('sequelize');
const crypto   = require('crypto');
const { Fee, Student, User, ClassFeeStructure, sequelize } = require('../models');
const { protect, hasPermission, isSuperAdmin }             = require('../middleware/auth');
const { validateFeeStructureCreate, validateFeeStructureUpdate, validateFeeCollect } = require('../middleware/validator');
const {
  getStudentsWithFeeStatus,
  getOrCreateFeeRecord,
  generateMonthlyFees,
  buildReceiptData,
  getFeeStructureForClass,
  MONTHS,
} = require('../services/feeService');

// (C3 fix) — whitelisted fields for fee structure
const FEE_STRUCTURE_FIELDS = ['monthly_fee', 'admission_fee', 'annual_fee', 'promotion_fee', 'exam_fee'];

const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
};

// (M6 fix) — generate unique receipt number using built-in crypto (uuid v14 is ESM-only)
const generateReceiptNumber = () => `REC-${crypto.randomUUID().split('-')[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

// ─────────────────────────────────────────────────────────────────────────────
// FEE STRUCTURE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/fees/structure — get all class fee structures
router.get('/structure', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  try {
    const structures = await ClassFeeStructure.findAll({
      where:   { is_active: true },
      order:   [['class', 'ASC']],
      include: [{ model: User, as: 'updatedByUser', attributes: ['id', 'name'] }],
    });
    res.json(structures);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/fees/structure/:class — get one class structure
router.get('/structure/:class', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  try {
    const structure = await getFeeStructureForClass(req.params.class);
    res.json(structure);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/fees/structure — create or update class fee structure
router.post('/structure', protect, isSuperAdmin, validateFeeStructureCreate, async (req, res) => {
  try {
    const { class: cls } = req.body;

    if (!cls) return res.status(400).json({ message: 'Class is required.' });

    const safeFees = pick(req.body, FEE_STRUCTURE_FIELDS);

    const [structure, created] = await ClassFeeStructure.upsert({
      class:         cls,
      monthly_fee:   parseFloat(safeFees.monthly_fee   || 0),
      admission_fee: parseFloat(safeFees.admission_fee || 0),
      annual_fee:    parseFloat(safeFees.annual_fee    || 0),
      promotion_fee: parseFloat(safeFees.promotion_fee || 0),
      exam_fee:      parseFloat(safeFees.exam_fee      || 0),
      updated_by:    req.user.id,
      is_active:     true,
    });

    res.status(created ? 201 : 200).json({
      message: `Fee structure for ${cls} ${created ? 'created' : 'updated'}.`,
      structure,
    });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT /api/fees/structure/:id — (C3 fix) whitelisted fields
router.put('/structure/:id', protect, isSuperAdmin, validateFeeStructureUpdate, async (req, res) => {
  try {
    const safeFees = pick(req.body, FEE_STRUCTURE_FIELDS);
    // Parse each fee field
    const updateData = { updated_by: req.user.id };
    for (const key of FEE_STRUCTURE_FIELDS) {
      if (safeFees[key] !== undefined) updateData[key] = parseFloat(safeFees[key]);
    }

    await ClassFeeStructure.update(updateData, { where: { id: req.params.id } });
    const updated = await ClassFeeStructure.findByPk(req.params.id);
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEES OVERVIEW — ALL STUDENTS WITH STATUS (fixes missing students bug)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/fees/overview
 * Returns ALL active students with their fee status for a given month/year.
 * Students without fee records appear as "not_generated".
 * This is the main endpoint for the fees management page.
 */
router.get('/overview', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  try {
    const {
      month  = MONTHS[new Date().getMonth()],
      year   = new Date().getFullYear(),
      class: cls,
      section,
      fee_status,
    } = req.query;

    let data = await getStudentsWithFeeStatus(month, String(year), { class: cls, section });

    // Filter by fee_status if provided
    if (fee_status && fee_status !== 'all') {
      data = data.filter(s => s.fee_status === fee_status);
    }

    const summary = {
      total:         data.length,
      paid:          data.filter(s => s.fee_status === 'paid').length,
      unpaid:        data.filter(s => s.fee_status === 'unpaid').length,
      partial:       data.filter(s => s.fee_status === 'partial').length,
      not_generated: data.filter(s => s.fee_status === 'not_generated').length,
      total_due:     data.reduce((a, s) => a + (s.total_due || 0), 0),
      total_paid:    data.reduce((a, s) => a + (s.total_paid || 0), 0),
    };

    res.json({ month, year, summary, students: data });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEE RECORD MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/fees — existing fee records with filters
router.get('/', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  try {
    const { status, month, year, class: cls } = req.query;
    const where = {};
    if (status) where.status = status;
    if (month)  where.month  = month;
    if (year)   where.year   = parseInt(year);

    const include = [{
      model:      Student,
      as:         'student',
      attributes: ['id', 'student_id', 'first_name', 'last_name', 'class', 'section'],
      ...(cls ? { where: { class: cls } } : {}),
    }];

    const fees = await Fee.findAll({
      where,
      include,
      order: [['created_at', 'DESC']],
    });

    res.json(fees);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/fees/student/:studentId — (H2 fix) improved IDOR check
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    if (req.user.role === 'parent' || req.user.role === 'student') {
      // (H2 fix) — use linkedStudent.id which is reliably populated by protect middleware
      const linkedId = req.user.linked_student_id || req.user.linkedStudent?.id;
      if (!linkedId || linkedId !== parseInt(req.params.studentId)) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }
    const fees = await Fee.findAll({
      where:  { student_id: req.params.studentId },
      order:  [['year', 'DESC'], ['month', 'ASC']],
      include:[{ model: User, as: 'collectedByUser', attributes: ['id', 'name'] }]
    });
    res.json(fees);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEE COLLECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/fees/collect
 * Collect payment for a student for one or more months.
 * If fee record doesn't exist → create it first, then record payment.
 * (H3 fix) — overpayment protection added
 * (M6 fix) — UUID-based receipt numbers
 */
router.post('/collect', protect, hasPermission('COLLECT_FEES'), validateFeeCollect, async (req, res) => {
  const txn = await sequelize.transaction();
  try {
    const {
      student_id,
      month,
      year,
      fee_type = 'monthly',
      amount,
      payment_mode,
      remarks,
      // Optional: provide fee_id directly if record already exists
      fee_id,
    } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      await txn.rollback();
      return res.status(400).json({ message: 'Amount must be greater than 0.' });
    }

    let fee;

    if (fee_id) {
      // Existing record
      fee = await Fee.findByPk(fee_id, {
        include: [{ model: Student, as: 'student' }],
        transaction: txn,
      });
      if (!fee) { await txn.rollback(); return res.status(404).json({ message: 'Fee record not found.' }); }
    } else {
      // Find or create
      if (!student_id || !month || !year) {
        await txn.rollback();
        return res.status(400).json({ message: 'student_id, month, and year are required.' });
      }
      const student = await Student.findByPk(student_id, { transaction: txn });
      if (!student) { await txn.rollback(); return res.status(404).json({ message: 'Student not found.' }); }

      const { record } = await getOrCreateFeeRecord(student, month, parseInt(year), fee_type, txn);
      fee = await Fee.findByPk(record.id, {
        include: [{ model: Student, as: 'student' }],
        transaction: txn,
      });
    }

    // (H3 fix) — overpayment protection
    const newPaid = parseFloat(fee.paid_amount) + parseFloat(amount);
    const totalAmount = parseFloat(fee.total_amount);

    if (newPaid > totalAmount) {
      await txn.rollback();
      const remaining = totalAmount - parseFloat(fee.paid_amount);
      return res.status(400).json({
        message: `Overpayment not allowed. Maximum payable amount is ₹${remaining.toFixed(2)}.`,
        max_payable: remaining,
      });
    }

    const status = newPaid >= totalAmount ? 'paid'
                 : newPaid > 0           ? 'partial'
                 : 'unpaid';

    // (M6 fix) — unique receipt number
    const receiptNumber = generateReceiptNumber();

    await fee.update({
      paid_amount:    newPaid,
      payment_mode,
      remarks,
      collected_by:   req.user.id,
      paid_date:      new Date().toISOString().split('T')[0],
      status,
      receipt_number: receiptNumber,
    }, { transaction: txn });

    await txn.commit();

    // Reload with associations for receipt
    await fee.reload({ include: [
      { model: Student, as: 'student' },
      { model: User,    as: 'collectedByUser', attributes: ['id', 'name'] }
    ]});

    const receipt = buildReceiptData(fee, fee.student, fee.collectedByUser);

    res.json({
      message: 'Payment collected successfully.',
      fee,
      receipt,
    });
  } catch (err) {
    await txn.rollback();
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/fees/collect-multiple-months
 * Collect fees for multiple months at once (e.g. paying Jan + Feb together).
 * (H3 fix) — overpayment protection added
 * (M6 fix) — UUID-based receipt numbers
 */
router.post('/collect-multiple-months', protect, hasPermission('COLLECT_FEES'), async (req, res) => {
  const txn = await sequelize.transaction();
  try {
    const { student_id, months, year, payment_mode, remarks } = req.body;
    // months = [{ month: 'January', amount: 2500 }, ...]

    if (!student_id || !months?.length) {
      await txn.rollback();
      return res.status(400).json({ message: 'student_id and months array required.' });
    }

    const student = await Student.findByPk(student_id, { transaction: txn });
    if (!student) { await txn.rollback(); return res.status(404).json({ message: 'Student not found.' }); }

    const results = [];
    let totalPaidInThisTransaction = 0;
    const baseReceiptNumber = generateReceiptNumber();
    const updatedFees = [];

    for (let i = 0; i < months.length; i++) {
      const entry = months[i];
      const { record } = await getOrCreateFeeRecord(
        student, entry.month, parseInt(year), 'monthly', txn
      );

      const newPaid = parseFloat(record.paid_amount) + parseFloat(entry.amount);
      const totalAmount = parseFloat(record.total_amount);

      // (H3 fix) — overpayment check per month
      if (newPaid > totalAmount) {
        await txn.rollback();
        return res.status(400).json({
          message: `Overpayment not allowed for ${entry.month}. Max payable: ₹${(totalAmount - parseFloat(record.paid_amount)).toFixed(2)}.`,
        });
      }

      const status = newPaid >= totalAmount ? 'paid'
                   : newPaid > 0 ? 'partial' : 'unpaid';

      const uniqueReceiptNumber = `${baseReceiptNumber}-${i + 1}`;

      await record.update({
        paid_amount:    newPaid,
        payment_mode,
        remarks,
        collected_by:   req.user.id,
        paid_date:      new Date().toISOString().split('T')[0],
        status,
        receipt_number: uniqueReceiptNumber, // Ensure uniqueness in DB
      }, { transaction: txn });

      totalPaidInThisTransaction += parseFloat(entry.amount);
      results.push({ month: entry.month, status, paid: newPaid });
      updatedFees.push(record);
    }

    await txn.commit();

    const collectedByUser = await User.findByPk(req.user.id, { attributes: ['id', 'name'] });

    // Build consolidated receipt data
    const consolidatedFeeMock = {
      ...updatedFees[0].toJSON(),
      fee_type: 'monthly_multi',
      paid_amount: totalPaidInThisTransaction,
      total_amount: updatedFees.reduce((sum, f) => sum + parseFloat(f.total_amount), 0),
      month: months.map(m => m.month.slice(0, 3)).join(', '),
      receipt_number: baseReceiptNumber,
      fee_breakdown: Object.fromEntries(months.map(m => [`${m.month} Fee`, parseFloat(m.amount)])),
    };

    const receipt = buildReceiptData(consolidatedFeeMock, student, collectedByUser);

    res.json({
      message:        `Fees collected for ${months.length} month(s).`,
      student:        { id: student.id, name: `${student.first_name} ${student.last_name}` },
      months_updated: results,
      receipt,
      fee: consolidatedFeeMock,
    });
  } catch (err) {
    await txn.rollback();
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE FEES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/fees/generate
 * Generate monthly fee records for all active students.
 * Safe to run multiple times — skips already-generated records.
 */
router.post('/generate', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  try {
    const {
      month      = MONTHS[new Date().getMonth()],
      year       = new Date().getFullYear(),
      session_id = null,
    } = req.body;

    const result = await generateMonthlyFees(month, parseInt(year), session_id, req.user.id);

    res.json({
      message:  `Fee generation complete for ${month} ${year}.`,
      ...result,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/**
 * POST /api/fees/generate-for-student
 * Generate fee record for a single student (e.g. newly admitted).
 */
router.post('/generate-for-student', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  try {
    const { student_id, month, year, fee_type = 'monthly' } = req.body;

    const student = await Student.findByPk(student_id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const { record, created } = await getOrCreateFeeRecord(
      student,
      month || MONTHS[new Date().getMonth()],
      year  || new Date().getFullYear(),
      fee_type
    );

    res.json({
      message: created ? 'Fee record created.' : 'Fee record already exists.',
      fee: record,
      created,
    });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

router.get('/summary/monthly', protect, hasPermission('MANAGE_FEES'), async (req, res) => {
  try {
    const { month = MONTHS[new Date().getMonth()], year = new Date().getFullYear() } = req.query;

    const fees = await Fee.findAll({ where: { month, year: parseInt(year) } });

    const total     = fees.reduce((a, f) => a + parseFloat(f.total_amount || 0), 0);
    const collected = fees.reduce((a, f) => a + parseFloat(f.paid_amount  || 0), 0);

    res.json({
      month, year,
      total, collected,
      pending:       total - collected,
      paid_count:    fees.filter(f => f.status === 'paid').length,
      unpaid_count:  fees.filter(f => f.status === 'unpaid').length,
      partial_count: fees.filter(f => f.status === 'partial').length,
      rate:          total > 0 ? Math.round((collected / total) * 100) : 0,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
