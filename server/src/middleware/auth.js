const { verifyAccessToken } = require('../config/jwt');
const prisma = require('../config/db');
const { ApiError } = require('./errorHandler');

async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token missing. Please sign in.');
    }

    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId },
      include: {
        student: true,
        faculty: true,
      },
    });

    if (!user) {
      throw new ApiError(401, 'User account no longer exists.');
    }

    if (user.status === 'inactive') {
      throw new ApiError(403, 'Your account has been deactivated. Please contact the administrator.');
    }

    if (user.status === 'locked') {
      if (user.locked_until && new Date() < user.locked_until) {
        throw new ApiError(403, `Account temporarily locked due to multiple failed logins. Try again after ${user.locked_until.toLocaleTimeString()}.`);
      } else if (user.locked_until) {
        // Unlock expired
        await prisma.user.update({
          where: { user_id: user.user_id },
          data: { status: 'active', failed_attempts: 0, locked_until: null },
        });
        user.status = 'active';
      }
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Access denied. Requires one of: ${allowedRoles.join(', ')}.`));
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
