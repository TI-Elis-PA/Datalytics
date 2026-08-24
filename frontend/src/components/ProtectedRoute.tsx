import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, canAccess, getDefaultRoute } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPath: string;
}

export default function ProtectedRoute({ children, requiredPath }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-surface-0)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#009B98] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !canAccess(user.perfil, requiredPath)) {
    // Redirect to the user's default allowed page
    return <Navigate to={getDefaultRoute(user.perfil)} replace />;
  }

  return <>{children}</>;
}
