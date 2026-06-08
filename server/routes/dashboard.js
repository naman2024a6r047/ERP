const express = require('express');
const { Op, fn, col } = require('sequelize');
const { Student, Teacher, Fee, Attendance, AdmissionRequest, Notification } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { MONTHS } = require('../services/feeService');

const router = express.Router();

router.get('/admin', protect, authorize('admin', 'admin2'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();

    const [
      totalStudents,
      totalTeachers,
      pendingApprovals,
      pendingAdmissions,
      recentStudents,
      notifications,
      todayAttendance,
      feeTotals,
      monthlyFees,
    ] = await Promise.all([
      Student.count({ where: { is_active: true, approval_status: 'approved' } }),
      Teacher.count({ where: { status: 'active' } }),
      Student.count({ where: { approval_status: 'pending' } }),
      AdmissionRequest.count({ where: { status: 'pending' } }),
      Student.findAll({
        where: { is_active: true, approval_status: 'approved' },
        order: [['created_at', 'DESC']],
        limit: 5,
      }),
      Notification.findAll({ order: [['created_at', 'DESC']], limit: 4 }),
      Attendance.findAll({
        where: { date: today },
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
      }),
      Fee.findAll({
        attributes: [
          [fn('SUM', col('total_amount')), 'total_amount'],
          [fn('SUM', col('paid_amount')), 'paid_amount'],
        ],
      }),
      Fee.findAll({
        where: { year },
        attributes: [
          'month',
          [fn('SUM', col('paid_amount')), 'collected'],
        ],
        group: ['month'],
      }),
    ]);

    const attendanceMap = todayAttendance.reduce((acc, row) => {
      acc[row.status] = Number(row.get('count') || 0);
      return acc;
    }, {});
    const present = attendanceMap.present || 0;
    const marked = Object.values(attendanceMap).reduce((sum, count) => sum + count, 0);

    const feeTotal = Number(feeTotals[0]?.get('total_amount') || 0);
    const feeCollected = Number(feeTotals[0]?.get('paid_amount') || 0);
    const feeByMonth = monthlyFees.reduce((acc, row) => {
      acc[row.month] = Number(row.get('collected') || 0);
      return acc;
    }, {});

    res.json({
      stats: {
        total_students: totalStudents,
        active_teachers: totalTeachers,
        fee_collected: feeCollected,
        fee_total: feeTotal,
        pending_fee_amount: Math.max(feeTotal - feeCollected, 0),
        pending_student_approvals: pendingApprovals,
        pending_admission_requests: pendingAdmissions,
        attendance_present: present,
        attendance_marked: marked,
        attendance_percentage: marked ? Math.round((present / marked) * 100) : 0,
      },
      charts: {
        fee_collection: MONTHS.slice(-6).map((month) => ({
          month: month.slice(0, 3),
          amount: feeByMonth[month] || 0,
        })),
        attendance_summary: [
          { label: 'Present', pct: present },
          { label: 'Absent', pct: attendanceMap.absent || 0 },
          { label: 'Late', pct: attendanceMap.late || 0 },
          { label: 'Holiday', pct: attendanceMap.holiday || 0 },
        ],
      },
      recent_students: recentStudents,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
