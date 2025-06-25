import { Request, Response, Router } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  private router: Router;

  constructor(private readonly authService: AuthService) {
    this.router = Router();
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.post('/token', this.generateToken);
  }

  // added generate token api to facilitate testing of the api without any auth generation mechanism
  public generateToken = async (_req: Request, res: Response): Promise<void> => {
    try {
      // Generate token with default payload
      const token = this.authService.generateToken({
        userId: 'api-user',
        role: 'user'
      });

      res.json({
        success: true,
        data: {
          token,
          tokenType: 'Bearer',
          expiresIn: process.env['JWT_EXPIRY'] || '1h'
        },
        message: 'Authentication token generated successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to generate authentication token');
    }
  };

  private handleError(res: Response, error: unknown, message: string): void {
    console.error(message + ':', error);
    
    res.status(500).json({
      success: false,
      error: message,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
} 