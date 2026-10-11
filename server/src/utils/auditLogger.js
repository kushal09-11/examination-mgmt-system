const prisma = require('../config/db');

async function createAuditLog({ userId = null, action, affectedResource = null, resourceId = null, metadata = null, req = null }) {
  try {
    let ipAddress = null;
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
    }

    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        affected_resource: affectedResource,
        resource_id: resourceId ? String(resourceId) : null,
        metadata: metadata ? metadata : undefined,
        ip_address: ipAddress ? String(ipAddress).substring(0, 50) : null,
      },
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]: Failed to persist audit entry:', err.message);
  }
}

module.exports = {
  createAuditLog,
};
