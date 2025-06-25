import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  role?: string;
}

export class AuthService {
  private readonly secretKey: string;
  private readonly tokenExpiry: string;

  constructor() {
    this.secretKey = process.env['JWT_SECRET'] || 'sample-secret-key-for-dev';
    this.tokenExpiry = process.env['JWT_EXPIRY'] || '1h';
  }

  /**
   * Generate JWT token
   */
  public generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secretKey, { 
      expiresIn: this.tokenExpiry,
      issuer: 'power-plant-api'
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode JWT token
   */
  public verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.secretKey) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  public decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }
} 