const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { Attendance, Student } = require('../models');
const { protect, hasPermission, authorize } = require('../middleware/auth');
const { cacheMiddleware } = require('../utils/cache');
const { getTeacherAllowedClasses } = require('../utils/teacherAllowedClasses');

const formatDateRange = (year, month) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

// POST /api/attendance/bulk
// ✅ admin, admin2, teacher
router.post('/bulk', protect, hasPermission('MANAGE_STUDENT_ATTENDANCE'), async (req, res) => {
  try {
    const { class: cls, section, date, records, session_id } = req.body;

    if (!date || !records?.length) {
      return res.status(400).json({ message: 'Date and records are required.' });
    }

    if (req.user.role === 'teacher') {
      const allowedClasses = await getTeacherAllowedClasses(req.user.linked_teacher_id);
      if (!allowedClasses.includes(cls)) {
        return res.status(403).json({ message: 'Access denied. You can only mark attendance for your assigned classes.' });
      }
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
// ✅ parent, student, admin, admin2
router.get('/student/:studentId', protect, cacheMiddleware(300), async (req, res) => {
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

    if (req.user.role === 'teacher') {
      const student = await Student.findByPk(req.params.studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
      const allowedClasses = await getTeacherAllowedClasses(req.user.linked_teacher_id);
      if (!allowedClasses.includes(student.class)) {
        return res.status(403).json({ message: 'Access denied. Student is not in your assigned classes.' });
      }
    }

    const { month, year } = req.query;
    const where = { student_id: req.params.studentId };

    if (month && year) {
      const { start, end } = formatDateRange(year, month);
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

    if (req.user.role === 'teacher') {
      const allowedClasses = await getTeacherAllowedClasses(req.user.linked_teacher_id);
      if (!allowedClasses.includes(cls)) {
        return res.status(403).json({ message: 'Access denied. You can only view attendance for your assigned classes.' });
      }
    }

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

    if (req.user.role === 'teacher') {
      const allowedClasses = await getTeacherAllowedClasses(req.user.linked_teacher_id);
      if (!allowedClasses.includes(cls)) {
        return res.status(403).json({ message: 'Access denied. You can only view attendance reports for your assigned classes.' });
      }
    }

    const { start, end } = formatDateRange(year, month);

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
