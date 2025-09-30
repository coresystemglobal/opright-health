# Multi-Tenant File Upload Implementation

## ✅ Features Implemented

### 1. File Upload Service (Backblaze B2)
- **S3-compatible SDK** using AWS SDK with Backblaze B2
- **Tenant-based file organization** with folder structure: `tenants/{tenant_id}/{folder}/{filename}`
- **File validation** with type and size restrictions
- **Secure file operations** with signed URLs for access

### 2. Multi-Tenancy Architecture
- **Hospitals as Tenants** - Each hospital is a separate tenant
- **Data Isolation** - All data scoped by tenant_id
- **Tenant Middleware** - Automatic tenant validation and injection
- **Tenant-aware Models** - User, Patient, and File models include tenant relationships

### 3. Database Models
- **Tenant Model** - Hospital information with status management
- **File Model** - File metadata with tenant association
- **Updated Models** - User and Patient models with tenant_id foreign keys

### 4. API Endpoints

#### File Operations
```
POST /api/files/upload - Upload file (with tenant isolation)
GET /api/files - Get tenant files
DELETE /api/files/:id - Delete tenant file
```

#### Usage Example
```typescript
// Upload file with tenant context
const formData = new FormData();
formData.append('file', file);
formData.append('file_type', 'document');
formData.append('folder', 'reports');

fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'X-Tenant-ID': 'hospital-uuid'
  },
  body: formData
});
```

### 5. Service Integration
The file upload service can be used from anywhere in the application:

```typescript
import { fileUploadService } from '../services/file-upload.service';

// Upload file
const result = await fileUploadService.uploadFile(file, {
  tenantId: 'hospital-uuid',
  folder: 'prescriptions',
  allowedTypes: ['image/jpeg', 'application/pdf'],
  maxSize: 5 * 1024 * 1024 // 5MB
});

// Delete file
await fileUploadService.deleteFile(result.key);

// Get signed URL for secure access
const signedUrl = await fileUploadService.getSignedUrl(result.key, 3600);
```

### 6. Environment Configuration
```env
# Backblaze B2 Configuration
B2_ENDPOINT=https://s3.us-west-000.backblazeb2.com
B2_ACCESS_KEY_ID=your_b2_access_key_id
B2_SECRET_ACCESS_KEY=your_b2_secret_access_key
B2_BUCKET_NAME=your_bucket_name
B2_REGION=us-west-000
```

### 7. Database Migrations
- `20241201000005-create-tenants-table.js` - Tenants table
- `20241201000006-create-files-table.js` - Files table
- `20241201000007-add-tenant-id-to-users.js` - User tenant relationship
- `20241201000008-add-tenant-id-to-patients.js` - Patient tenant relationship

### 8. Security Features
- **Tenant Isolation** - Files are organized by tenant
- **Access Control** - Only tenant users can access their files
- **File Validation** - Type and size restrictions
- **Signed URLs** - Secure file access with expiration

### 9. File Types Supported
- `image` - Images (JPEG, PNG)
- `document` - General documents (PDF, TXT)
- `report` - Medical reports
- `prescription` - Prescription documents
- `lab_result` - Laboratory results

## 🚀 Usage in Application

### From Controllers
```typescript
import { fileUploadService } from '../services/file-upload.service';

// In any controller
const uploadResult = await fileUploadService.uploadFile(file, {
  tenantId: req.tenant.id,
  folder: 'patient-documents'
});
```

### From Services
```typescript
// In patient service, appointment service, etc.
const fileUrl = await fileUploadService.uploadFile(reportFile, {
  tenantId: patientTenantId,
  folder: 'lab-reports',
  allowedTypes: ['application/pdf']
});
```

## 🏥 Multi-Tenancy Benefits

1. **Data Isolation** - Each hospital's data is completely separate
2. **Scalability** - Easy to add new hospitals as tenants
3. **Security** - Tenant-level access control
4. **Customization** - Per-tenant configurations possible
5. **Billing** - Easy to track usage per hospital

## 📁 File Organization Structure
```
bucket/
├── tenants/
│   ├── hospital-1-uuid/
│   │   ├── general/
│   │   ├── reports/
│   │   ├── prescriptions/
│   │   └── lab-results/
│   └── hospital-2-uuid/
│       ├── general/
│       └── patient-documents/
```

The implementation provides a complete multi-tenant file upload system that can be easily integrated throughout the hospital management application.