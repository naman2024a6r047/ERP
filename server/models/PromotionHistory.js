const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromotionHistory = sequelize.define('PromotionHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  from_class: {
    type: DataTypes.STRING(20)
  },
  to_class: {
    type: DataTypes.STRING(20)
  },
  from_session: {
    type: DataTypes.STRING(20)
  },
  to_session: {
    type: DataTypes.STRING(20)
  },
  promoted_by: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'promotion_history'
});

module.exports = PromotionHistory;