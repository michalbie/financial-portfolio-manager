export function loginWithGoogle() {
	// Full-page redirect to backend OAuth start
	window.location.href = `${getAPIEndpoint()}auth/login/google`;
}

export interface MeResponse {
	id: number;
	email: string;
	name: string;
	roles: string[];
	permissions: string[];
	user_settings: UserSettings;
}

import { getAPIEndpoint } from "../common/getAPIEndpoint";
import { makeSafeRequest } from "../common/makeSafeRequest";
import type { UserSettings } from "./user";

export function getMe() {
	return makeSafeRequest<MeResponse>("auth/me", "GET", {
		onErrorMessage: "Failed to load user.",
	});
}

// Helper to check if user has a specific permission
export function hasPermission(permissions: string[], permission: string): boolean {
	return permissions.includes(permission);
}

// Helper to check if user has a specific role
export function hasRole(userRoles: string[], requiredRole: string): boolean {
	return userRoles.includes(requiredRole);
}

// Helper to check if user has ANY of the specified roles
export function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
	return requiredRoles.some((role) => userRoles.includes(role));
}
