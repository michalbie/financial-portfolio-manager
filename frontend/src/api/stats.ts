export interface StatisticsResponse {
	id: number;
	user_id: number;
	date: string;
	total_portfolio_value: number;
	created_at: string;
	updated_at: string;
}

import { makeSafeRequest } from "../common/makeSafeRequest";

export function getMyStatistics() {
	return makeSafeRequest<StatisticsResponse[]>("statistics/me", "GET", {
		onErrorMessage: "Failed to load statistics.",
	});
}
