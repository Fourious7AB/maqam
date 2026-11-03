import { usePermission } from '../../hooks/usePermission';

export default function PermissionGate({ permission, children, fallback=null }) {
  const can = usePermission();
  return can(permission) ? children : fallback;
}
