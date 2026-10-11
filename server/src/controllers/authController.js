const authService = require('../services/authService');
const { loginSchema, registerUserSchema, changePasswordSchema, resetPasswordRequestSchema } = require('../validators/authValidator');
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../middleware/errorHandler');

async function login(req, res, next) {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await authService.loginUser({
      email: validated.email,
      password: validated.password,
      req,
    });

    // Set secure HTTP-only cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const tokens = await authService.refreshUserToken(token);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: tokens,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logoutUser(token, req.user?.user_id, req);

    res.clearCookie('refreshToken');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      include: {
        student: { include: { course: true } },
        faculty: { include: { assignments: { include: { subject: true } } } },
      },
    });

    const { password_hash, ...safe } = user;
    res.json({
      success: true,
      data: safe,
    });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const validated = registerUserSchema.parse(req.body);
    const user = await authService.registerNewUser(validated, req.user.user_id, req);

    res.status(201).json({
      success: true,
      message: `Account created successfully for ${user.full_name} (${user.role}).`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new ApiError(400, 'Current password does not match.');
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { password_hash: newHash },
    });

    const { createAuditLog } = require('../utils/auditLogger');
    await createAuditLog({
      userId: req.user.user_id,
      action: 'PASSWORD_CHANGED',
      affectedResource: 'USER',
      resourceId: req.user.user_id,
      req,
    });

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    const { email } = resetPasswordRequestSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond with generic message for privacy
    if (user) {
      const { sendEmail } = require('../config/mail');
      await sendEmail({
        to: email,
        subject: 'EMS Password Reset Instructions',
        text: 'A password reset request was received for your EMS account. Please contact your system administrator or use the temporary reset credentials.',
      });
    }

    res.json({
      success: true,
      message: 'If the email exists in our records, instructions have been dispatched.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  register,
  changePassword,
  requestPasswordReset,
};
