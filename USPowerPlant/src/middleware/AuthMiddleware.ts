import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthMiddleware {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate requests using JWT token
   */
  public authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'Authorization header missing',
          message: 'Please provide an authorization token'
        });
        return;
      }

      // Check if header has Bearer format
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Invalid authorization format',
          message: 'Authorization header must be in format: Bearer <token>'
        });
        return;
      }

      // Extract token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Token missing',
          message: 'Authorization token is required'
        });
        return;
      }

      // Verify token - if invalid, this will throw an error
      this.authService.verifyToken(token);

      // Token is valid, proceed to next middleware
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  };
} 