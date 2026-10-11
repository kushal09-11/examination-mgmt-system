const prisma = require('../config/db');

async function getNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { user_id: req.user.user_id, is_read: false },
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { user_id: req.user.user_id, is_read: false },
        data: { is_read: true },
      });
    } else {
      await prisma.notification.update({
        where: { notification_id: Number(id) },
        data: { is_read: true },
      });
    }

    res.json({ success: true, message: 'Notification(s) marked as read.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
};
