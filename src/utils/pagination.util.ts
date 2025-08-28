import { PaginationQuery, PaginationOptions } from '../types/common.types';

export class PaginationUtil {
  /**
   * Parse pagination parameters from query string
   */
  static parsePaginationQuery(query: PaginationQuery): PaginationOptions {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      offset
    };
  }

  /**
   * Generate pagination metadata
   */
  static generateMeta(
    total: number,
    page: number,
    limit: number
  ) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page: number, limit: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (page < 1) {
      errors.push('Page must be greater than 0');
    }

    if (limit < 1) {
      errors.push('Limit must be greater than 0');
    }

    if (limit > 100) {
      errors.push('Limit cannot exceed 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create Sequelize pagination options
   */
  static getSequelizePagination(options: PaginationOptions) {
    return {
      limit: options.limit,
      offset: options.offset
    };
  }

  /**
   * Parse sort options from query
   */
  static parseSortOptions(
    sortBy?: string,
    order?: 'ASC' | 'DESC',
    allowedFields: string[] = []
  ) {
    if (!sortBy || !allowedFields.includes(sortBy)) {
      return [['created_at', 'DESC']];
    }

    const direction = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return [[sortBy, direction]];
  }

  /**
   * Build search conditions for Sequelize
   */
  static buildSearchConditions(
    search: string,
    searchFields: string[]
  ) {
    if (!search || !searchFields.length) {
      return {};
    }

    const { Op } = require('sequelize');
    const searchConditions = searchFields.map(field => ({
      [field]: {
        [Op.iLike]: `%${search}%`
      }
    }));

    return {
      [Op.or]: searchConditions
    };
  }
}