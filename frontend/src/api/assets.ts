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

export enum AssetStatus {
	ACTIVE = "active",
	CLOSED = "closed",
}

export interface Asset {
	id: number;
	name: string;
	type: AssetType;
	symbol?: string;
	mic_code?: string; // ← MIC code instead of exchange
	purchase_price: number;
	currency: string;
	current_price?: number;
	purchase_date?: string;
	exchange?: string;
	quantity?: number;
	user_id: number;
	created_at: string;
	updated_at: string;
	status: AssetStatus;
	bond_settings?: BondSettings | null;
}

export interface AssetCreate {
	name: string;
	type: AssetType;
	symbol?: string;
	mic_code?: string; // ← MIC code instead of exchange
	currency: string;
	purchase_price: number;
	purchase_date?: string;
	quantity?: number;
	exchange?: string;
	deduct_from_savings: boolean;
	bond_settings?: BondSettings | null;
}

export interface AssetUpdate {
	name?: string;
	type?: AssetType;
	symbol?: string;
	mic_code?: string; // ← MIC code instead of exchange
	currency?: string;
	purchase_price?: number;
	purchase_date?: string;
	quantity?: number;
	exchange?: string;
	bond_settings?: BondSettings | null;
}

export interface BondSettings {
	capitalizationOfInterest: boolean;
	capitalizationFrequency: number | null;
	maturityDate: string | null;
	interestRateResetFrequency: number | null;
	interestRates: Record<number, { rate: number }>;
}

export interface StockSearchResult {
	symbol: string;
	matches: {
		symbol: string;
		name: string;
		exchange: string;
		mic_code: string;
		country: string;
		currency: string;
	}[];
}

export interface CryptoSearchResult {
	symbol: string;
	matches: {
		symbol: string;
		available_exchanges: string[];
		currency_base: string;
		currency_quote: string;
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

// Close asset
export function closeAsset(assetId: number, taxFromProfit: number, transferToSavings: boolean) {
	return makeSafeRequest<{ message: string }>(`assets/${assetId}/close`, "POST", {
		payload: { tax_from_profit: taxFromProfit, transfer_to_savings: transferToSavings },
		onSuccessMessage: "Stock position closed successfully!",
		onErrorMessage: "Failed to close stock position.",
	});
}

// Search stocks by symbol
export function searchStocksBySymbol(symbol: string) {
	return makeSafeRequest<StockSearchResult>(`assets/stocks/search/${symbol}`, "GET", {
		onErrorMessage: "Failed to search for stocks.",
	});
}

// Search crypto by symbol
export function searchCryptoBySymbol(symbol: string) {
	return makeSafeRequest<CryptoSearchResult>(`assets/crypto/search/${symbol}`, "GET", {
		onErrorMessage: "Failed to search for cryptocurrencies.",
	});
}

// Get price history for a asset
export function getAssetPriceHistory(symbol: string, mic_code: string, startDate?: string, endDate?: string) {
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
