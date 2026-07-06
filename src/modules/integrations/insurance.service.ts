import axios from 'axios';

interface InsuranceVerificationRequest {
  patientId: string;
  insuranceId: string;
  groupNumber?: string;
  dateOfBirth: string;
  serviceDate: string;
  serviceType: string;
}

interface InsuranceVerificationResponse {
  isActive: boolean;
  eligibilityStatus: 'active' | 'inactive' | 'terminated' | 'unknown';
  coverageDetails: {
    deductible?: number;
    copay?: number;
    coinsurance?: number;
    outOfPocketMax?: number;
  };
  benefits: Array<{
    serviceType: string;
    covered: boolean;
    authorizationRequired: boolean;
    limitations?: string;
  }>;
  effectiveDate?: string;
  terminationDate?: string;
  errors?: string[];
}

export class InsuranceService {
  private static readonly CLEARINGHOUSE_URL = process.env.INSURANCE_CLEARINGHOUSE_URL || 'https://api.clearinghouse.com';
  private static readonly API_KEY = process.env.INSURANCE_API_KEY || '';

  static async verifyInsurance(request: InsuranceVerificationRequest): Promise<InsuranceVerificationResponse> {
    try {
      const response = await axios.post(
        `${this.CLEARINGHOUSE_URL}/eligibility/verify`,
        {
          subscriber: {
            memberId: request.insuranceId,
            groupNumber: request.groupNumber,
            dateOfBirth: request.dateOfBirth
          },
          provider: {
            npi: process.env.PROVIDER_NPI || '1234567890'
          },
          service: {
            date: request.serviceDate,
            type: request.serviceType
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return this.parseVerificationResponse(response.data);
    } catch (error: any) {
      console.error('Insurance verification failed:', error);
      return {
        isActive: false,
        eligibilityStatus: 'unknown',
        coverageDetails: {},
        benefits: [],
        errors: [error.message]
      };
    }
  }

  private static parseVerificationResponse(data: any): InsuranceVerificationResponse {
    return {
      isActive: data.eligibility?.active || false,
      eligibilityStatus: data.eligibility?.status || 'unknown',
      coverageDetails: {
        deductible: data.benefits?.deductible?.amount,
        copay: data.benefits?.copay?.amount,
        coinsurance: data.benefits?.coinsurance?.percentage,
        outOfPocketMax: data.benefits?.outOfPocketMax?.amount
      },
      benefits: data.benefits?.services?.map((service: any) => ({
        serviceType: service.type,
        covered: service.covered,
        authorizationRequired: service.authRequired,
        limitations: service.limitations
      })) || [],
      effectiveDate: data.coverage?.effectiveDate,
      terminationDate: data.coverage?.terminationDate,
      errors: data.errors
    };
  }

  static async checkPreAuthorization(
    patientId: string,
    serviceCode: string,
    insuranceId: string
  ): Promise<{ required: boolean; status?: string; authNumber?: string }> {
    try {
      const response = await axios.post(
        `${this.CLEARINGHOUSE_URL}/authorization/check`,
        {
          patientId,
          serviceCode,
          insuranceId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        required: (response.data as any).authRequired,
        status: (response.data as any).status,
        authNumber: (response.data as any).authorizationNumber
      };
    } catch (error) {
      return { required: true }; // Default to requiring auth if check fails
    }
  }

  static async submitClaim(claimData: any): Promise<{ success: boolean; claimId?: string; errors?: string[] }> {
    try {
      const response = await axios.post(
        `${this.CLEARINGHOUSE_URL}/claims/submit`,
        claimData,
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        claimId: (response.data as any).claimId
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
}