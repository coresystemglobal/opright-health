import express from 'express';
import multer from 'multer';
import { FileController } from './file.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';

const fileRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload file
fileRouter.post('/upload', 
  tenantMiddleware,
  authentication, 
  upload.single('file'), 
  FileController.uploadFile
);

// Get files
fileRouter.get('/', 
  tenantMiddleware,
  authentication, 
  FileController.getFiles
);

// Delete file
fileRouter.delete('/:id', 
  tenantMiddleware,
  authentication, 
  FileController.deleteFile
);

export default fileRouter;