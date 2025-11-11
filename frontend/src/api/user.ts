import { makeSafeRequest } from "../common/makeSafeRequest";

export interface UserSettings {
	id: number;
	user_id: number;
	currency: string;
	primary_saving_asset_id?: number | null;
	salary_per_month?: number | null;
	salary_day: number;
}

// Get specific user settings
export function getUserSettings(userId: number) {
	return makeSafeRequest<UserSettings>(`user_settings/${userId}`, "GET", {
		onErrorMessage: "Failed to load user settings.",
	});
}

// Update user settings
export function updateUserSettings(userId: number, settings: Partial<UserSettings>) {
	return makeSafeRequest<UserSettings>(`user_settings/${userId}`, "PUT", {
		payload: settings,
		onSuccessMessage: "User settings updated successfully!",
		onErrorMessage: "Failed to update user settings.",
	});
}
