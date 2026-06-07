const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { Notification, NotificationRead, User } = require('../models');
const { protect, hasPermission } = require('../middleware/auth');

// GET /api/notifications — filtered by recipient
router.get('/', protect, async (req, res) => {
  try {
    const where = {
      is_active: true,
      [Op.or]: [
        { recipient_type: 'all' },
        { recipient_type: 'role', recipient_role: req.user.role },
        { recipient_type: 'individual', recipient_user_id: req.user.id },
        { recipient_type: null, recipient_role: req.user.role },
        { recipient_type: null, recipient_role: 'all' },
      ]
    };

    const notifications = await Notification.findAll({
      where,
      include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    const readRecords = await NotificationRead.findAll({ where: { user_id: req.user.id } });
    const readSet = new Set(readRecords.map(r => r.notification_id));

    const result = notifications.map(n => ({
      ...n.toJSON(),
      is_read: readSet.has(n.id),
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/notifications — with individual recipient support
router.post('/', protect, hasPermission('SEND_NOTIFICATIONS'), async (req, res) => {
  try {
    const {
      title, message, type,
      recipient_type = 'all',
      recipient_role,
      recipient_user_id,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    // Validate recipient config
    if (recipient_type === 'individual' && !recipient_user_id) {
      return res.status(400).json({ message: 'recipient_user_id required for individual notifications.' });
    }

    if (recipient_type === 'role' && !recipient_role) {
      return res.status(400).json({ message: 'recipient_role required for role-based notifications.' });
    }

    // Verify user exists for individual
    if (recipient_type === 'individual') {
      const targetUser = await User.findByPk(recipient_user_id);
      if (!targetUser) return res.status(404).json({ message: 'Target user not found.' });
    }

    const notification = await Notification.create({
      title, message,
      type:              type || 'general',
      recipient_type,
      recipient_role:    recipient_type === 'role' ? recipient_role : null,
      recipient_user_id: recipient_type === 'individual' ? recipient_user_id : null,
      sent_by:           req.user.id,
    });

    // Send native system push notifications asynchronously
    const { sendPushToUser, sendPushToRole } = require('../services/pushNotificationService');
    if (recipient_type === 'individual') {
      sendPushToUser(recipient_user_id, title, message).catch(err => console.error('[PushRoute] Error:', err));
    } else if (recipient_type === 'role') {
      const targetRole = recipient_role === 'parents' ? 'parent' : recipient_role === 'teachers' ? 'teacher' : recipient_role;
      sendPushToRole(targetRole, title, message).catch(err => console.error('[PushRoute] Error:', err));
    } else {
      sendPushToRole('all', title, message).catch(err => console.error('[PushRoute] Error:', err));
    }

    res.status(201).json(notification);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// GET /api/notifications/users/search — for individual notification lookup
router.get('/users/search', protect, hasPermission('SEND_NOTIFICATIONS'), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const users = await User.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { name:  { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
        ]
      },
      attributes: ['id', 'name', 'email', 'role'],
      limit: 10,
    });

    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/notifications/:id/read
router.post('/:id/read', protect, async (req, res) => {
  try {
    await NotificationRead.upsert({ notification_id: req.params.id, user_id: req.user.id });
    res.json({ message: 'Marked as read.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/notifications/:id
router.delete('/:id', protect, hasPermission('SEND_NOTIFICATIONS'), async (req, res) => {
  try {
    await Notification.update({ is_active: false }, { where: { id: req.params.id } });
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Web Push Notifications Endpoints ──────────────────────────────────────────

// GET /api/notifications/vapid-key - Get public VAPID key for service worker subscription
router.get('/vapid-key', protect, (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/notifications/subscribe - Save push subscription details
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ message: 'Invalid push subscription details.' });
    }

    const { PushSubscription } = require('../models');
    await PushSubscription.upsert({
      user_id: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    res.status(201).json({ message: 'Push subscription saved successfully.' });
  } catch (err) {
    console.error('[PushRoute] Subscribe error:', err);
    res.status(500).json({ message: 'Failed to save push subscription.' });
  }
});

// POST /api/notifications/unsubscribe - Delete push subscription details
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required to unsubscribe.' });
    }

    const { PushSubscription } = require('../models');
    await PushSubscription.destroy({
      where: {
        user_id: req.user.id,
        endpoint,
      },
    });

    res.json({ message: 'Push subscription removed successfully.' });
  } catch (err) {
    console.error('[PushRoute] Unsubscribe error:', err);
    res.status(500).json({ message: 'Failed to remove push subscription.' });
  }
});

module.exports = router;
