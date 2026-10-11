const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../config/jwt');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/auditLogger');
const { sendEmail } = require('../config/mail');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

async function loginUser({ email, password, req }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      student: { include: { course: true } },
      faculty: true,
    },
  });

  if (!user) {
    // Generic authentication error message to prevent enumeration
    await createAuditLog({
      action: 'LOGIN_FAILED',
      affectedResource: 'USER',
      metadata: { reason: 'User not found', attempted_email: email },
      req,
    });
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Check if account is deactivated
  if (user.status === 'inactive') {
    throw new ApiError(403, 'Account is deactivated. Please contact the administrator.');
  }

  // Check if account is locked
  if (user.status === 'locked' && user.locked_until) {
    if (new Date() < user.locked_until) {
      const waitMinutes = Math.ceil((user.locked_until.getTime() - Date.now()) / (60 * 1000));
      throw new ApiError(403, `Account is locked due to too many failed attempts. Try again in ${waitMinutes} minutes.`);
    } else {
      // Lock has expired, reset
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { status: 'active', failed_attempts: 0, locked_until: null },
      });
      user.status = 'active';
      user.failed_attempts = 0;
    }
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const nextFailedAttempts = user.failed_attempts + 1;
    let newStatus = user.status;
    let lockUntil = null;

    if (nextFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      newStatus = 'locked';
      lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
      await createAuditLog({
        userId: user.user_id,
        action: 'ACCOUNT_LOCKOUT',
        affectedResource: 'USER',
        resourceId: user.user_id,
        metadata: { failed_attempts: nextFailedAttempts, locked_until: lockUntil },
        req,
      });
    }

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        failed_attempts: nextFailedAttempts,
        status: newStatus,
        locked_until: lockUntil,
      },
    });

    await createAuditLog({
      userId: user.user_id,
      action: 'LOGIN_FAILED',
      affectedResource: 'USER',
      resourceId: user.user_id,
      metadata: { failed_attempts: nextFailedAttempts },
      req,
    });

    if (nextFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      throw new ApiError(403, `Account has been locked for ${LOCK_TIME_MINUTES} minutes due to 5 consecutive failed login attempts.`);
    }

    throw new ApiError(401, 'Invalid email or password.');
  }

  // Reset failed attempts on success
  if (user.failed_attempts > 0 || user.status === 'locked') {
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { failed_attempts: 0, status: 'active', locked_until: null },
    });
  }

  // Generate tokens
  const payload = {
    userId: user.user_id,
    email: user.email,
    role: user.role,
    name: user.full_name,
  };

  const accessToken = generateAccessToken(payload);
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken(payload);

  // Persist refresh token in DB
  await prisma.refreshToken.create({
    data: {
      user_id: user.user_id,
      token_hash: hash,
      expires_at: expiresAt,
    },
  });

  // Log successful login
  await createAuditLog({
    userId: user.user_id,
    action: 'LOGIN_SUCCESS',
    affectedResource: 'USER',
    resourceId: user.user_id,
    metadata: { role: user.role },
    req,
  });

  // Strip password hash from returned object
  const { password_hash, ...safeUser } = user;

  return {
    user: safeUser,
    accessToken,
    refreshToken,
  };
}

async function refreshUserToken(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new ApiError(401, 'Refresh token required.');
  }

  const hash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: {
      token_hash: hash,
      revoked: false,
      expires_at: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!stored || !stored.user || stored.user.status !== 'active') {
    throw new ApiError(401, 'Invalid or expired session. Please log in again.');
  }

  // Rotate refresh token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const payload = {
    userId: stored.user.user_id,
    email: stored.user.email,
    role: stored.user.role,
    name: stored.user.full_name,
  };

  const newAccessToken = generateAccessToken(payload);
  const { token: newRefreshToken, hash: newHash, expiresAt } = generateRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      user_id: stored.user.user_id,
      token_hash: newHash,
      expires_at: expiresAt,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

async function logoutUser(rawRefreshToken, userId = null, req = null) {
  if (rawRefreshToken) {
    const hash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { token_hash: hash },
      data: { revoked: true },
    });
  }

  if (userId) {
    await createAuditLog({
      userId,
      action: 'LOGOUT',
      affectedResource: 'USER',
      resourceId: userId,
      req,
    });
  }

  return true;
}

async function registerNewUser(data, adminUserId, req) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { institutional_id: data.institutional_id },
      ],
    },
  });

  if (existing) {
    if (existing.email === data.email) {
      throw new ApiError(409, 'An account with this email address already exists.');
    }
    throw new ApiError(409, 'An account with this institutional ID already exists.');
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(data.password, salt);

  // Database transaction to ensure relational integrity
  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        full_name: data.full_name,
        email: data.email,
        password_hash: passwordHash,
        role: data.role,
        status: 'active',
        contact_number: data.contact_number,
        institutional_id: data.institutional_id,
      },
    });

    if (data.role === 'Student') {
      if (!data.course_id || !data.batch_year) {
        throw new ApiError(400, 'Student requires course_id and batch_year.');
      }

      // Generate or validate unique enrollment number YYYY-COURSE-XXX
      const course = await tx.course.findUnique({ where: { course_id: data.course_id } });
      if (!course) throw new ApiError(404, 'Selected course does not exist.');

      const countInBatch = await tx.student.count({
        where: { course_id: data.course_id, batch_year: data.batch_year },
      });
      const seq = String(countInBatch + 1).padStart(3, '0');
      const courseCode = course.course_name.split(' ')[0].toUpperCase();
      const enrollmentNo = `${data.batch_year}-${courseCode}-${seq}`;

      await tx.student.create({
        data: {
          user_id: newUser.user_id,
          enrollment_no: enrollmentNo,
          course_id: data.course_id,
          batch_year: data.batch_year,
          attendance_pct: data.attendance_pct || 0.0,
        },
      });
    } else if (data.role === 'Faculty') {
      await tx.faculty.create({
        data: {
          user_id: newUser.user_id,
          department: data.department || 'General Academics',
          designation: data.designation || 'Lecturer',
        },
      });
    }

    // Create welcoming notification
    await tx.notification.create({
      data: {
        user_id: newUser.user_id,
        message: `Welcome to EMS! Your ${data.role} account has been activated. Institutional ID: ${data.institutional_id}`,
        type: 'ACCOUNT',
        delivery_status: 'Sent',
      },
    });

    return newUser;
  });

  await createAuditLog({
    userId: adminUserId,
    action: 'USER_REGISTERED',
    affectedResource: 'USER',
    resourceId: result.user_id,
    metadata: { role: data.role, email: data.email, institutional_id: data.institutional_id },
    req,
  });

  const { password_hash, ...safe } = result;
  return safe;
}

module.exports = {
  loginUser,
  refreshUserToken,
  logoutUser,
  registerNewUser,
};
