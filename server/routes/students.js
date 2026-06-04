const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { Student, Session, User } = require('../models');
const { protect, hasPermission, isSuperAdmin, authorize } = require('../middleware/auth');
const { createAdmissionFee } = require('../services/feeService');
const { makeStudentId, makeStudentEmail, makeTemporaryPassword } = require('../utils/credentialGenerator');
const { validateStudentCreate, validateStudentUpdate, validateStudentApproval } = require('../middleware/validator');

// ── Allowed fields whitelists (C3/C4 fix) ─────────────────────────────────────
const STUDENT_CREATE_FIELDS = [
  'first_name', 'last_name', 'date_of_birth', 'gender',
  'class', 'section', 'roll_number', 'session_id',
  'parent_name', 'parent_phone', 'parent_email', 'parent_address',
  'address', 'blood_group', 'religion', 'category', 'aadhar_number',
  'previous_school', 'admission_date',
  'email', 'password',
];

const STUDENT_UPDATE_FIELDS = [
  'first_name', 'last_name', 'date_of_birth', 'gender',
  'class', 'section', 'roll_number', 'session_id',
  'parent_name', 'parent_phone', 'parent_email', 'parent_address',
  'address', 'blood_group', 'religion', 'category', 'aadhar_number',
  'student_status',
];

/** Pick only allowed keys from an object */
const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
};

// GET /api/students — with category filters
router.get('/', protect, hasPermission('VIEW_STUDENTS'), async (req, res) => {
  try {
    const {
      class: cls, section, search, session_id,
      student_status, source,
      page = 1, limit = 50,
    } = req.query;

    const where = { is_active: true, approval_status: 'approved' };
    if (cls)            where.class          = cls;
    if (section)        where.section        = section;
    if (session_id)     where.session_id     = session_id;
    if (student_status) where.student_status = student_status;
    if (source)         where.source         = source;

    if (search) {
      where[Op.or] = [
        { first_name:   { [Op.like]: `%${search}%` } },
        { last_name:    { [Op.like]: `%${search}%` } },
        { student_id:   { [Op.like]: `%${search}%` } },
        { parent_name:  { [Op.like]: `%${search}%` } },
        { parent_phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Student.findAndCountAll({
      where,
      include: [{ model: Session, as: 'session', attributes: ['id', 'name'] }],
      order:   [['class','ASC'],['section','ASC'],['roll_number','ASC']],
      limit:   parseInt(limit),
      offset:  (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({ total: count, page: parseInt(page), students: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/students/alumni — alumni/passed out students
router.get('/alumni', protect, hasPermission('VIEW_STUDENTS'), async (req, res) => {
  try {
    const students = await Student.findAll({
      where: { student_status: 'alumni', is_active: false },
      include: [{ model: Session, as: 'session', attributes: ['id', 'name'] }],
      order: [['updated_at', 'DESC']],
    });
    res.json(students);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/students/approvals - pending/rejected student records
router.get('/approvals', protect, authorize('admin'), async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const students = await Student.findAll({
      where: { approval_status: status },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'role'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(students);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/students/:id/approval - approve or reject pending student
router.put('/:id/approval', protect, authorize('admin'), validateStudentApproval, async (req, res) => {
  const txn = await require('../models').sequelize.transaction();
  try {
    const { status, rejection_reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      await txn.rollback();
      return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }

    const student = await Student.findByPk(req.params.id, { transaction: txn });
    if (!student) {
      await txn.rollback();
      return res.status(404).json({ message: 'Student not found.' });
    }

    await student.update({
      approval_status: status,
      is_active: status === 'approved',
      student_status: status === 'approved' ? 'active' : 'inactive',
      approved_by: req.user.id,
      approved_at: status === 'approved' ? new Date() : null,
      rejection_reason: status === 'rejected' ? rejection_reason || 'Rejected by admin.' : null,
    }, { transaction: txn });

    await User.update(
      { is_active: status === 'approved' },
      { where: { linked_student_id: student.id, role: 'student' }, transaction: txn }
    );

    if (status === 'approved') {
      const { getOrCreateFeeRecord, MONTHS } = require('../services/feeService');
      const now = new Date();
      await getOrCreateFeeRecord(student, MONTHS[now.getMonth()], now.getFullYear(), 'monthly', txn);
      await createAdmissionFee(student, txn);
    }

    await txn.commit();
    res.json({ message: `Student ${status}.`, student });
  } catch (err) {
    await txn.rollback();
    res.status(500).json({ message: err.message });
  }
});

// GET /api/students/:id
router.get('/:id', protect, hasPermission('VIEW_STUDENTS'), async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: [{ model: Session, as: 'session' }]
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json(student);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/students - admin/admin2 creates directly, fee collector creates pending approval
// (C4 fix) — only whitelisted fields are accepted from req.body
router.post('/', protect, authorize('admin', 'admin2', 'fee_collector'), validateStudentCreate, async (req, res) => {
  const txn = await require('../models').sequelize.transaction();
  try {
    const isApproved = ['admin', 'admin2'].includes(req.user.role);
    const safeData = pick(req.body, STUDENT_CREATE_FIELDS);

    // If custom email (User ID) is provided, verify it is not already taken
    if (safeData.email) {
      const existingUser = await User.findOne({ where: { email: safeData.email }, transaction: txn });
      if (existingUser) {
        await txn.rollback();
        return res.status(400).json({ message: 'Email address (User ID) is already registered.' });
      }
    }

    const student = await Student.create({
      ...safeData,
      student_id:     'PENDING',
      is_active:      isApproved,
      student_status: isApproved ? 'active' : 'inactive',
      source:         isApproved ? 'admin_created' : 'admission_approved',
      created_by:     req.user.id,
      approval_status: isApproved ? 'approved' : 'pending',
      approved_by:    isApproved ? req.user.id : null,
      approved_at:    isApproved ? new Date() : null,
    }, { transaction: txn });

    const studentId = makeStudentId(student.id);
    await student.update({ student_id: studentId }, { transaction: txn });

    // Use custom email/password if provided, fallback to auto-generators
    const userEmail = safeData.email || makeStudentEmail(studentId);
    const userPassword = safeData.password || makeTemporaryPassword();

    await User.create({
      name: `${student.first_name} ${student.last_name}`,
      email: userEmail,
      password: userPassword,
      role: 'student',
      linked_student_id: student.id,
      is_active: isApproved,
      phone: student.parent_phone,
    }, { transaction: txn });

    if (isApproved) {
      // Auto-generate current month fee record
      const { getOrCreateFeeRecord, MONTHS } = require('../services/feeService');
      const now   = new Date();
      const month = MONTHS[now.getMonth()];
      const year  = now.getFullYear();
      await getOrCreateFeeRecord(student, month, year, 'monthly', txn);
      await createAdmissionFee(student, txn);
    }

    await txn.commit();

    res.status(201).json({
      student,
      credentials: {
        email: userEmail,
        password: safeData.password ? '[MANUALLY_SET]' : userPassword,
        active: isApproved,
      },
      message: isApproved
        ? 'Student created and login credentials generated.'
        : 'Student created pending admin approval. Login will activate after approval.',
    });
  } catch (err) {
    console.error('[students][POST /]', err);
    await txn.rollback();
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/students/:id — (C3 fix) only whitelisted fields
router.put('/:id', protect, hasPermission('MANAGE_STUDENTS'), validateStudentUpdate, async (req, res) => {
  try {
    const safeData = pick(req.body, STUDENT_UPDATE_FIELDS);
    const [updated] = await Student.update(safeData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Student not found.' });
    const student = await Student.findByPk(req.params.id);
    res.json(student);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/students/:id
router.delete('/:id', protect, isSuperAdmin, async (req, res) => {
  try {
    await Student.update({ is_active: false, student_status: 'inactive' }, { where: { id: req.params.id } });
    res.json({ message: 'Student deactivated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
