const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClassFeeStructure = sequelize.define('ClassFeeStructure', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  class: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true }
  },
  monthly_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 }
  },
  admission_fee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: { min: 0 }
  },
  annual_fee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: { min: 0 }
  },
  promotion_fee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: { min: 0 }
  },
  exam_fee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: { min: 0 }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, { tableName: 'class_fee_structures' });

module.exports = ClassFeeStructure;