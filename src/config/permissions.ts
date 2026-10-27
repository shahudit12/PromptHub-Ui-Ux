// Feature Permissions Matrix

export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type Permission =
  | 'edit_prompt'
  | 'delete_prompt'
  | 'invite_members'
  | 'generate_api_keys'
  | 'publish_marketplace'
  | 'view_audit_logs'
  | 'manage_billing';

const PERMISSION_MATRIX: Record<OrgRole, Record<Permission, boolean>> = {
  owner: {
    edit_prompt: true,
    delete_prompt: true,
    invite_members: true,
    generate_api_keys: true,
    publish_marketplace: true,
    view_audit_logs: true,
    manage_billing: true,
  },
  admin: {
    edit_prompt: true,
    delete_prompt: true,
    invite_members: true,
    generate_api_keys: true,
    publish_marketplace: true,
    view_audit_logs: true,
    manage_billing: false,
  },
  editor: {
    edit_prompt: true,
    delete_prompt: false,
    invite_members: false,
    generate_api_keys: false,
    publish_marketplace: true,
    view_audit_logs: false,
    manage_billing: false,
  },
  viewer: {
    edit_prompt: false,
    delete_prompt: false,
    invite_members: false,
    generate_api_keys: false,
    publish_marketplace: false,
    view_audit_logs: false,
    manage_billing: false,
  },
};

export const hasPermission = (role: OrgRole, permission: Permission): boolean => {
  return PERMISSION_MATRIX[role]?.[permission] ?? false;
};
