import mysql from 'mysql2/promise';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private connection: mysql.Connection | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      this.connection = await mysql.createConnection({
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '3306'),
        user: process.env['DB_USER'] || 'powerplant_user',
        password: process.env['DB_PASSWORD'] || 'powerplant_pass',
        database: process.env['DB_NAME'] || 'powerplants',
        supportBigNumbers: true,
        bigNumberStrings: true,
      });

    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('Database disconnected');
    }
  }

  public getConnection(): mysql.Connection {
    if (!this.connection) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.connection;
  }

  public async query(sql: string, params: any[] = []): Promise<any> {
    const connection = this.getConnection();
    const [rows] = await connection.execute(sql, params);
    return rows;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const connection = this.getConnection();
      await connection.ping();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
} 