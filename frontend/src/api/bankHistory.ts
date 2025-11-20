
import { makeSafeRequest } from "../common/makeSafeRequest";

export interface BankHistory {
	id: number;
	user_id: number;
	asset_id?: number | null;
	date_start: string;
	date_end: string;
	incomes: number;
	expenses: number;
	final_balance: number;
	created_at: string;
	updated_at: string;
}

// Get all bank history records for current user
export function getMyBankHistory() {
	return makeSafeRequest<BankHistory[]>("bank_history/", "GET", {
		onErrorMessage: "Failed to load bank history.",
	});
}

// Upload CSV file
export function uploadBankCSV(file: File, assetId?: number) {
	const formData = new FormData();
	formData.append("file", file);
	if (assetId) {
		formData.append("asset_id", assetId.toString());
	}

	return makeSafeRequest<BankHistory>("bank_history/upload", "POST", {
		payload: formData,
		contentType: "multipart/form-data",
		onSuccessMessage: "Bank history uploaded successfully!",
		onErrorMessage: "Failed to upload bank history.",
	});
}

// Delete bank history record
export function deleteBankHistory(historyId: number) {
	return makeSafeRequest<{ message: string }>(`bank_history/${historyId}`, "DELETE", {
		onSuccessMessage: "Bank history deleted successfully!",
		onErrorMessage: "Failed to delete bank history.",
	});
}
