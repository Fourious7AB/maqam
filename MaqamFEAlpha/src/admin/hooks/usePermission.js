import { useAuth } from './useAuth';
import { hasPermission } from '../utils/permissions';

export function usePermission() {
  const { user } = useAuth();
  return (permission) => hasPermission(user?.role, permission);
}
