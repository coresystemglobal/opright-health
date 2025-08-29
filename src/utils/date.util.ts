// Using native JavaScript Date methods instead of date-fns

export class DateUtil {
  /**
   * Format date to ISO string
   */
  static toISOString(date: Date | string): string {
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        throw new Error('Invalid date string');
      }
      return parsed.toISOString();
    }
    return date.toISOString();
  }

  /**
   * Format date for display
   */
  static formatForDisplay(date: Date | string, formatString: string = 'yyyy-MM-dd'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }
    
    if (formatString === 'yyyy-MM-dd') {
      return dateObj.toISOString().split('T')[0];
    }
    
    // Basic format support
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Get start of day
   */
  static getStartOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
  }

  /**
   * Get end of day
   */
  static getEndOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    dateObj.setHours(23, 59, 59, 999);
    return dateObj;
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj < new Date();
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return this.formatForDisplay(dateObj) === this.formatForDisplay(today);
  }

  /**
   * Calculate age from date of birth
   */
  static calculateAge(dateOfBirth: Date | string): number {
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Add days to a date
   */
  static addDays(date: Date | string, days: number): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    dateObj.setDate(dateObj.getDate() + days);
    return dateObj;
  }

  /**
   * Subtract days from a date
   */
  static subtractDays(date: Date | string, days: number): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    dateObj.setDate(dateObj.getDate() - days);
    return dateObj;
  }

  /**
   * Validate date string
   */
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Get date range for queries
   */
  static getDateRange(startDate: string, endDate: string) {
    const start = this.getStartOfDay(startDate);
    const end = this.getEndOfDay(endDate);
    
    return {
      start,
      end
    };
  }

  /**
   * Format time string
   */
  static formatTime(time: string): string {
    // Ensure time is in HH:mm:ss format
    const timeParts = time.split(':');
    if (timeParts.length === 2) {
      return `${time}:00`;
    }
    return time;
  }

  /**
   * Check if time is within range
   */
  static isTimeWithinRange(time: string, startTime: string, endTime: string): boolean {
    return time >= startTime && time <= endTime;
  }

  /**
   * Generate time slots
   */
  static generateTimeSlots(
    startTime: string,
    endTime: string,
    intervalMinutes: number = 30
  ): string[] {
    const slots: string[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;
      slots.push(timeSlot);
      
      currentMinute += intervalMinutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }
    
    return slots;
  }

  /**
   * Get current timestamp
   */
  static getCurrentTimestamp(): Date {
    return new Date();
  }

  /**
   * Convert timezone
   */
  static convertToTimezone(date: Date | string, timezone: string = 'UTC'): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // For now, returning the date as-is. In production, use a proper timezone library
    return dateObj;
  }
}