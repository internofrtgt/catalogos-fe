export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp <= now;
};

export const getTokenExpirationTime = (token: string | null): number | null => {
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded ? decoded.exp : null;
};

export const getTimeUntilExpiration = (token: string | null): number => {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, expirationTime - now);
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Ahora';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else if (minutes > 0) {
    return `${minutes} min`;
  } else {
    return 'Menos de 1 min';
  }
};