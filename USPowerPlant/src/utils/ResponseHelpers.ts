import { Response } from 'express';

export interface ApiSuccessResponse {
  success: true;
  data: any;
  message: string;
  timestamp: string;
  summary?: any;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
}

export interface ApiHealthResponse {
  success: true;
  message: string;
  timestamp: string;
  version: string;
  [key: string]: any;
}

export class ResponseHelper {
  static sendSuccess(
    res: Response, 
    data: any, 
    message: string, 
    summary?: any
  ): void {
    const response: ApiSuccessResponse = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      ...(summary && { summary })
    };
    res.json(response);
  }

  static sendError(
    res: Response, 
    error: unknown, 
    userMessage: string,
    statusCode: number = 500
  ): void {
    console.error(`${userMessage}:`, error);
    
    let errorMessage = 'An unexpected error occurred';
    let finalStatusCode = statusCode;

    if (error instanceof Error) {
      errorMessage = error.message;
      // Could add more specific error handling here
      if (error.message.includes('validation')) finalStatusCode = 400;
      if (error.message.includes('not found')) finalStatusCode = 404;
      if (error.message.includes('unauthorized')) finalStatusCode = 401;
      if (error.message.includes('forbidden')) finalStatusCode = 403;
    }
    
    const response: ApiErrorResponse = {
      success: false,
      error: userMessage,
      message: errorMessage,
      timestamp: new Date().toISOString()
    };
    
    res.status(finalStatusCode).json(response);
  }

  static sendHealth(
    res: Response, 
    message: string, 
    version: string, 
    additionalData: Record<string, any> = {}
  ): void {
    const response: ApiHealthResponse = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      version,
      ...additionalData
    };
    res.json(response);
  }

  static determineStatusCode(error: unknown): number {
    if (!(error instanceof Error)) return 500;

    const message = error.message.toLowerCase();
    if (message.includes('validation')) return 400;
    if (message.includes('not found')) return 404;
    if (message.includes('unauthorized')) return 401;
    if (message.includes('forbidden')) return 403;
    if (message.includes('conflict')) return 409;
    if (message.includes('timeout')) return 408;
    
    return 500;
  }
} 