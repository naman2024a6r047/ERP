const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:   { type: DataTypes.STRING(150), allowNull: false },
  message: { type: DataTypes.TEXT,        allowNull: false },
  type: {
    type: DataTypes.ENUM(
      'fee_reminder', 'attendance_alert', 'result',
      'general', 'holiday', 'admission', 'promotion'
    ),
    defaultValue: 'general'
  },
  sent_by: DataTypes.INTEGER,

  // ── Recipient config ───────────────────────────────────────────────────────
  recipient_type: {
    type: DataTypes.ENUM('all', 'role', 'individual'),
    defaultValue: 'all'
  },
  recipient_role: {
    type: DataTypes.ENUM('all', 'parents', 'teachers', 'fee_collector', 'admin2'),
    allowNull: true
  },
  recipient_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true   // Only set when recipient_type = 'individual'
  },

  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'notifications' });

module.exports = Notification;