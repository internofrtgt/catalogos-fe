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
import {
  isTokenExpired,
  getTimeUntilExpiration,
  formatTimeRemaining,
  getTokenExpirationTime
} from '../utils/jwt';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginResponse) => void;
  logout: () => void;
  showExpirationWarning: boolean;
  timeUntilExpiration: string;
}

const STORAGE_KEY = 'backoffice-auth';
const ACTIVITY_KEY = 'backoffice-last-activity';
const WARNING_BEFORE_EXPIRATION = 5 * 60; // 5 minutos antes de expirar

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();
  const [showExpirationWarning, setShowExpirationWarning] = useState(false);
  const [timeUntilExpiration, setTimeUntilExpiration] = useState<string>('');

  const [state, setState] = useState<AuthState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { token: null, user: null };
    }
    try {
      const parsed = JSON.parse(stored) as AuthState;

      // Verificar si el token ha expirado
      if (parsed.token && isTokenExpired(parsed.token)) {
        localStorage.removeItem(STORAGE_KEY);
        return { token: null, user: null };
      }

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

  // Actualizar actividad del usuario
  const updateActivity = useCallback(() => {
    if (state.token) {
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
    }
  }, [state.token]);

  // Manejar eventos de actividad del usuario
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      updateActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  // Verificar expiración del token
  useEffect(() => {
    if (!state.token) return;

    const checkExpiration = () => {
      const timeLeft = getTimeUntilExpiration(state.token);

      if (timeLeft <= 0) {
        // Token expirado, cerrar sesión
        logout();
        return;
      }

      // Mostrar advertencia 5 minutos antes de expirar
      if (timeLeft <= WARNING_BEFORE_EXPIRATION && timeLeft > WARNING_BEFORE_EXPIRATION - 60) {
        setShowExpirationWarning(true);
        setTimeUntilExpiration(formatTimeRemaining(timeLeft));
      }

      // Ocultar advertencia si el usuario renovó el token
      if (timeLeft > WARNING_BEFORE_EXPIRATION) {
        setShowExpirationWarning(false);
      }
    };

    // Verificar cada minuto
    const interval = setInterval(checkExpiration, 60000);

    // Verificar inmediatamente
    checkExpiration();

    return () => clearInterval(interval);
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
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
      setShowExpirationWarning(false);
      navigate('/', { replace: true });
    },
    [navigate],
  );

  const logout = useCallback(() => {
    setState({ token: null, user: null });
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    setShowExpirationWarning(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      showExpirationWarning,
      timeUntilExpiration,
    }),
    [login, logout, state, showExpirationWarning, timeUntilExpiration],
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

