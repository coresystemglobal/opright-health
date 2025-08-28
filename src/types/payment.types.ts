export interface PaymentInitiationData {
  amount: number;
  email: string;
  currency: string;
  paymentProvider: string;
  paymentMethod: string;
  patient_id: string;
  appointment_id: string;
}

export interface PaymentVerificationData {
  reference: string;
}

export interface PaymentResponse {
  statusCode: number;
  status: string;
  message: string;
  data: any;
}

export interface PaymentRequestData {
  amount: number;
  email: string;
  currency: string;
  payment_provider: string;
  payment_method: string;
}

export interface AllPaymentsResponse {
  statusCode: number;
  status: string;
  message: string;
  data: any;
}

export interface FetchPaymentsRequestData {
  pageNumber: number;
  limitNumber: number;
}