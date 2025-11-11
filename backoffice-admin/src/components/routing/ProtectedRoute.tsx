import { Navigate, Outlet } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps extends PropsWithChildren {}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
};
