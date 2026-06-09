const sequelize = require('../config/database');

const User             = require('./User');
const Student          = require('./Student');
const Teacher          = require('./Teacher');
const Session          = require('./Session');
const Attendance       = require('./Attendance');
const Fee              = require('./Fee');
const Result           = require('./Result');
const ResultSubject    = require('./ResultSubject');
const Notification     = require('./Notification');
const NotificationRead = require('./NotificationRead');
const Timetable        = require('./Timetable');
const PromotionHistory = require('./PromotionHistory');
const AdmissionRequest = require('./AdmissionRequest');
const TeacherAttendance= require('./TeacherAttendance');
const ClassIncharge    = require('./ClassIncharge');
const ClassFeeStructure= require('./ClassFeeStructure');
const AuditLog          = require('./AuditLog');
const PushSubscription  = require('./PushSubscription');
const Setting           = require('./Setting');
const Event             = require('./Event');

// ── Associations ──────────────────────────────────────────────────────────────

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(PushSubscription, { foreignKey: 'user_id', as: 'pushSubscriptions' });
PushSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Session.hasMany(Student, { foreignKey: 'session_id', as: 'students' });
Student.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });

Student.hasOne(User,    { foreignKey: 'linked_student_id', as: 'parentUser' });
User.belongsTo(Student, { foreignKey: 'linked_student_id', as: 'linkedStudent' });

Teacher.hasOne(User,   { foreignKey: 'linked_teacher_id', as: 'teacherUser' });
User.belongsTo(Teacher,{ foreignKey: 'linked_teacher_id', as: 'linkedTeacher' });

Student.hasMany(Attendance, { foreignKey: 'student_id', as: 'attendanceRecords' });
Attendance.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(Attendance, { foreignKey: 'marked_by', as: 'markedAttendances' });
Attendance.belongsTo(User, { foreignKey: 'marked_by', as: 'markedByUser' });

Student.hasMany(Fee, { foreignKey: 'student_id', as: 'fees' });
Fee.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(Fee, { foreignKey: 'collected_by', as: 'collectedFees' });
Fee.belongsTo(User, { foreignKey: 'collected_by', as: 'collectedByUser' });

Student.hasMany(Result, { foreignKey: 'student_id', as: 'results' });
Result.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

Result.hasMany(ResultSubject, { foreignKey: 'result_id', as: 'subjects' });
ResultSubject.belongsTo(Result, { foreignKey: 'result_id', as: 'result' });

User.hasMany(Result, { foreignKey: 'entered_by',           as: 'enteredResults' });
User.hasMany(Result, { foreignKey: 'incharge_reviewed_by', as: 'inchargeReviewed' });
User.hasMany(Result, { foreignKey: 'admin2_approved_by',   as: 'admin2Approved' });
User.hasMany(Result, { foreignKey: 'admin_approved_by',    as: 'adminApproved' });
Result.belongsTo(User, { foreignKey: 'entered_by',           as: 'enteredByUser' });
Result.belongsTo(User, { foreignKey: 'incharge_reviewed_by', as: 'inchargeUser' });
Result.belongsTo(User, { foreignKey: 'admin2_approved_by',   as: 'admin2User' });
Result.belongsTo(User, { foreignKey: 'admin_approved_by',    as: 'adminUser' });

Notification.belongsToMany(User, {
  through: NotificationRead, foreignKey: 'notification_id', as: 'readByUsers'
});
User.belongsToMany(Notification, {
  through: NotificationRead, foreignKey: 'user_id', as: 'readNotifications'
});
User.hasMany(Notification, { foreignKey: 'sent_by', as: 'sentNotifications' });
Notification.belongsTo(User, { foreignKey: 'sent_by', as: 'sender' });

// Individual notification recipient
Notification.belongsTo(User, {
  foreignKey: 'recipient_user_id', as: 'recipientUser'
});

Teacher.hasMany(Timetable, { foreignKey: 'teacher_id', as: 'timetableSlots' });
Timetable.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

Student.hasMany(PromotionHistory, { foreignKey: 'student_id', as: 'promotionHistory' });
PromotionHistory.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(AdmissionRequest, { foreignKey: 'submitted_by', as: 'submittedAdmissions' });
AdmissionRequest.belongsTo(User, { foreignKey: 'submitted_by', as: 'submittedByUser' });
User.hasMany(AdmissionRequest, { foreignKey: 'reviewed_by',  as: 'reviewedAdmissions' });
AdmissionRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewedByUser' });

User.hasMany(Student, { foreignKey: 'created_by', as: 'createdStudents' });
Student.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Student, { foreignKey: 'approved_by', as: 'approvedStudents' });
Student.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

Teacher.hasMany(TeacherAttendance, { foreignKey: 'teacher_id', as: 'attendances' });
TeacherAttendance.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

Teacher.hasMany(ClassIncharge, { foreignKey: 'teacher_id', as: 'inchargeAssignments' });
ClassIncharge.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// ClassFeeStructure — no FK to students, standalone lookup table
User.hasMany(ClassFeeStructure, { foreignKey: 'updated_by', as: 'feeStructureUpdates' });
ClassFeeStructure.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedByUser' });

User.hasMany(Event, { foreignKey: 'created_by', as: 'createdEvents' });
Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ── Global JSON Serializer Override ─────────────────────────────────────────
// This ensures that created_at and updated_at are always populated in the JSON output.
for (const modelName of Object.keys(sequelize.models)) {
  const model = sequelize.models[modelName];
  const originalToJSON = model.prototype.toJSON;
  model.prototype.toJSON = function () {
    const values = originalToJSON.call(this);
    if (values.createdAt && !values.created_at) {
      values.created_at = values.createdAt;
    }
    if (values.updatedAt && !values.updated_at) {
      values.updated_at = values.updatedAt;
    }
    return values;
  };
}

module.exports = {
  sequelize,
  User, Student, Teacher, Session,
  Attendance, Fee,
  Result, ResultSubject,
  Notification, NotificationRead,
  Timetable, PromotionHistory,
  AdmissionRequest, TeacherAttendance,
  ClassIncharge, ClassFeeStructure,
  AuditLog, PushSubscription,
  Setting,
  Event,
};
