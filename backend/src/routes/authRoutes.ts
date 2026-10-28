import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be between 2 and 150 characters.'),
    body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
    body('address').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  [
    body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  authController.login
);

router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  [body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail()],
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetRateLimiter,
  [
    body('token')
      .isString()
      .matches(/^[a-f0-9]{64}$/)
      .withMessage('This reset link is invalid or has expired. Please request a new one.'),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters.'),
  ],
  validate,
  authController.resetPassword
);

router.get('/me', authenticate, authController.me);

export default router;
