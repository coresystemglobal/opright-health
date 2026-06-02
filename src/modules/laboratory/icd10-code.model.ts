import { 
  Table, 
  Column, 
  Model, 
  DataType,
  Index
} from 'sequelize-typescript';
import { Op } from 'sequelize';

@Table({
  tableName: 'icd10_codes',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['code']
    },
    {
      fields: ['category']
    },
    {
      fields: ['is_billable']
    }
  ]
})
export class ICD10Code extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  override id!: string;

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    unique: true
  })
  code!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  description!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  category?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  chapter?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_billable!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true
  })
  is_active!: boolean;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    comment: 'Parent code for hierarchy'
  })
  parent_code?: string;

  @Column({
    type: DataType.TSVECTOR,
    allowNull: true,
    comment: 'Full-text search vector'
  })
  search_vector?: any;

  // Static methods for searching
  static async searchCodes(query: string, limit: number = 20): Promise<ICD10Code[]> {
    const searchTerm = query.trim().toUpperCase();
    
    return this.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { code: { [Op.iLike]: `${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      limit,
      order: [
        ['code', 'ASC']
      ]
    });
  }

  static async findByCode(code: string): Promise<ICD10Code | null> {
    return this.findOne({
      where: { 
        code: code.toUpperCase(),
        is_active: true 
      }
    });
  }

  static async findByCategory(category: string): Promise<ICD10Code[]> {
    return this.findAll({
      where: { 
        category,
        is_active: true 
      },
      order: [['code', 'ASC']]
    });
  }

  static async getCommonDiagnoses(limit: number = 50): Promise<ICD10Code[]> {
    // Return most commonly used diagnosis codes
    // This would need usage tracking in production
    const commonCodes = [
      'E11.9',  // Type 2 diabetes without complications
      'I10',    // Essential hypertension
      'J06.9',  // Upper respiratory infection
      'M54.5',  // Low back pain
      'R51',    // Headache
      'K21.9',  // Gastro-esophageal reflux disease
      'F41.1',  // Generalized anxiety disorder
      'E78.5',  // Hyperlipidemia
      'J45.9',  // Asthma
      'N39.0'   // Urinary tract infection
    ];

    return this.findAll({
      where: {
        code: { [Op.in]: commonCodes },
        is_active: true
      },
      limit
    });
  }

  static async validateCode(code: string): Promise<boolean> {
    const result = await this.findByCode(code);
    return result !== null;
  }

  // Virtual fields
  get display_text(): string {
    return `${this.code} - ${this.description}`;
  }

  get is_parent(): boolean {
    return this.code.length <= 3;
  }
}
