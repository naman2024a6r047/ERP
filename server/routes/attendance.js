const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { Attendance, Student } = require('../models');
const { protect, hasPermission, authorize } = require('../middleware/auth');

// POST /api/attendance/bulk
// ✅ admin, admin2, teacher
router.post('/bulk', protect, hasPermission('MANAGE_STUDENT_ATTENDANCE'), async (req, res) => {
  try {
    const { class: cls, section, date, records, session_id } = req.body;

    if (!date || !records?.length) {
      return res.status(400).json({ message: 'Date and records are required.' });
    }

    const ops = records.map(r =>
      Attendance.upsert({
        student_id: r.student_id,
        class: cls,
        section,
        date,
        status:     r.status,
        marked_by:  req.user.id,
        session_id: session_id || null,
      })
    );

    await Promise.all(ops);

    res.json({
      message:  `Attendance marked for ${records.length} students.`,
      marked_by: req.user.name,
      date,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/student/:studentId
// (H1 fix) — now uses hasPermission('VIEW_STUDENTS') for staff, plus IDOR check for parent/student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    // Parent/student can only see their own child/self
    if (req.user.role === 'parent' || req.user.role === 'student') {
      const linkedId = req.user.linked_student_id || req.user.linkedStudent?.id;
      if (!linkedId || linkedId !== parseInt(req.params.studentId)) {
        return res.status(403).json({ message: 'Access denied to this student.' });
      }
    } else {
      // (H1 fix) — for non-parent/student roles, verify they have VIEW_STUDENTS permission
      const allowedRoles = ['admin', 'admin2', 'teacher'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    const { month, year } = req.query;
    const where = { student_id: req.params.studentId };

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0);
      where.date  = { [Op.between]: [start, end] };
    }

    const records = await Attendance.findAll({ where, order: [['date', 'ASC']] });

    const present = records.filter(r => r.status === 'present').length;
    const late    = records.filter(r => r.status === 'late').length;
    const total   = records.filter(r => r.status !== 'holiday').length;

    res.json({
      records,
      stats: {
        present, late,
        absent:     total - present - late,
        total,
        percentage: total ? Math.round(((present + late) / total) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/class
// ✅ admin, admin2, teacher
router.get('/class', protect, hasPermission('MANAGE_STUDENT_ATTENDANCE'), async (req, res) => {
  try {
    const { class: cls, section, date } = req.query;

    const students = await Student.findAll({
      where:  { class: cls, section, is_active: true },
      order:  [['roll_number', 'ASC']],
    });

    const attendance = await Attendance.findAll({
      where: { class: cls, section, date },
    });

    const attMap = {};
    attendance.forEach(a => { attMap[a.student_id] = a.status; });

    const result = students.map(s => ({
      student: s,
      status:  attMap[s.id] || 'not_marked',
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/report/monthly
// ✅ admin, admin2, teacher
router.get('/report/monthly', protect, hasPermission('MANAGE_STUDENT_ATTENDANCE'), async (req, res) => {
  try {
    const { class: cls, section, month, year } = req.query;

    const start    = new Date(year, month - 1, 1);
    const end      = new Date(year, month, 0);

    const students = await Student.findAll({
      where: { class: cls, ...(section ? { section } : {}), is_active: true },
    });

    const records = await Attendance.findAll({
      where: { class: cls, date: { [Op.between]: [start, end] } },
    });

    const report = students.map(s => {
      const sr      = records.filter(r => r.student_id === s.id);
      const present = sr.filter(r => r.status === 'present').length;
      const total   = sr.filter(r => r.status !== 'holiday').length;

      return {
        student:    s,
        present,
        absent:     total - present,
        total,
        percentage: total ? Math.round((present / total) * 100) : 0,
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
