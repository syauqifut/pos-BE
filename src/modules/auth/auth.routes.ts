import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /auth/verify
 * @desc    Verify JWT token validity
 * @access  Private
 */
router.get('/verify', authenticateToken, authController.verifyToken);

/**
 * @route   POST /auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateToken, (req, res) => {
  // For JWT, logout is typically handled client-side by removing the token
  // Server-side logout would require token blacklisting (not implemented here)
  res.status(200).json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.'
  });
});

export default router; 