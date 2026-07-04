const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  class: {
    type: DataTypes.STRING(20)
  },
  section: {
    type: DataTypes.STRING(5)
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'holiday', 'late'),
    allowNull: false
  },
  marked_by: {
    type: DataTypes.INTEGER
  },
  session_id: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'attendance',
  indexes: [
    { unique: true, fields: ['student_id', 'date'] },
    { fields: ['date'] },
    { fields: ['status'] }
  ]
});

module.exports = Attendance;