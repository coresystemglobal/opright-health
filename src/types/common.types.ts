import { Request } from 'express';

// Base API Response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

// Pagination interface
export interface PaginationOptions {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort_by?: string;
  order?: 'ASC' | 'DESC';
  search?: string;
}

// Enhanced Request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Generic typed request
export interface TypedRequest<T = any> extends AuthenticatedRequest {
  body: T;
}

// Date range interface
export interface DateRange {
  start_date: string;
  end_date: string;
}

// Sort options
export interface SortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

// Search options
export interface SearchOptions {
  query: string;
  fields: string[];
}

// File upload interface
export interface FileUploadInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// Error interfaces
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: ValidationError[];
}

// Database transaction type
export type DatabaseTransaction = any; // Will be properly typed based on Sequelize

// Environment variables interface
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  RABBITMQ_URL: string;
}