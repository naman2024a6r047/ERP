const { Op } = require('sequelize');
const { Student } = require('../models');

const rejectOldPendingStudents = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [updatedCount] = await Student.update(
      { 
        approval_status: 'rejected',
        rejection_reason: 'Auto-rejected after 30 days of inactivity'
      },
      {
        where: {
          approval_status: 'pending',
          createdAt: {
            [Op.lt]: thirtyDaysAgo,
          },
        },
      }
    );
    if (updatedCount > 0) {
      console.log(`[Cleanup] Auto-rejected ${updatedCount} pending student(s) older than 30 days.`);
    }
  } catch (err) {
    console.error('[Cleanup] Error auto-rejecting students:', err);
  }
};

module.exports = { rejectOldPendingStudents };
