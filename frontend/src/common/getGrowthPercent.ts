const getGrowthPercent = (purchasePrice: number, currentPrice: number): string => {
	if (currentPrice === undefined) {
		return "0.00";
	} else if (purchasePrice === 0) {
		purchasePrice = 1;
	}
	return Math.abs(((currentPrice - purchasePrice) / purchasePrice) * 100).toFixed(2);
};
export default getGrowthPercent;
