// admin-panel/src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from 'lucide-react';

interface ProtectedRouteProps {
  requireSuperAdmin?: boolean;
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireSuperAdmin = false,
  requiredPermission
}) => {
  const { user, loading, isAdmin, isSuperAdmin, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0F172A]">
        <Loader className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-white text-lg">Verifying credentials...</p>
      </div>
    );
  }

  // ✅ Check if user is authenticated and is admin
  if (!user || !isAdmin) {
    console.log('Access denied: User not authenticated or not admin');
    return <Navigate to="/login" replace />;
  }

  // ✅ Super Admin Check for specific routes
  if (requireSuperAdmin && !isSuperAdmin) {
    console.log('Access denied: Super admin privileges required');
    return <Navigate to="/" replace />;
  }

  // ✅ Granular Permission Check for specific routes
  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.log(`Access denied: Permission '${requiredPermission}' required`);
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};