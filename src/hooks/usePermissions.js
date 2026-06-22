import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const DEFAULT_PERMISSIONS = {
  is_admin: false,
  can_view_properties: false,
  can_create_property: false,
  can_edit_property: false,
  can_delete_property: false,
  can_create_analysis: false,
  can_edit_analysis: false,
  can_delete_analysis: false,
  can_view_comparator: false,
  can_view_presentation: false,
  can_comment: false,
};

const ADMIN_PERMISSIONS = {
  is_admin: true,
  can_view_properties: true,
  can_create_property: true,
  can_edit_property: true,
  can_delete_property: true,
  can_create_analysis: true,
  can_edit_analysis: true,
  can_delete_analysis: true,
  can_view_comparator: true,
  can_view_presentation: true,
  can_comment: true,
};

export function usePermissions() {
  const { user } = useAuth();

  const {
    data: permissions,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      const results = await base44.entities.UserPermission.filter({
        user_id: user.id,
      });

      return results[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 5000,
  });

  const mergedPermissions = permissions
    ? { ...DEFAULT_PERMISSIONS, ...permissions }
    : DEFAULT_PERMISSIONS;

  if (mergedPermissions.is_admin === true) {
    return {
      permissions: ADMIN_PERMISSIONS,
      isLoading,
      isAdmin: true,
      hasAssignedRole: true,
      refetchPermissions: refetch,
    };
  }

  return {
    permissions: mergedPermissions,
    isLoading,
    isAdmin: false,
    hasAssignedRole: !!permissions,
    refetchPermissions: refetch,
  };
}
