import { http, uploadClient } from './http';

export interface CatalogDefinition {
  key: string;
  label: string;
}

export interface CatalogListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CatalogListResponse<T = Record<string, unknown>> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export const getCatalogDefinitions = async (): Promise<CatalogDefinition[]> => {
  const { data } = await http.get<CatalogDefinition[]>('/catalogs');
  return data;
};

export const getCatalogEntries = async <T extends Record<string, unknown>>(
  catalogKey: string,
  params: CatalogListParams,
): Promise<CatalogListResponse<T>> => {
  const { data } = await http.get<CatalogListResponse<T>>(
    `/catalogs/${catalogKey}`,
    {
      params,
    },
  );
  return data;
};

export const getCatalogEntry = async <T extends Record<string, unknown>>(
  catalogKey: string,
  id: string,
): Promise<T> => {
  const { data } = await http.get<T>(`/catalogs/${catalogKey}/${id}`);
  return data;
};

export const createCatalogEntry = async (
  catalogKey: string,
  payload: Record<string, unknown>,
) => {
  const { data } = await http.post(`/catalogs/${catalogKey}`, payload);
  return data;
};

export const updateCatalogEntry = async (
  catalogKey: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  const { data } = await http.put(`/catalogs/${catalogKey}/${id}`, payload);
  return data;
};

export const deleteCatalogEntry = async (catalogKey: string, id: string) => {
  await http.delete(`/catalogs/${catalogKey}/${id}`);
};

export const importCatalogEntries = async (
  catalogKey: string,
  file: File,
  mode: 'append' | 'replace',
) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  const { data } = await uploadClient.post(
    `/catalogs/${catalogKey}/import`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return data;
};
