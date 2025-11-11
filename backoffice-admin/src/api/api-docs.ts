import { http } from './http';

export interface ApiDocPayload {
  title: string;
  version: string;
  summary: string;
  content: string;
}

export interface ApiDocResponse extends ApiDocPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ApiDocListResponse {
  data: ApiDocResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export const getApiDocs = async (
  params: ApiDocListParams,
): Promise<ApiDocListResponse> => {
  const response = await http.get<ApiDocListResponse>('/api-docs', {
    params,
  });
  return response.data;
};

export const getApiDoc = async (id: string): Promise<ApiDocResponse> => {
  const response = await http.get<ApiDocResponse>(`/api-docs/${id}`);
  return response.data;
};

export const createApiDoc = async (
  payload: ApiDocPayload,
): Promise<ApiDocResponse> => {
  const response = await http.post<ApiDocResponse>('/api-docs', payload);
  return response.data;
};

export const updateApiDoc = async (
  id: string,
  payload: ApiDocPayload,
): Promise<ApiDocResponse> => {
  const response = await http.put<ApiDocResponse>(`/api-docs/${id}`, payload);
  return response.data;
};

export const deleteApiDoc = async (id: string): Promise<void> => {
  await http.delete(`/api-docs/${id}`);
};
