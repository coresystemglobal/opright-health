# Joi Validator Implementation

This validator implementation addresses the NoSQL injection vulnerabilities found in the security audit by providing comprehensive input validation and sanitization.

## Features

- **Input Validation**: Validates all user inputs using Joi schemas
- **NoSQL Injection Prevention**: Sanitizes inputs to prevent injection attacks
- **Type Safety**: Ensures data types match expected formats
- **Comprehensive Coverage**: Covers all major entities (users, patients, appointments, payments, invoices)

## Usage

### 1. Route-Level Validation

```typescript
import { validate, validateQuery, validateParams, userValidation } from '../utils/validator';

// Body validation
router.post('/users', 
  validate(userValidation.register),
  userController.register
);

// Query parameter validation
router.get('/users', 
  validateQuery(genericValidation.pagination),
  userController.getAll
);

// URL parameter validation
router.get('/users/:id', 
  validateParams(genericValidation.id),
  userController.getById
);
```

### 2. Service-Level Validation

```typescript
import { patientValidation, sanitizeInput } from '../utils/validator';

export class PatientService {
  static async search(params: any) {
    // Validate input
    const { error, value } = patientValidation.search.validate(params);
    if (error) throw new Error(error.message);
    
    // Sanitize validated input
    const sanitized = sanitizeInput(value);
    
    // Use sanitized input safely
    return await Patient.findAll({ where: sanitized });
  }
}
```

## Available Validation Schemas

### User Validation
- `userValidation.register` - User registration
- `userValidation.login` - User login
- `userValidation.update` - User profile update
- `userValidation.changePassword` - Password change
- `userValidation.resetPassword` - Password reset

### Patient Validation
- `patientValidation.create` - Create patient
- `patientValidation.update` - Update patient
- `patientValidation.search` - Search patients

### Appointment Validation
- `appointmentValidation.create` - Create appointment
- `appointmentValidation.update` - Update appointment
- `appointmentValidation.search` - Search appointments

### Payment Validation
- `paymentValidation.initiate` - Initiate payment
- `paymentValidation.verify` - Verify payment
- `paymentValidation.refund` - Process refund

### Invoice Validation
- `invoiceValidation.create` - Create invoice
- `invoiceValidation.update` - Update invoice
- `invoiceValidation.search` - Search invoices

### Report Validation
- `reportValidation.dateRange` - Date range reports
- `reportValidation.revenue` - Revenue reports
- `reportValidation.appointments` - Appointment reports

### Generic Validation
- `genericValidation.id` - UUID validation
- `genericValidation.pagination` - Pagination parameters
- `genericValidation.search` - Generic search

## Security Features

### 1. Input Sanitization
```typescript
import { sanitizeInput } from '../utils/validator';

const cleanData = sanitizeInput(userInput); // Removes dangerous characters
```

### 2. Type Validation
- UUIDs must match UUID format
- Emails must be valid email addresses
- Phone numbers must match phone patterns
- Dates must be valid ISO dates
- Amounts must be positive numbers

### 3. Length Limits
- Names: 2-100 characters
- Passwords: 8-128 characters with complexity requirements
- Text fields: Maximum 1000 characters
- Long text: Maximum 5000 characters

### 4. Enum Validation
All enum values are validated against predefined lists:
- User roles: patient, admin, staff, doctor
- Appointment statuses: scheduled, confirmed, completed, etc.
- Payment providers: stripe, paystack, flutterwave

## Implementation Steps

1. **Install the validator** (already done - Joi is in package.json)

2. **Import validation middleware in routes**:
```typescript
import { validate, validateQuery, validateParams } from '../utils/validator';
```

3. **Apply validation to routes**:
```typescript
router.post('/endpoint', validate(schema), controller.method);
```

4. **Use sanitization in services**:
```typescript
const sanitized = sanitizeInput(userInput);
```

## Error Handling

Validation errors return structured responses:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

## Benefits

1. **Security**: Prevents NoSQL injection attacks
2. **Data Integrity**: Ensures data quality and consistency
3. **Developer Experience**: Clear error messages and type safety
4. **Performance**: Early validation prevents unnecessary database queries
5. **Maintainability**: Centralized validation logic

## Next Steps

1. Apply validation middleware to all remaining routes
2. Update service methods to use sanitization
3. Add custom validation rules as needed
4. Consider adding rate limiting for additional security