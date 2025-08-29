export class ValidationUtil {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phone: string): boolean {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Check if it's between 10-15 digits
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate MRN format
   */
  static isValidMRN(mrn: string): boolean {
    // MRN should start with PAT followed by 9 digits
    const mrnRegex = /^PAT\d{9}$/;
    return mrnRegex.test(mrn);
  }

  /**
   * Validate license number format
   */
  static isValidLicenseNumber(licenseNumber: string): boolean {
    // License number should be alphanumeric and between 6-20 characters
    const licenseRegex = /^[A-Z0-9]{6,20}$/;
    return licenseRegex.test(licenseNumber.toUpperCase());
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  static isValidDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }

    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  }

  /**
   * Validate time format (HH:MM or HH:MM:SS)
   */
  static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    return timeRegex.test(time);
  }

  /**
   * Validate consultation fee
   */
  static isValidConsultationFee(fee: number): boolean {
    return fee >= 0 && fee <= 10000; // Between 0 and 10,000
  }

  /**
   * Validate experience years
   */
  static isValidExperienceYears(years: number): boolean {
    return years >= 0 && years <= 60;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate name format
   */
  static isValidName(name: string): boolean {
    // Name should contain only letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    return nameRegex.test(name) && name.trim().length >= 2;
  }

  /**
   * Validate postal code
   */
  static isValidPostalCode(postalCode: string): boolean {
    // Basic postal code validation (can be customized per country)
    const postalRegex = /^[A-Z0-9\s\-]{3,10}$/i;
    return postalRegex.test(postalCode);
  }

  /**
   * Validate invoice number format
   */
  static isValidInvoiceNumber(invoiceNumber: string): boolean {
    // Invoice number format: INV-YYYYMM-XXXXXX
    const invoiceRegex = /^INV-\d{6}-\d{6}$/;
    return invoiceRegex.test(invoiceNumber);
  }

  /**
   * Validate payment amount
   */
  static isValidPaymentAmount(amount: number): boolean {
    return amount > 0 && amount <= 1000000; // Between 0 and 1,000,000
  }

  /**
   * Validate tax rate
   */
  static isValidTaxRate(rate: number): boolean {
    return rate >= 0 && rate <= 1; // Between 0% and 100%
  }

  /**
   * Validate appointment duration
   */
  static isValidAppointmentDuration(minutes: number): boolean {
    return minutes >= 15 && minutes <= 480; // Between 15 minutes and 8 hours
  }

  /**
   * Clean and validate input object
   */
  static cleanObject(obj: any): any {
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'string') {
          cleaned[key] = this.sanitizeString(value);
        } else {
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }

  /**
   * Validate required fields
   */
  static validateRequiredFields(obj: any, requiredFields: string[]): string[] {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
        missingFields.push(field);
      }
    }
    
    return missingFields;
  }

  /**
   * Validate enum value
   */
  static isValidEnumValue<T>(value: any, enumObject: T): boolean {
    return Object.values(enumObject as any).includes(value);
  }
}