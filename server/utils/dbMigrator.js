const { Student, AdmissionRequest, User, sequelize } = require('../models');

async function migratePendingStudents() {
  const txn = await sequelize.transaction();
  try {
    // 1. Migrate students with approval_status: 'pending' (unapproved legacy students)
    const pendingStudents = await Student.findAll({
      where: { approval_status: 'pending' },
      transaction: txn,
    });

    if (pendingStudents.length > 0) {
      console.log(`[MIGRATOR] Found ${pendingStudents.length} pending students to migrate to admission requests.`);
      for (const student of pendingStudents) {
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
          console.log(`[MIGRATOR] Created pending AdmissionRequest for ${student.first_name} ${student.last_name}`);
        }

        // Delete user credentials & pending student
        await User.destroy({
          where: { linked_student_id: student.id, role: 'student' },
          transaction: txn,
        });
        await student.destroy({ transaction: txn });
        console.log(`[MIGRATOR] Removed pending Student record ID: ${student.id}`);
      }
    }

    // 2. Migrate students with source: 'admission_approved' and admission_request_id: null (already approved legacy students)
    const approvedLegacyStudents = await Student.findAll({
      where: {
        source: 'admission_approved',
        admission_request_id: null,
      },
      transaction: txn,
    });

    if (approvedLegacyStudents.length > 0) {
      console.log(`[MIGRATOR] Found ${approvedLegacyStudents.length} approved legacy students to link with admission requests.`);
      for (const student of approvedLegacyStudents) {
        const request = await AdmissionRequest.create({
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
          status: 'approved',
          submitted_by: student.created_by || null,
          reviewed_by: student.approved_by || null,
          approved_at: student.approved_at || student.created_at,
          student_id_created: student.id,
          admission_fee_paid: 0,
        }, { transaction: txn });

        await student.update({ admission_request_id: request.id }, { transaction: txn });
        console.log(`[MIGRATOR] Created approved AdmissionRequest for ${student.first_name} ${student.last_name} (linked with student ID: ${student.id})`);
      }
    }

    await txn.commit();
    console.log('[MIGRATOR] ✅ Database migration completed successfully.');
  } catch (err) {
    await txn.rollback();
    console.error('[MIGRATOR] ❌ Database migration failed:', err.message);
  }
}

module.exports = { migratePendingStudents };
