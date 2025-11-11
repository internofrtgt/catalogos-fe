import { http } from './http';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const loginRequest = async (
  payload: LoginPayload,
): Promise<LoginResponse> => {
  const { data } = await http.post<LoginResponse>('/auth/login', payload);
  return data;
};
