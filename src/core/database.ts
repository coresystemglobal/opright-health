import dotenv from 'dotenv';
dotenv.config();
import { Sequelize } from 'sequelize-typescript';
import { models, Patient } from '../models';

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectModule: require('pg'),
      models,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
        connectionTimeout: 30000
      },
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      logging: false
    })
  : new Sequelize({
      dialect: 'postgres',
      dialectModule: require('pg'),
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'your_database',
      models,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
        connectionTimeout: 30000
      },
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      logging: false
    });

// The @BeforeCreate decorator's hook metadata is not reliably installed for the
// Patient model (the hook silently never ran). Also, generateMRN must run as
// a beforeValidate hook: Sequelize validates (mrn NOT NULL) BEFORE beforeCreate
// hooks run, so a beforeCreate MRN generator can never satisfy validation.
// Register explicitly once the model is initialized.
Patient.addHook('beforeValidate', Patient.generateMRN);

export default sequelize;
