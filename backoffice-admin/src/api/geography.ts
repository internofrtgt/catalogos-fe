import { http, uploadClient } from './http';
import type { CatalogListResponse, CatalogListParams } from './catalogs';

export interface Province {
  id: string;
  nombre: string;
  codigo: number;
  createdAt: string;
  updatedAt: string;
}

export interface Canton {
  id: string;
  provincia: string;
  codigoProvincia: number;
  canton: string;
  codigoCanton: string;
  createdAt: string;
  updatedAt: string;
}

export interface District {
  id: string;
  provinciaNombre: string;
  provinceCode: number;
  cantonNombre: string;
  cantonCode: number;
  nombre: string;
  codigo: number;
  createdAt: string;
  updatedAt: string;
}

export interface Barrio {
  id: string;
  provinciaNombre: string;
  provinceCode: number;
  cantonNombre: string;
  cantonCode: number;
  districtName: string;
  districtCode: number | null;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export const listProvinces = async (params: CatalogListParams) => {
  const { data } = await http.get<CatalogListResponse<Province>>(
    '/geography/provinces',
    { params },
  );
  return data;
};

export const createProvince = async (payload: {
  nombre: string;
  codigo: number;
}) => {
  const { data } = await http.post('/geography/provinces', payload);
  return data;
};

export const updateProvince = async (
  id: string,
  payload: { nombre?: string; codigo?: number },
) => {
  const { data } = await http.put(`/geography/provinces/${id}`, payload);
  return data;
};

export const deleteProvince = async (id: string) => {
  await http.delete(`/geography/provinces/${id}`);
};

export const importProvinces = async (file: File, mode: 'append' | 'replace') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  const { data } = await uploadClient.post(
    '/geography/provinces/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
};

export const listCantons = async (
  params: CatalogListParams & { provinceCode?: number },
) => {
  const { data } = await http.get<CatalogListResponse<Canton>>(
    '/geography/cantons',
    { params },
  );
  return data;
};

export const createCanton = async (payload: {
  provincia: string;
  codigoProvincia: number;
  canton: string;
  codigoCanton: string;
}) => {
  const { data } = await http.post('/geography/cantons', payload);
  return data;
};

export const updateCanton = async (
  id: string,
  payload: Partial<{
    provincia: string;
    codigoProvincia: number;
    canton: string;
    codigoCanton: string;
  }>,
) => {
  const { data } = await http.put(`/geography/cantons/${id}`, payload);
  return data;
};

export const deleteCanton = async (id: string) => {
  await http.delete(`/geography/cantons/${id}`);
};

export const importCantons = async (file: File, mode: 'append' | 'replace') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  const { data } = await uploadClient.post(
    '/geography/cantons/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
};

export const listDistricts = async (
  params: CatalogListParams & { provinceCode?: number; cantonCode?: number },
) => {
  const { data } = await http.get<CatalogListResponse<District>>(
    '/geography/districts',
    { params },
  );
  return data;
};

export const createDistrict = async (payload: {
  provinciaNombre: string;
  provinceCode: number;
  cantonNombre: string;
  cantonCode: number;
  nombre: string;
  codigo: number;
}) => {
  const { data } = await http.post('/geography/districts', payload);
  return data;
};

export const updateDistrict = async (
  id: string,
  payload: Partial<{
    provinciaNombre: string;
    provinceCode: number;
    cantonNombre: string;
    cantonCode: number;
    nombre: string;
    codigo: number;
  }>,
) => {
  const { data } = await http.put(`/geography/districts/${id}`, payload);
  return data;
};

export const deleteDistrict = async (id: string) => {
  await http.delete(`/geography/districts/${id}`);
};

export const importDistricts = async (file: File, mode: 'append' | 'replace') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  const { data } = await uploadClient.post(
    '/geography/districts/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
};

export const listBarrios = async (
  params: CatalogListParams & {
    provinceCode?: number;
    cantonCode?: number;
    districtName?: string;
    provinceKey?: string;
  },
) => {
  const { data } = await http.get<CatalogListResponse<Barrio>>(
    '/geography/barrios',
    { params },
  );
  return data;
};

export const createBarrio = async (payload: {
  provinciaNombre: string;
  provinceCode: number;
  cantonNombre: string;
  cantonCode: number;
  districtName: string;
  districtCode?: number | null;
  nombre: string;
}) => {
  const { data } = await http.post('/geography/barrios', payload);
  return data;
};

export const updateBarrio = async (
  id: string,
  payload: Partial<{
    provinciaNombre: string;
    provinceCode: number;
    cantonNombre: string;
    cantonCode: number;
    districtName: string;
    districtCode: number | null;
    nombre: string;
  }>,
) => {
  const { data } = await http.put(`/geography/barrios/${id}`, payload);
  return data;
};

export const deleteBarrio = async (id: string) => {
  await http.delete(`/geography/barrios/${id}`);
};

export const importBarrios = async (file: File, mode: 'append' | 'replace') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  const { data } = await uploadClient.post(
    '/geography/barrios/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
};
