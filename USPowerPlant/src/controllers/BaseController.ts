import { Request, Response, Router } from 'express';
import { ResponseHelper } from '../utils/ResponseHelpers';

export abstract class BaseController {
  protected router: Router;

  constructor() {
    this.router = Router();
  }

  public getRouter(): Router {
    return this.router;
  }

  // Common utility methods for all controllers
  protected isEmpty(obj: Record<string, any>): boolean {
    return Object.keys(obj).length === 0;
  }

  protected sendSuccess(res: Response, data: any, message: string, summary?: any): void {
    ResponseHelper.sendSuccess(res, data, message, summary);
  }

  protected sendError(res: Response, error: unknown, message: string, statusCode?: number): void {
    ResponseHelper.sendError(res, error, message, statusCode);
  }

  protected sendHealth(res: Response, message: string, version: string, additionalData?: Record<string, any>): void {
    ResponseHelper.sendHealth(res, message, version, additionalData);
  }

  // Base health check - can be overridden
  protected baseHealthCheck = (_req: Request, res: Response, serviceName: string, version: string): void => {
    this.sendHealth(res, `${serviceName} API is healthy`, version);
  };

  // Common error handling
  protected handleError = (res: Response, error: unknown, message: string): void => {
    this.sendError(res, error, message);
  };

  // Common async error wrapper
  protected asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        await fn(req, res);
      } catch (error) {
        this.handleError(res, error, 'Internal server error');
      }
    };
  }

  // Abstract method that must be implemented by subclasses
  protected abstract initializeRoutes(): void;
} 