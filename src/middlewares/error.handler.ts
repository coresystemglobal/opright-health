import yup from 'yup';

interface ErrorResponse {
  statusCode: number;
  status: string;
  message: string;
  data: {
    errors?: string[];
    error?: string;
  } | null;
}

export const handleError = (error: unknown): ErrorResponse => {
  if (error instanceof yup.ValidationError) {
    return {
      statusCode: 400,
      status: 'error',
      message: 'Validation failed',
      data: {
        errors: (error as yup.ValidationError).errors
      }
    };
  }
  
  return {
    statusCode: 500,
    status: 'error',
    message: 'Internal server error',
    data: {
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  };
};
