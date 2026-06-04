const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Teacher = sequelize.define('Teacher', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teacher_id: {
    type: DataTypes.STRING(20),
    unique: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(15)
  },
  email: {
    type: DataTypes.STRING(150)
  },
  qualification: {
    type: DataTypes.STRING(100)
  },
  join_date: {
    type: DataTypes.DATEONLY
  },
  status: {
    type: DataTypes.ENUM('active', 'leave', 'inactive'),
    defaultValue: 'active'
  },
  // Comma-separated: "Class 8,Class 9,Class 10"
  assigned_classes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'teachers'
});

module.exports = Teacher;
