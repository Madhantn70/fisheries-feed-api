import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export function RoleGuard({ allowedRoles }) {
  const { user } = useAuth();
  const isAllowed = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (user && !isAllowed) {
      toast.error("Access denied. Admin privileges required.");
    }
  }, [user, isAllowed]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
