// Laboratory-specific type definitions for the hospital management system

export enum TestCategory {
  BLOOD_TEST = 'blood_test',
  URINE_TEST = 'urine_test',
  STOOL_TEST = 'stool_test',
  IMAGING = 'imaging',
  PATHOLOGY = 'pathology',
  MICROBIOLOGY = 'microbiology',
  BIOCHEMISTRY = 'biochemistry',
  HEMATOLOGY = 'hematology',
  IMMUNOLOGY = 'immunology',
  MOLECULAR = 'molecular',
  CYTOLOGY = 'cytology',
  HISTOPATHOLOGY = 'histopathology'
}

export enum SpecimenType {
  BLOOD = 'blood',
  SERUM = 'serum',
  PLASMA = 'plasma',
  URINE = 'urine',
  STOOL = 'stool',
  SPUTUM = 'sputum',
  TISSUE = 'tissue',
  SWAB = 'swab',
  FLUID = 'fluid',
  BIOPSY = 'biopsy'
}

export enum TestOrderStatus {
  ORDERED = 'ordered',
  SPECIMEN_COLLECTED = 'specimen_collected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PENDING_REVIEW = 'pending_review',
  REVIEWED = 'reviewed',
  CRITICAL_ALERT = 'critical_alert'
}

export enum TestUrgency {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  STAT = 'stat',
  EMERGENCY = 'emergency'
}

export enum TestResultStatus {
  NORMAL = 'normal',
  ABNORMAL = 'abnormal',
  CRITICAL = 'critical',
  INCONCLUSIVE = 'inconclusive',
  PENDING = 'pending'
}

// Interface for test reference ranges
export interface ReferenceRange {
  min_value?: number;
  max_value?: number;
  text_value?: string;
  age_group?: string;
  gender?: 'male' | 'female' | 'both';
  units: string;
  is_critical_low?: boolean;
  is_critical_high?: boolean;
}

// Interface for test results
export interface TestResult {
  parameter_name: string;
  value: string | number;
  units: string;
  reference_range: ReferenceRange;
  status: TestResultStatus;
  is_critical: boolean;
  notes?: string;
}

// Interface for lab test catalog
export interface LabTestCatalog {
  test_code: string;
  test_name: string;
  category: TestCategory;
  description?: string;
  specimen_type: SpecimenType;
  price: number;
  turnaround_time_hours: number;
  preparation_instructions?: string;
  fasting_required: boolean;
  special_requirements?: string;
  reference_ranges: ReferenceRange[];
  is_active: boolean;
}

// Interface for test order creation
export interface CreateTestOrderRequest {
  patient_id: string;
  doctor_id: string;
  test_ids: string[];
  urgency: TestUrgency;
  appointment_id?: string;
  clinical_notes?: string;
  special_instructions?: string;
}

// Interface for specimen collection
export interface SpecimenCollection {
  order_id: string;
  collected_by: string;
  collection_date: Date;
  collection_notes?: string;
  specimen_quality: 'good' | 'fair' | 'poor';
  rejection_reason?: string;
}

// Interface for test order update
export interface UpdateTestOrderRequest {
  status?: TestOrderStatus;
  results?: TestResult[];
  technician_notes?: string;
  reviewed_by?: string;
  critical_values_notified?: boolean;
}

// Interface for lab reporting
export interface LabReportRequest {
  patient_id: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  test_categories?: TestCategory[];
  include_normal_results?: boolean;
}

// Interface for quality control
export interface QualityControl {
  test_id: string;
  control_level: 'low' | 'normal' | 'high';
  expected_value: number;
  measured_value: number;
  units: string;
  is_within_range: boolean;
  performed_by: string;
  performed_at: Date;
}

// Interface for equipment management
export interface LabEquipment {
  equipment_id: string;
  name: string;
  model: string;
  serial_number: string;
  location: string;
  last_calibration: Date;
  next_calibration: Date;
  maintenance_schedule: string;
  is_operational: boolean;
}