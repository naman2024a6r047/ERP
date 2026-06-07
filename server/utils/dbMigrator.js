const { Student, AdmissionRequest, User, sequelize } = require('../models');

async function migratePendingStudents() {
  const txn = await sequelize.transaction();
  try {
    // Find all pending students
    const pendingStudents = await Student.findAll({
      where: { approval_status: 'pending' },
      transaction: txn,
    });

    if (pendingStudents.length === 0) {
      await txn.commit();
      return;
    }

    console.log(`[MIGRATOR] Found ${pendingStudents.length} pending students to migrate to admission requests.`);

    for (const student of pendingStudents) {
      // Check if there is already an admission request to prevent duplicate migration runs
      const existingRequest = await AdmissionRequest.findOne({
        where: {
          first_name: student.first_name,
          last_name: student.last_name,
          parent_phone: student.parent_phone,
        },
        transaction: txn,
      });

      if (!existingRequest) {
        await AdmissionRequest.create({
          first_name: student.first_name,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth,
          gender: student.gender,
          applying_class: student.class,
          parent_name: student.parent_name,
          parent_phone: student.parent_phone,
          parent_email: student.parent_email,
          parent_address: student.parent_address,
          previous_school: student.previous_school,
          status: 'pending',
          submitted_by: student.created_by || null,
          admission_fee_paid: 0,
        }, { transaction: txn });
        console.log(`[MIGRATOR] Created AdmissionRequest for ${student.first_name} ${student.last_name}`);
      }

      // Delete the unapproved student user login credentials
      await User.destroy({
        where: {
          linked_student_id: student.id,
          role: 'student',
        },
        transaction: txn,
      });

      // Delete the pending student record
      await student.destroy({ transaction: txn });
      console.log(`[MIGRATOR] Removed pending Student record ID: ${student.id}`);
    }

    await txn.commit();
    console.log('[MIGRATOR] ✅ Migration of pending students completed successfully.');
  } catch (err) {
    await txn.rollback();
    console.error('[MIGRATOR] ❌ Migration failed:', err.message);
  }
}

module.exports = { migratePendingStudents };
