import { http } from './http';

export type UserRole = 'ADMIN' | 'OPERATOR';

export interface UserResponse {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  data: UserResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export const getUsers = async (
  params: UserListParams,
): Promise<UserListResponse> => {
  const { data } = await http.get<UserListResponse>('/users', { params });
  return data;
};

export const getUser = async (id: string): Promise<UserResponse> => {
  const { data } = await http.get<UserResponse>(`/users/${id}`);
  return data;
};

export const createUser = async (payload: CreateUserPayload) => {
  const { data } = await http.post<UserResponse>('/users', payload);
  return data;
};

export const updateUser = async (
  id: string,
  payload: UpdateUserPayload,
) => {
  const { data } = await http.put<UserResponse>(`/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id: string) => {
  await http.delete(`/users/${id}`);
};
