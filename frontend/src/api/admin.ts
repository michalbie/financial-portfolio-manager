import { makeSafeRequest } from "../common/makeSafeRequest";

export interface UserRoleInfo {
  id: number;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface RoleInfo {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
}

export interface PermissionInfo {
  id: number;
  name: string;
  description?: string;
}

export interface UsersResponse {
  users: UserRoleInfo[];
}

export interface RolesResponse {
  roles: RoleInfo[];
}

export interface PermissionsResponse {
  permissions: PermissionInfo[];
}

// User Management
export function listUsers() {
  return makeSafeRequest<UsersResponse>("admin/users", "GET", {
    onErrorMessage: "Failed to load users.",
  });
}

export function assignRole(user_email: string, role_name: string) {
  return makeSafeRequest<{ message: string }>("admin/users/assign-role", "POST", {
    payload: { user_email, role_name },
    onSuccessMessage: "Role assigned successfully!",
    onErrorMessage: "Failed to assign role.",
  });
}

export function removeRoleFromUser(user_email: string, role_name: string) {
  return makeSafeRequest<{ message: string }>("admin/users/remove-role", "POST", {
    payload: { user_email, role_name },
    onSuccessMessage: "Role removed successfully!",
    onErrorMessage: "Failed to remove role.",
  });
}

// Role Management
export function listRoles() {
  return makeSafeRequest<RolesResponse>("admin/roles", "GET", {
    onErrorMessage: "Failed to load roles.",
  });
}

export function createRole(name: string, description: string, permission_names: string[]) {
  return makeSafeRequest<{ message: string; role: RoleInfo }>("admin/roles", "POST", {
    payload: { name, description, permission_names },
    onSuccessMessage: "Role created successfully!",
    onErrorMessage: "Failed to create role.",
  });
}

export function updateRolePermissions(role_name: string, permission_names: string[]) {
  return makeSafeRequest<{ message: string }>("admin/roles/permissions", "PUT", {
    payload: { role_name, permission_names },
    onSuccessMessage: "Permissions updated successfully!",
    onErrorMessage: "Failed to update permissions.",
  });
}

export function deleteRole(role_name: string) {
  return makeSafeRequest<{ message: string }>(`admin/roles/${role_name}`, "DELETE", {
    onSuccessMessage: "Role deleted successfully!",
    onErrorMessage: "Failed to delete role.",
  });
}

// Permission Management
export function listPermissions() {
  return makeSafeRequest<PermissionsResponse>("admin/permissions", "GET", {
    onErrorMessage: "Failed to load permissions.",
  });
}

export function createPermission(name: string, description: string) {
  return makeSafeRequest<{ message: string; permission: PermissionInfo }>("admin/permissions", "POST", {
    payload: { name, description },
    onSuccessMessage: "Permission created successfully!",
    onErrorMessage: "Failed to create permission.",
  });
}