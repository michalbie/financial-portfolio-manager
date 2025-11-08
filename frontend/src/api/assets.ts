// frontend/src/api/assets.ts

import { makeSafeRequest } from "../common/makeSafeRequest";

export enum AssetType {
	STOCKS = "stocks",
	BONDS = "bonds",
	CRYPTO = "crypto",
	REAL_ESTATE = "real-estate",
	SAVINGS = "savings",
	OTHER = "other",
}

export interface Asset {
	id: number;
	name: string;
	type: AssetType;
	symbol?: string;
	mic_code?: string; // ← MIC code instead of exchange
	purchase_price: number;
	current_price?: number;
	purchase_date?: string;
	quantity?: number;
	user_id: number;
	created_at: string;
	updated_at: string;
}

export interface AssetCreate {
	name: string;
	type: AssetType;
	symbol?: string;
	mic_code?: string; // ← MIC code instead of exchange
	purchase_price: number;
	purchase_date?: string;
	quantity?: number;
}

export interface AssetUpdate {
	name?: string;
	type?: AssetType;
	symbol?: string;
	mic_code?: string; // ← MIC code instead of exchange
	purchase_price?: number;
	purchase_date?: string;
	quantity?: number;
}

export interface StockSearchResult {
	symbol: string;
	matches: {
		symbol: string;
		name: string;
		exchange: string;
		mic_code: string; // ← MIC code
		country: string;
		currency: string;
	}[];
}

export interface PriceData {
	datetime: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

export interface PriceHistoryResponse {
	symbol: string;
	mic_code: string; // ← MIC code
	start_date: string;
	end_date: string;
	data: PriceData[];
}

// Get all assets for current user
export function getMyAssets() {
	return makeSafeRequest<Asset[]>("assets/", "GET", {
		onErrorMessage: "Failed to load assets.",
	});
}

// Get specific asset
export function getAsset(assetId: number) {
	return makeSafeRequest<Asset>(`assets/${assetId}`, "GET", {
		onErrorMessage: "Failed to load asset.",
	});
}

// Create new asset
export function createAsset(asset: AssetCreate) {
	return makeSafeRequest<Asset>("assets/", "POST", {
		payload: asset,
		onSuccessMessage: "Asset created successfully!",
		onErrorMessage: "Failed to create asset.",
	});
}

// Update asset
export function updateAsset(assetId: number, asset: AssetUpdate) {
	return makeSafeRequest<Asset>(`assets/${assetId}`, "PUT", {
		payload: asset,
		onSuccessMessage: "Asset updated successfully!",
		onErrorMessage: "Failed to update asset.",
	});
}

// Delete asset
export function deleteAsset(assetId: number) {
	return makeSafeRequest<{ message: string }>(`assets/${assetId}`, "DELETE", {
		onSuccessMessage: "Asset deleted successfully!",
		onErrorMessage: "Failed to delete asset.",
	});
}

// Search stocks by symbol
export function searchStocksBySymbol(symbol: string) {
	return makeSafeRequest<StockSearchResult>(`assets/stocks/search/${symbol}`, "GET", {
		onErrorMessage: "Failed to search for stocks.",
	});
}

// Get price history for a stock
export function getStockPriceHistory(symbol: string, mic_code: string, startDate?: string, endDate?: string) {
	const params: Record<string, string> = {};
	if (startDate) params.start_date = startDate;
	if (endDate) params.end_date = endDate;

	return makeSafeRequest<PriceHistoryResponse>(`assets/prices/${symbol}/${mic_code}`, "GET", {
		params,
		onErrorMessage: "Failed to load price history.",
	});
}

// Get portfolio summary
export function getPortfolioSummary() {
	return makeSafeRequest<{
		total_net_worth: number;
		total_invested: number;
		total_gain_loss: number;
		gain_loss_percentage: number;
		asset_count: number;
		by_type: Record<string, { count: number; total_value: number; total_cost: number }>;
	}>("assets/stats/summary", "GET", {
		onErrorMessage: "Failed to load portfolio summary.",
	});
}
