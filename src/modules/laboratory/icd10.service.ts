import { ICD10Code } from '@modules/laboratory/icd10-code.model';

import { Op } from 'sequelize';

export interface ICD10SearchResult {
  id: string;
  code: string;
  description: string;
  category?: string;
  is_billable: boolean;
  display_text: string;
}

export interface ICD10ValidationResult {
  valid: boolean;
  code?: string;
  description?: string;
  is_billable?: boolean;
  error?: string;
}

export class ICD10Service {
  /**
   * Search for ICD-10 codes by query string
   * Searches both code and description fields
   */
  static async searchCodes(query: string, limit: number = 20): Promise<ICD10SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const codes = await ICD10Code.searchCodes(query, limit);
    
    return codes.map(code => ({
      id: code.id,
      code: code.code,
      description: code.description,
      category: code.category,
      is_billable: code.is_billable,
      display_text: code.display_text
    }));
  }

  /**
   * Find a specific ICD-10 code
   */
  static async findByCode(code: string): Promise<ICD10SearchResult | null> {
    const icd10 = await ICD10Code.findByCode(code);
    
    if (!icd10) {
      return null;
    }

    return {
      id: icd10.id,
      code: icd10.code,
      description: icd10.description,
      category: icd10.category,
      is_billable: icd10.is_billable,
      display_text: icd10.display_text
    };
  }

  /**
   * Get codes by category
   */
  static async findByCategory(category: string): Promise<ICD10SearchResult[]> {
    const codes = await ICD10Code.findByCategory(category);
    
    return codes.map(code => ({
      id: code.id,
      code: code.code,
      description: code.description,
      category: code.category,
      is_billable: code.is_billable,
      display_text: code.display_text
    }));
  }

  /**
   * Get common diagnosis codes
   */
  static async getCommonDiagnoses(limit: number = 50): Promise<ICD10SearchResult[]> {
    const codes = await ICD10Code.getCommonDiagnoses(limit);
    
    return codes.map(code => ({
      id: code.id,
      code: code.code,
      description: code.description,
      category: code.category,
      is_billable: code.is_billable,
      display_text: code.display_text
    }));
  }

  /**
   * Validate an ICD-10 code
   */
  static async validateCode(code: string): Promise<ICD10ValidationResult> {
    if (!code || code.trim().length === 0) {
      return {
        valid: false,
        error: 'Code cannot be empty'
      };
    }

    const normalizedCode = code.trim().toUpperCase();
    const icd10 = await ICD10Code.findByCode(normalizedCode);

    if (!icd10) {
      return {
        valid: false,
        code: normalizedCode,
        error: 'Code not found in ICD-10 database'
      };
    }

    return {
      valid: true,
      code: icd10.code,
      description: icd10.description,
      is_billable: icd10.is_billable
    };
  }

  /**
   * Validate multiple ICD-10 codes
   */
  static async validateCodes(codes: string[]): Promise<Map<string, ICD10ValidationResult>> {
    const results = new Map<string, ICD10ValidationResult>();

    for (const code of codes) {
      const result = await this.validateCode(code);
      results.set(code, result);
    }

    return results;
  }

  /**
   * Get all categories
   */
  static async getCategories(): Promise<string[]> {
    const codes = await ICD10Code.findAll({
      attributes: ['category'],
      where: {
        category: { [Op.ne]: null },
        is_active: true
      },
      group: ['category'],
      order: [['category', 'ASC']]
    });

    return codes
      .map(c => c.category)
      .filter((cat): cat is string => cat !== null && cat !== undefined);
  }

  /**
   * Get all chapters
   */
  static async getChapters(): Promise<string[]> {
    const codes = await ICD10Code.findAll({
      attributes: ['chapter'],
      where: {
        chapter: { [Op.ne]: null },
        is_active: true
      },
      group: ['chapter'],
      order: [['chapter', 'ASC']]
    });

    return codes
      .map(c => c.chapter)
      .filter((chap): chap is string => chap !== null && chap !== undefined);
  }

  /**
   * Seed common ICD-10 codes
   * This should be called during initial setup
   */
  static async seedCommonCodes(): Promise<number> {
    const commonCodes = [
      // Diabetes
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine', chapter: 'Endocrine, nutritional and metabolic diseases', is_billable: true },
      { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', category: 'Endocrine', chapter: 'Endocrine, nutritional and metabolic diseases', is_billable: true },
      { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', category: 'Endocrine', chapter: 'Endocrine, nutritional and metabolic diseases', is_billable: true },
      
      // Hypertension
      { code: 'I10', description: 'Essential (primary) hypertension', category: 'Circulatory', chapter: 'Diseases of the circulatory system', is_billable: true },
      { code: 'I11.9', description: 'Hypertensive heart disease without heart failure', category: 'Circulatory', chapter: 'Diseases of the circulatory system', is_billable: true },
      
      // Respiratory
      { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory', chapter: 'Diseases of the respiratory system', is_billable: true },
      { code: 'J45.9', description: 'Asthma, unspecified', category: 'Respiratory', chapter: 'Diseases of the respiratory system', is_billable: true },
      { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified', category: 'Respiratory', chapter: 'Diseases of the respiratory system', is_billable: true },
      
      // Musculoskeletal
      { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal', chapter: 'Diseases of the musculoskeletal system', is_billable: true },
      { code: 'M25.50', description: 'Pain in unspecified joint', category: 'Musculoskeletal', chapter: 'Diseases of the musculoskeletal system', is_billable: true },
      
      // Symptoms and signs
      { code: 'R51', description: 'Headache', category: 'Symptoms', chapter: 'Symptoms, signs and abnormal findings', is_billable: true },
      { code: 'R10.9', description: 'Unspecified abdominal pain', category: 'Symptoms', chapter: 'Symptoms, signs and abnormal findings', is_billable: true },
      { code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms', chapter: 'Symptoms, signs and abnormal findings', is_billable: true },
      
      // Digestive
      { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis', category: 'Digestive', chapter: 'Diseases of the digestive system', is_billable: true },
      
      // Mental health
      { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'Mental', chapter: 'Mental, behavioral and neurodevelopmental disorders', is_billable: true },
      { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Mental', chapter: 'Mental, behavioral and neurodevelopmental disorders', is_billable: true },
      
      // Metabolic
      { code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'Endocrine', chapter: 'Endocrine, nutritional and metabolic diseases', is_billable: true },
      { code: 'E66.9', description: 'Obesity, unspecified', category: 'Endocrine', chapter: 'Endocrine, nutritional and metabolic diseases', is_billable: true },
      
      // Genitourinary
      { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Genitourinary', chapter: 'Diseases of the genitourinary system', is_billable: true },
      
      // Cardiovascular
      { code: 'I50.9', description: 'Heart failure, unspecified', category: 'Circulatory', chapter: 'Diseases of the circulatory system', is_billable: true },
      { code: 'I48.91', description: 'Unspecified atrial fibrillation', category: 'Circulatory', chapter: 'Diseases of the circulatory system', is_billable: true },
      
      // Renal
      { code: 'N18.9', description: 'Chronic kidney disease, unspecified', category: 'Genitourinary', chapter: 'Diseases of the genitourinary system', is_billable: true },
      
      // Infectious
      { code: 'B34.9', description: 'Viral infection, unspecified', category: 'Infectious', chapter: 'Certain infectious and parasitic diseases', is_billable: true },
    ];

    let insertedCount = 0;

    for (const codeData of commonCodes) {
      const existing = await ICD10Code.findOne({ where: { code: codeData.code } });
      
      if (!existing) {
        await ICD10Code.create(codeData);
        insertedCount++;
      }
    }

    return insertedCount;
  }

  /**
   * Advanced search with filters
   */
  static async advancedSearch(options: {
    query?: string;
    category?: string;
    chapter?: string;
    billableOnly?: boolean;
    limit?: number;
  }): Promise<ICD10SearchResult[]> {
    const where: any = { is_active: true };
    const { query, category, chapter, billableOnly, limit = 20 } = options;

    if (billableOnly) {
      where.is_billable = true;
    }

    if (category) {
      where.category = category;
    }

    if (chapter) {
      where.chapter = chapter;
    }

    if (query && query.trim().length >= 2) {
      const searchTerm = query.trim().toUpperCase();
      where[Op.or] = [
        { code: { [Op.iLike]: `${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    const codes = await ICD10Code.findAll({
      where,
      limit,
      order: [['code', 'ASC']]
    });

    return codes.map(code => ({
      id: code.id,
      code: code.code,
      description: code.description,
      category: code.category,
      is_billable: code.is_billable,
      display_text: code.display_text
    }));
  }
}
