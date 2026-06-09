const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
  Result,
  ResultSubject,
  Student,
  Teacher,
  ClassIncharge,
  User,
  Notification,
} = require('../models');
const { protect, authorize, hasPermission } = require('../middleware/auth');
const { validateResultCreate, validateResultInchargeReview } = require('../middleware/validator');
const { getTeacherAllowedClasses } = require('../utils/teacherAllowedClasses');

const calcGrade = (pct) =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';

const teacherCanEnter = async (teacherRecord, cls, section, subject) => {
  if (!teacherRecord) return false;
  const assigned = teacherRecord.assigned_classes?.split(',').map((s) => s.trim()) || [];
  if (!assigned.includes(cls)) return false;
  if (subject && teacherRecord.subject !== subject) return false;
  return true;
};

// GET /api/results/student/:studentId
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);

    if ((req.user.role === 'parent' || req.user.role === 'student')) {
      const linkedId = req.user.linked_student_id || req.user.linkedStudent?.id;
      if (!linkedId || linkedId !== studentId) {
        return res.status(403).json({ message: 'Access denied to this student.' });
      }
    }

    const where = { student_id: studentId };
    if (req.user.role === 'parent' || req.user.role === 'student') where.is_published = true;

    const results = await Result.findAll({
      where,
      include: [{ model: ResultSubject, as: 'subjects' }],
      order: [['created_at', 'DESC']],
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/results/class
router.get('/class', protect, authorize('admin', 'admin2', 'teacher'), async (req, res) => {
  try {
    const { class: cls, section, exam_name, workflow_status } = req.query;
    const where = {};
    if (cls) where.class = cls;
    if (section) where.section = section;
    if (exam_name) where.exam_name = exam_name;
    if (workflow_status) where.workflow_status = workflow_status;

    if (req.user.role === 'teacher') {
      const allowedClasses = await getTeacherAllowedClasses(req.user.linked_teacher_id);
      if (cls) {
        if (!allowedClasses.includes(cls)) {
          return res.status(403).json({ message: 'Access denied. You are not assigned to this class.' });
        }
      } else {
        where.class = { [Op.in]: allowedClasses };
      }
    }

    const results = await Result.findAll({
      where,
      include: [
        { model: Student, as: 'student', attributes: ['id', 'first_name', 'last_name', 'roll_number'] },
        { model: ResultSubject, as: 'subjects' },
        { model: User, as: 'enteredByUser', attributes: ['id', 'name', 'role'] },
      ],
      order: [['percentage', 'DESC']],
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/results/class-incharge
router.get('/class-incharge', protect, hasPermission('INCHARGE_REVIEW'), async (req, res) => {
  try {
    const teacherId = req.user.linked_teacher_id;
    if (!teacherId) {
      return res.status(403).json({ message: 'Only class incharge teachers can access this view.' });
    }

    const incharge = await ClassIncharge.findOne({
      where: {
        teacher_id: teacherId,
        is_active: true,
      },
      order: [['updated_at', 'DESC']],
    });

    if (!incharge) {
      return res.status(403).json({ message: 'You are not assigned as class incharge.' });
    }

    const { exam_name } = req.query;
    const where = {
      class: incharge.class,
      section: incharge.section,
    };
    if (exam_name) where.exam_name = exam_name;

    const results = await Result.findAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'student_id', 'first_name', 'last_name', 'roll_number', 'class', 'section'],
        },
        { model: ResultSubject, as: 'subjects' },
        { model: User, as: 'enteredByUser', attributes: ['id', 'name', 'role'] },
      ],
      order: [
        [{ model: Student, as: 'student' }, 'roll_number', 'ASC'],
        ['exam_name', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });

    const exams = [...new Set(results.map((item) => item.exam_name).filter(Boolean))];

    res.json({
      incharge: {
        class: incharge.class,
        section: incharge.section,
      },
      exams,
      results,
    });
  } catch (err) {
    console.error('[results][GET /class-incharge]', err);
    res.status(500).json({ message: 'Failed to load incharge results.' });
  }
});

// GET /api/results/pending-approval
router.get('/pending-approval', protect, authorize('admin', 'admin2'), async (req, res) => {
  try {
    const where =
      req.user.role === 'admin2'
        ? { workflow_status: 'incharge_approved' }
        : { workflow_status: 'admin2_approved' };

    const results = await Result.findAll({
      where,
      include: [
        { model: Student, as: 'student', attributes: ['id', 'first_name', 'last_name', 'class', 'section'] },
        { model: ResultSubject, as: 'subjects' },
        { model: User, as: 'enteredByUser', attributes: ['id', 'name'] },
      ],
      order: [['updated_at', 'DESC']],
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/results
router.post('/', protect, authorize('admin', 'admin2', 'teacher'), validateResultCreate, async (req, res) => {
  try {
    const {
      student_id,
      exam_name,
      exam_type,
      class: cls,
      section,
      session_id,
      subjects,
      is_class_test = false,
    } = req.body;

    if (req.user.role === 'teacher') {
      const isIncharge = await ClassIncharge.findOne({
        where: {
          teacher_id: req.user.linked_teacher_id,
          class: cls,
          section: section,
          is_active: true
        }
      });

      if (!isIncharge) {
        const teacherRecord = await Teacher.findByPk(req.user.linked_teacher_id);
        const subject = subjects?.[0]?.subject;
        const allowed = await teacherCanEnter(teacherRecord, cls, section, subject);
        if (!allowed) {
          return res.status(403).json({ message: 'You are not assigned to this class or subject, and you are not the class incharge.' });
        }
      }
    }

    const total_marks = subjects.reduce((a, s) => a + s.max_marks, 0);
    const total_obtained = subjects.reduce((a, s) => a + s.obtained_marks, 0);
    const percentage = parseFloat(((total_obtained / total_marks) * 100).toFixed(2));
    const grade = calcGrade(percentage);

    const subjectsWithGrade = subjects.map((s) => ({
      ...s,
      grade: calcGrade((s.obtained_marks / s.max_marks) * 100),
    }));

    const result = await Result.create(
      {
        student_id,
        exam_name,
        exam_type,
        class: cls,
        section,
        session_id,
        total_marks,
        total_obtained,
        percentage,
        grade,
        entered_by: req.user.id,
        workflow_status: is_class_test ? 'published' : 'draft',
        is_class_test,
        is_published: is_class_test,
        sent_to_parents: false,
        subjects: subjectsWithGrade,
      },
      { include: [{ model: ResultSubject, as: 'subjects' }] }
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/results/:id/submit
// (H7 fix) — teachers can only submit their own results
router.put('/:id/submit', protect, authorize('teacher', 'admin', 'admin2'), async (req, res) => {
  try {
    const result = await Result.findByPk(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    if (!['draft', 'rejected'].includes(result.workflow_status)) {
      return res.status(400).json({ message: 'Result is not in draft/rejected state.' });
    }

    // (H7 fix) — verify teacher ownership
    if (req.user.role === 'teacher' && result.entered_by !== req.user.id) {
      return res.status(403).json({ message: 'You can only submit results you entered.' });
    }

    await result.update({ workflow_status: 'submitted', rejection_reason: null });
    res.json({ message: 'Submitted for class incharge review.', result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/results/:id/incharge-review
// (H7 fix) — verifies teacher is the incharge for the result's class
router.put('/:id/incharge-review', protect, authorize('teacher', 'admin', 'admin2'), validateResultInchargeReview, async (req, res) => {
  try {
    const { action, notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject.' });
    }

    const result = await Result.findByPk(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });

    if (req.user.role === 'teacher') {
      const incharge = await ClassIncharge.findOne({
        where: { class: result.class, section: result.section, is_active: true },
      });
      if (!incharge || incharge.teacher_id !== req.user.linked_teacher_id) {
        return res.status(403).json({ message: 'You are not the class incharge for this class/section.' });
      }
    }

    const update =
      action === 'approve'
        ? {
            workflow_status: 'incharge_approved',
            incharge_reviewed_by: req.user.id,
            incharge_reviewed_at: new Date(),
            workflow_notes: notes,
          }
        : { workflow_status: 'rejected', rejection_reason: notes };

    await result.update(update);
    res.json({ message: `Result ${action === 'approve' ? 'approved' : 'rejected'} by class incharge.`, result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/results/:id/admin2-review
router.put('/:id/admin2-review', protect, authorize('admin2', 'admin'), async (req, res) => {
  try {
    const { action, notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject.' });
    }

    const result = await Result.findByPk(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });

    const update =
      action === 'approve'
        ? {
            workflow_status: 'admin2_approved',
            admin2_approved_by: req.user.id,
            admin2_approved_at: new Date(),
            workflow_notes: notes,
          }
        : { workflow_status: 'rejected', rejection_reason: notes };

    await result.update(update);
    res.json({ message: `Result ${action === 'approve' ? 'forwarded to admin' : 'rejected'}.`, result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/results/:id/publish
router.put('/:id/publish', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await Result.findByPk(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });

    await result.update({
      workflow_status: 'published',
      is_published: true,
      admin_approved_by: req.user.id,
      admin_approved_at: new Date(),
    });
    res.json({ message: 'Result published.', result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/results/:id/send-to-parents
router.put('/:id/send-to-parents', protect, authorize('teacher', 'admin', 'admin2'), async (req, res) => {
  try {
    const result = await Result.findByPk(req.params.id, {
      include: [{ model: Student, as: 'student' }],
    });
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    if (!result.is_class_test) {
      return res.status(400).json({ message: 'Only class test results can be sent directly.' });
    }

    await result.update({ sent_to_parents: true });

    const parentUser = await User.findOne({
      where: {
        linked_student_id: result.student_id,
        role: 'parent',
        is_active: true,
      },
    });

    if (parentUser) {
      await Notification.create({
        title: `Class Test Result - ${result.exam_name}`,
        message: `Result for ${result.student?.first_name} in ${result.exam_name}: ${result.total_obtained}/${result.total_marks} (${result.percentage}%) - Grade: ${result.grade}`,
        type: 'result',
        recipient_type: 'individual',
        recipient_user_id: parentUser.id,
        sent_by: req.user.id,
      });
    }

    res.json({ message: 'Result sent to parents.', result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
