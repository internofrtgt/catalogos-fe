import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '../api/http';
import type { AuthUser, LoginResponse } from '../api/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginResponse) => void;
  logout: () => void;
}

const STORAGE_KEY = 'backoffice-auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { token: null, user: null };
    }
    try {
      const parsed = JSON.parse(stored) as AuthState;
      setAuthToken(parsed.token);
      return parsed;
    } catch {
      return { token: null, user: null };
    }
  });

  useEffect(() => {
    if (state.token) {
      setAuthToken(state.token);
    }
  }, [state.token]);

  const login = useCallback(
    (payload: LoginResponse) => {
      const nextState: AuthState = {
        token: payload.accessToken,
        user: payload.user,
      };
      setState(nextState);
      setAuthToken(payload.accessToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      navigate('/', { replace: true });
    },
    [navigate],
  );

  const logout = useCallback(() => {
    setState({ token: null, user: null });
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
    }),
    [login, logout, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};

