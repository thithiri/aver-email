import axios from 'axios';

export interface ProcessDataRequest {
  payload: {
    message: string;
    regexes: Array<{
      regex: string;
      field: string;
    }>;
    templateBlobId: string;
  };
}

export interface ProcessedDataResponse {
  response: {
    intent: number;
    timestamp_ms: number;
    data: {
      dkim_signatures: {
        total_count: number;
        verified_count: number;
        failed_count: number;
      };
      regex_validations: Array<{
        field: string;
        regex: string;
        matched: boolean;
        matched_text?: string;
      }>;
    };
  };
  signature: string;
}

export async function processData(
  apiUrl: string,
  request: ProcessDataRequest
): Promise<ProcessedDataResponse> {
  const url = `${apiUrl}/process_data`;
  console.log('POST request to:', url);
  console.log('Request payload:', {
    ...request,
    payload: {
      ...request.payload,
      message: `${request.payload.message.substring(0, 50)}... (${request.payload.message.length} chars)`,
    },
  });
  
  const response = await axios.post<ProcessedDataResponse>(
    url,
    request,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    }
  );
  
  console.log('Response status:', response.status);
  
  if (response.status >= 400) {
    const errorData = response.data as any;
    const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage);
    (error as any).response = response;
    throw error;
  }
  
  return response.data;
}

export interface SendInviteRequest {
  email: string;
  party_type: 'main party' | 'after party';
}

export interface SendInviteResponse {
  success: boolean;
  message: string;
  secret_code?: string;
}

export async function sendInvite(
  apiUrl: string,
  request: SendInviteRequest
): Promise<SendInviteResponse> {
  // Call Next.js API route instead of Rust backend
  const url = '/api/send_invite';
  console.log('POST request to:', url);
  console.log('Request payload:', request);
  
  const response = await axios.post<SendInviteResponse>(
    url,
    request,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    }
  );
  
  console.log('Response status:', response.status);
  
  if (response.status >= 400) {
    const errorData = response.data as any;
    const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage);
    (error as any).response = response;
    throw error;
  }
  
  return response.data;
}

