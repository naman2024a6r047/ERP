const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { StaffLeave, Teacher } = require('../models');
const { protect, hasPermission } = require('../middleware/auth');

// GET /api/staff-leaves/pending (Admin)
// Fetch all pending leave applications
router.get('/pending', protect, hasPermission('MANAGE_TEACHER_ATTENDANCE'), async (req, res) => {
  try {
    const leaves = await StaffLeave.findAll({
      where: { status: 'pending' },
      include: [{ model: Teacher, as: 'teacher', attributes: ['id', 'name', 'teacher_id'] }],
      order: [['created_at', 'DESC']]
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/staff-leaves/teacher/:id
// Fetch all leaves for a specific teacher, plus a summary
router.get('/teacher/:id', protect, hasPermission('MANAGE_TEACHER_ATTENDANCE'), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const leaves = await StaffLeave.findAll({
      where: { teacher_id: teacherId },
      order: [['created_at', 'DESC']]
    });

    const teacher = await Teacher.findByPk(teacherId, { attributes: ['id', 'name', 'teacher_id'] });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Default static value for now (e.g. 20 leaves allowed per year)
    const leavesAllowed = 20; 

    // Calculate leaves taken (only approved ones are deducted from balance)
    let leavesTaken = 0;
    leaves.forEach(l => {
      if (l.status === 'approved') {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        // Calculate days inclusive
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        leavesTaken += diffDays;
      }
    });

    res.json({
      teacher,
      leaves,
      summary: {
        total_available: leavesAllowed,
        taken: leavesTaken,
        balance: Math.max(leavesAllowed - leavesTaken, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/staff-leaves/:id/status
// Approve or Reject a leave application
router.put('/:id/status', protect, hasPermission('MANAGE_TEACHER_ATTENDANCE'), async (req, res) => {
  try {
    const { status, admin_remarks } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
    }

    const leave = await StaffLeave.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    await leave.update({ status, admin_remarks });

    // Note: If approved, we don't automatically insert 'leave' into teacher_attendance here,
    // because attendance is marked daily via the TeacherAttendanceManager grid. The grid UI
    // could pull these approved leaves and auto-populate 'leave' status, or admins manually set it.

    res.json({ message: `Leave request ${status}`, leave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/staff-leaves (For testing or future teacher submission)
router.post('/', protect, async (req, res) => {
  try {
    const { teacher_id, leave_type, start_date, end_date, reason } = req.body;
    const leave = await StaffLeave.create({
      teacher_id,
      leave_type,
      start_date,
      end_date,
      reason,
      status: 'pending'
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
