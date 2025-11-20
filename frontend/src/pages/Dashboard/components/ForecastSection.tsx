import React, { useState, useEffect, useMemo } from "react";
import { Box, Stack, Text, Title, NumberInput, Group, Paper, Button, Checkbox } from "@mantine/core";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { IconChartLine, IconRefresh } from "@tabler/icons-react";
import { getMyStatistics } from "../../../api/stats";
import { useAuth } from "../../../context/AuthContext";

interface ForecastDataPoint {
	date: string;
	projectedValue: number;
	nominalValue?: number;
	historicalValue?: number;
	displayDate: string;
}

interface ForecastSectionProps {}

const CustomForecastTooltip = ({ active, payload, user }: any) => {
	if (active && payload && payload.length) {
		return (
			<Box
				style={{
					background: "rgba(10, 10, 10, 0.95)",
					border: "1px solid rgba(59, 130, 246, 0.3)",
					borderRadius: "8px",
					padding: "12px",
					backdropFilter: "blur(10px)",
				}}
			>
				<Text size="sm" fw={500} style={{ color: "white", marginBottom: "8px" }}>
					{payload[0].payload.displayDate}
				</Text>
				{payload.map((entry: any, index: number) => (
					<Text key={index} size="sm" style={{ color: entry.color, marginBottom: "4px" }}>
						{entry.name}: {user?.user_settings.currency}{" "}
						{entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</Text>
				))}
			</Box>
		);
	}
	return null;
};

export const ForecastSection: React.FC<ForecastSectionProps> = () => {
	const { user } = useAuth();
	const [portfolioStatistics, setPortfolioStatistics] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	// Forecast parameters
	const [yearsAhead, setYearsAhead] = useState(10);
	const [monthlyGrowthRate, setMonthlyGrowthRate] = useState<number | string>(0);
	const [useCalculatedRate, setUseCalculatedRate] = useState(true);
	const [inflationRate, setInflationRate] = useState(2.5);
	const [monthlySavings, setMonthlySavings] = useState<number | string>(0);
	const [showNominal, setShowNominal] = useState(false); // Toggle for nominal vs real values

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		const data = await getMyStatistics();
		if (data) {
			setPortfolioStatistics(data);

			// Calculate default monthly growth rate from historical data
			const calculatedGrowth = calculateHistoricalMonthlyGrowth(data);
			if (useCalculatedRate) {
				setMonthlyGrowthRate(calculatedGrowth);
			}

			// Set default monthly savings from user settings
			if (user?.user_settings?.salary_per_month) {
				setMonthlySavings(user.user_settings.salary_per_month * 0.2); // Assume 20% savings rate
			}
		}
		setLoading(false);
	};

	const calculateHistoricalMonthlyGrowth = (stats: any[]): number => {
		if (stats.length < 2) return 0;

		// Filter out same-day duplicates - keep only one entry per day
		const uniqueDayStats: any[] = [];
		const seenDates = new Set<string>();

		for (const stat of stats) {
			const dateKey = new Date(stat.date).toISOString().split("T")[0]; // YYYY-MM-DD
			if (!seenDates.has(dateKey)) {
				seenDates.add(dateKey);
				uniqueDayStats.push(stat);
			}
		}

		if (uniqueDayStats.length < 2) return 0;

		// Use only stats that are at least 7 days apart to avoid artificial spikes
		const filteredStats: any[] = [uniqueDayStats[0]];

		for (let i = 1; i < uniqueDayStats.length; i++) {
			const lastDate = new Date(filteredStats[filteredStats.length - 1].date);
			const currentDate = new Date(uniqueDayStats[i].date);
			const daysDiff = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

			if (daysDiff >= 7) {
				filteredStats.push(uniqueDayStats[i]);
			}
		}

		if (filteredStats.length < 2) {
			// If no stats are 7+ days apart, just use first and last unique
			filteredStats.push(uniqueDayStats[uniqueDayStats.length - 1]);
		}

		// Calculate month-to-month growth rates, excluding outliers
		const monthlyRates: number[] = [];

		for (let i = 1; i < filteredStats.length; i++) {
			const prevValue = filteredStats[i - 1].total_portfolio_value;
			const currentValue = filteredStats[i].total_portfolio_value;

			if (prevValue > 0) {
				const startDate = new Date(filteredStats[i - 1].date);
				const endDate = new Date(filteredStats[i].date);
				const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
				const monthsDiff = Math.max(0.1, daysDiff / 30.44);

				const growthRate = ((currentValue - prevValue) / prevValue) * 100;
				const monthlyRate = growthRate / monthsDiff;

				// Filter out extreme outliers (>50% in one period suggests adding/removing assets)
				if (Math.abs(growthRate) < 50) {
					monthlyRates.push(monthlyRate);
				}
			}
		}

		if (monthlyRates.length === 0) {
			// Fallback: use simple average between first and last
			const firstValue = filteredStats[0].total_portfolio_value;
			const lastValue = filteredStats[filteredStats.length - 1].total_portfolio_value;
			const startDate = new Date(filteredStats[0].date);
			const endDate = new Date(filteredStats[filteredStats.length - 1].date);
			const monthsDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

			if (firstValue > 0) {
				const totalGrowthRate = (lastValue - firstValue) / firstValue;
				const monthlyRate = (totalGrowthRate / monthsDiff) * 100;
				return parseFloat(Math.max(-10, Math.min(10, monthlyRate)).toFixed(2));
			}
			return 0;
		}

		// Calculate median (more robust than average for outliers)
		monthlyRates.sort((a, b) => a - b);
		const medianRate =
			monthlyRates.length % 2 === 0
				? (monthlyRates[monthlyRates.length / 2 - 1] + monthlyRates[monthlyRates.length / 2]) / 2
				: monthlyRates[Math.floor(monthlyRates.length / 2)];

		// Cap at reasonable values (-10% to +10% per month)
		const cappedRate = Math.max(-10, Math.min(10, medianRate));

		return parseFloat(cappedRate.toFixed(2));
	};

	const forecastData = useMemo(() => {
		if (portfolioStatistics.length === 0) return [];

		const data: ForecastDataPoint[] = [];
		const startDate = new Date();
		const latestValue = portfolioStatistics[portfolioStatistics.length - 1].total_portfolio_value;

		let currentValue = latestValue;
		const monthlyGrowth = typeof monthlyGrowthRate === "number" ? monthlyGrowthRate : parseFloat(monthlyGrowthRate.toString()) || 0;
		const monthlySavingsAmount = typeof monthlySavings === "number" ? monthlySavings : parseFloat(monthlySavings.toString()) || 0;
		const monthlyInflation = inflationRate / 12 / 100;

		// Validate growth rate is reasonable
		if (Math.abs(monthlyGrowth) > 20) {
			console.warn("Monthly growth rate exceeds 20%, results may be unrealistic");
		}

		// Add historical data points (last 12 months)
		const historicalMonths = Math.min(12, portfolioStatistics.length);
		for (let i = historicalMonths; i >= 0; i--) {
			const stat = portfolioStatistics[portfolioStatistics.length - 1 - i];
			if (stat) {
				const date = new Date(stat.date);
				data.push({
					date: date.toISOString(),
					historicalValue: stat.total_portfolio_value,
					projectedValue: i === 0 ? stat.total_portfolio_value : (undefined as any),
					displayDate: date.toLocaleDateString("en-US", { year: "numeric", month: "short" }),
				});
			}
		}

		// Add forecast data points
		const monthsToForecast = yearsAhead * 12;
		for (let month = 1; month <= monthsToForecast; month++) {
			const forecastDate = new Date(startDate);
			forecastDate.setMonth(forecastDate.getMonth() + month);

			// Apply compound growth to initial portfolio: FV = PV * (1 + r)^n
			const growthMultiplier = Math.pow(1 + monthlyGrowth / 100, month);
			currentValue = latestValue * growthMultiplier;

			// Add monthly savings with compound growth
			// Each monthly deposit grows for the remaining months
			// Formula: FV = PMT × [((1 + r)^n - 1) / r]
			// This is the future value of an annuity
			if (monthlySavingsAmount > 0 && monthlyGrowth !== 0) {
				// Future value of monthly deposits with compound growth
				const savingsGrowthMultiplier = (Math.pow(1 + monthlyGrowth / 100, month) - 1) / (monthlyGrowth / 100);
				const compoundedSavings = monthlySavingsAmount * savingsGrowthMultiplier;
				currentValue += compoundedSavings;
			} else if (monthlySavingsAmount > 0) {
				// If growth rate is 0, just add simple sum
				currentValue += monthlySavingsAmount * month;
			}

			// Store nominal value
			const nominalValue = currentValue;

			// Apply inflation discount to get real value (only if showNominal is false)
			const inflationMultiplier = Math.pow(1 + monthlyInflation, month);
			const realValue = showNominal ? nominalValue : nominalValue / inflationMultiplier;

			data.push({
				date: forecastDate.toISOString(),
				projectedValue: realValue,
				nominalValue: nominalValue,
				displayDate: forecastDate.toLocaleDateString("en-US", { year: "numeric", month: "short" }),
			});
		}

		return data;
	}, [portfolioStatistics, yearsAhead, monthlyGrowthRate, inflationRate, monthlySavings]);

	const finalProjectedValue = forecastData[forecastData.length - 1]?.projectedValue || 0;
	const currentValue = portfolioStatistics[portfolioStatistics.length - 1]?.total_portfolio_value || 0;
	const totalGrowth = currentValue > 0 ? ((finalProjectedValue - currentValue) / currentValue) * 100 : 0;

	// Calculate breakdown for transparency
	const monthlyGrowth = typeof monthlyGrowthRate === "number" ? monthlyGrowthRate : parseFloat(monthlyGrowthRate.toString()) || 0;
	const monthlySavingsAmount = typeof monthlySavings === "number" ? monthlySavings : parseFloat(monthlySavings.toString()) || 0;
	const monthsToForecast = yearsAhead * 12;

	// Initial portfolio growth
	const portfolioGrowthMultiplier = Math.pow(1 + monthlyGrowth / 100, monthsToForecast);
	const portfolioFutureValue = currentValue * portfolioGrowthMultiplier;
	const portfolioGrowthAmount = portfolioFutureValue - currentValue;

	// Monthly savings growth
	let savingsFutureValue = 0;
	if (monthlySavingsAmount > 0 && monthlyGrowth !== 0) {
		const savingsGrowthMultiplier = (Math.pow(1 + monthlyGrowth / 100, monthsToForecast) - 1) / (monthlyGrowth / 100);
		savingsFutureValue = monthlySavingsAmount * savingsGrowthMultiplier;
	} else if (monthlySavingsAmount > 0) {
		savingsFutureValue = monthlySavingsAmount * monthsToForecast;
	}
	const totalContributions = monthlySavingsAmount * monthsToForecast;
	const savingsGrowthAmount = savingsFutureValue - totalContributions;

	if (loading) {
		return (
			<Box
				p="xl"
				style={{
					background: "rgba(255,255,255,0.02)",
					border: "1px solid rgba(59, 130, 246, 0.2)",
					borderRadius: "16px",
				}}
			>
				<Text ta="center" c="dimmed">
					Loading forecast data...
				</Text>
			</Box>
		);
	}

	if (portfolioStatistics.length === 0) {
		return (
			<Box
				p="xl"
				style={{
					background: "rgba(255,255,255,0.02)",
					border: "1px solid rgba(59, 130, 246, 0.2)",
					borderRadius: "16px",
				}}
			>
				<Stack align="center" gap="md">
					<IconChartLine size={48} color="rgba(255,255,255,0.3)" />
					<Text ta="center" c="dimmed">
						Add assets to see your portfolio forecast
					</Text>
				</Stack>
			</Box>
		);
	}

	return (
		<Stack gap="xl">
			{/* Forecast Summary Card */}
			<Paper
				shadow="xs"
				p="xl"
				radius="lg"
				style={{
					background: "rgba(139, 92, 246, 0.05)",
					border: "1px solid rgba(139, 92, 246, 0.2)",
					backdropFilter: "blur(20px)",
				}}
			>
				<Group grow align="flex-start">
					<Stack gap="md" align="center">
						<Text
							size="sm"
							fw={500}
							style={{
								color: "rgba(255,255,255,0.4)",
								letterSpacing: "0.1em",
								textTransform: "uppercase",
							}}
						>
							Projected Portfolio Value ({yearsAhead} years)
						</Text>
						<Title
							order={1}
							style={{
								fontSize: "64px",
								fontWeight: 900,
								background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								backgroundClip: "text",
								letterSpacing: "-0.02em",
								lineHeight: 1,
							}}
						>
							{user?.user_settings.currency}{" "}
							{finalProjectedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</Title>
						<Group gap="xs">
							<Box
								style={{
									width: "8px",
									height: "8px",
									borderRadius: "50%",
									background: totalGrowth >= 0 ? "#10b981" : "#ef4444",
								}}
							/>
							<Text size="lg" fw={500} style={{ color: totalGrowth >= 0 ? "#10b981" : "#ef4444" }}>
								{totalGrowth >= 0 ? "+" : ""}
								{totalGrowth.toFixed(2)}% growth
							</Text>
						</Group>
					</Stack>

					{/* Growth Breakdown */}
					{monthlySavingsAmount > 0 && (
						<Box
							p="md"
							style={{
								background: "rgba(59, 130, 246, 0.05)",
								border: "1px solid rgba(59, 130, 246, 0.2)",
								borderRadius: "12px",
							}}
						>
							<Stack gap="sm">
								<Text size="sm" fw={600} style={{ color: "white" }}>
									Growth Breakdown
								</Text>
								<Stack gap="xs">
									<Group justify="space-between">
										<Text size="xs" c="dimmed">
											Current Portfolio:
										</Text>
										<Text size="xs" fw={500} style={{ color: "white" }}>
											{user?.user_settings.currency}{" "}
											{currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
										</Text>
									</Group>
									<Group justify="space-between">
										<Text size="xs" c="dimmed">
											Portfolio Growth:
										</Text>
										<Text size="xs" fw={500} style={{ color: "#10b981" }}>
											+{user?.user_settings.currency}{" "}
											{portfolioGrowthAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
										</Text>
									</Group>
									<Group justify="space-between">
										<Text size="xs" c="dimmed">
											Your Contributions:
										</Text>
										<Text size="xs" fw={500} style={{ color: "#3b82f6" }}>
											+{user?.user_settings.currency}{" "}
											{totalContributions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
										</Text>
									</Group>
									<Group justify="space-between">
										<Text size="xs" c="dimmed">
											Growth on Contributions:
										</Text>
										<Text size="xs" fw={500} style={{ color: "#8b5cf6" }}>
											+{user?.user_settings.currency}{" "}
											{savingsGrowthAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
										</Text>
									</Group>
									<Box
										style={{
											height: "1px",
											background: "rgba(255,255,255,0.1)",
											margin: "4px 0",
										}}
									/>
									<Group justify="space-between">
										<Text size="xs" fw={600} style={{ color: "white" }}>
											Total Value:
										</Text>
										<Text size="xs" fw={700} style={{ color: "white" }}>
											{user?.user_settings.currency}{" "}
											{(portfolioFutureValue + savingsFutureValue).toLocaleString(undefined, {
												maximumFractionDigits: 0,
											})}
										</Text>
									</Group>
									<Text size="xs" c="dimmed" fs="italic" mt="xs">
										(Before inflation adjustment)
									</Text>
								</Stack>
							</Stack>
						</Box>
					)}
				</Group>
			</Paper>

			{/* Controls */}
			<Paper
				shadow="xs"
				p="xl"
				radius="lg"
				style={{
					background: "rgba(255,255,255,0.02)",
					border: "1px solid rgba(59, 130, 246, 0.2)",
					backdropFilter: "blur(20px)",
				}}
			>
				<Stack gap="md">
					<Group justify="space-between" align="center">
						<Title order={3} style={{ color: "white" }}>
							Forecast Parameters
						</Title>
						<Button
							leftSection={<IconRefresh size={16} />}
							variant="subtle"
							size="sm"
							onClick={loadData}
							style={{ color: "#3b82f6" }}
						>
							Reset to Defaults
						</Button>
					</Group>

					{/* Warning for unrealistic growth rates */}
					{Math.abs(typeof monthlyGrowthRate === "number" ? monthlyGrowthRate : parseFloat(monthlyGrowthRate.toString())) > 5 && (
						<Box
							p="md"
							style={{
								background: "rgba(245, 158, 11, 0.1)",
								border: "1px solid rgba(245, 158, 11, 0.3)",
								borderRadius: "8px",
							}}
						>
							<Text size="sm" style={{ color: "#f59e0b" }}>
								⚠️ Warning: Growth rate above 5% per month (60% yearly) is very aggressive. Consider using more conservative
								estimates for realistic projections. Typical stock market returns are 0.5-1% monthly (6-12% yearly).
							</Text>
						</Box>
					)}

					{/* Info about calculation */}
					{portfolioStatistics.length > 0 && (
						<Box
							p="sm"
							style={{
								background: "rgba(59, 130, 246, 0.05)",
								border: "1px solid rgba(59, 130, 246, 0.2)",
								borderRadius: "8px",
							}}
						>
							<Text size="xs" style={{ color: "rgba(255,255,255,0.5)" }}>
								💡 Growth rate calculated from {portfolioStatistics.length} historical data points spanning{" "}
								{portfolioStatistics.length > 1
									? Math.round(
											(new Date(portfolioStatistics[portfolioStatistics.length - 1].date).getTime() -
												new Date(portfolioStatistics[0].date).getTime()) /
												(1000 * 60 * 60 * 24 * 30.44)
									  )
									: 0}{" "}
								months. Large deposits/withdrawals are filtered out to show organic growth only.
							</Text>
						</Box>
					)}

					<Group grow>
						<NumberInput
							label="Years Ahead"
							description="Forecast timeline"
							value={yearsAhead}
							onChange={(value) => setYearsAhead(typeof value === "number" ? value : parseInt(value) || 10)}
							min={1}
							max={50}
							styles={{
								label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
								description: { color: "rgba(255,255,255,0.4)" },
								input: {
									background: "rgba(255,255,255,0.05)",
									border: "1px solid rgba(255,255,255,0.1)",
									color: "white",
								},
							}}
						/>

						<Box>
							<NumberInput
								label="Monthly Growth Rate (%)"
								description="Investment returns only (stocks/bonds/crypto appreciation)"
								value={monthlyGrowthRate}
								onChange={(value) => {
									setMonthlyGrowthRate(value);
									setUseCalculatedRate(false);
								}}
								step={0.1}
								decimalScale={2}
								disabled={useCalculatedRate}
								styles={{
									label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
									description: { color: "rgba(255,255,255,0.4)" },
									input: {
										background: useCalculatedRate ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
										border: "1px solid rgba(255,255,255,0.1)",
										color: useCalculatedRate ? "rgba(255,255,255,0.5)" : "white",
									},
								}}
							/>
							<Checkbox
								mt="xs"
								label="Use auto-calculated rate from history"
								checked={useCalculatedRate}
								onChange={(e) => {
									const checked = e.currentTarget.checked;
									setUseCalculatedRate(checked);
									if (checked && portfolioStatistics.length > 0) {
										setMonthlyGrowthRate(calculateHistoricalMonthlyGrowth(portfolioStatistics));
									}
								}}
								styles={{
									label: { color: "rgba(255,255,255,0.6)", fontSize: "12px" },
								}}
							/>
						</Box>
					</Group>

					<Group grow>
						<NumberInput
							label="Annual Inflation Rate (%)"
							description="Expected yearly inflation"
							value={inflationRate}
							onChange={(value) => setInflationRate(typeof value === "number" ? value : parseFloat(value) || 2.5)}
							step={0.1}
							decimalScale={2}
							styles={{
								label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
								description: { color: "rgba(255,255,255,0.4)" },
								input: {
									background: "rgba(255,255,255,0.05)",
									border: "1px solid rgba(255,255,255,0.1)",
									color: "white",
								},
							}}
						/>

						<Box>
							<NumberInput
								label="Monthly Savings"
								description="New deposits (will also grow at the growth rate)"
								value={monthlySavings}
								onChange={(value) => setMonthlySavings(value)}
								min={0}
								thousandSeparator=","
								prefix={user?.user_settings.currency + " "}
								styles={{
									label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
									description: { color: "rgba(255,255,255,0.4)" },
									input: {
										background: "rgba(255,255,255,0.05)",
										border: "1px solid rgba(255,255,255,0.1)",
										color: "white",
									},
								}}
							/>
							<Checkbox
								mt="xs"
								label="Show nominal values (ignore inflation)"
								checked={showNominal}
								onChange={(e) => setShowNominal(e.currentTarget.checked)}
								styles={{
									label: { color: "rgba(255,255,255,0.6)", fontSize: "12px" },
								}}
							/>
						</Box>
					</Group>
				</Stack>
			</Paper>

			{/* Forecast Chart */}
			<Paper
				shadow="xs"
				p="xl"
				radius="lg"
				style={{
					background: "rgba(255,255,255,0.02)",
					border: "1px solid rgba(59, 130, 246, 0.2)",
					backdropFilter: "blur(20px)",
				}}
			>
				<Stack gap="md">
					<Title order={3} style={{ color: "white" }}>
						Portfolio Growth Forecast
					</Title>
					<Text size="sm" c="dimmed">
						Projected growth based on historical performance and your parameters
						{showNominal ? " (nominal values - NOT adjusted for inflation)" : " (inflation-adjusted real values)"}
					</Text>

					<Box h={400}>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={forecastData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
								<defs>
									<linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
									</linearGradient>
									<linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
								<XAxis
									dataKey="displayDate"
									tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
									axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
									tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
									interval="preserveStartEnd"
									minTickGap={50}
								/>
								<YAxis
									tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
									axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
									tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
									tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
								/>
								<Tooltip content={<CustomForecastTooltip user={user} />} />
								<Legend
									wrapperStyle={{ paddingTop: "20px" }}
									formatter={(value) => <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{value}</span>}
								/>
								<Line
									type="monotone"
									dataKey="historicalValue"
									stroke="#3b82f6"
									strokeWidth={3}
									name="Historical Value"
									dot={false}
									connectNulls
									fillOpacity={1}
									fill="url(#historicalGradient)"
								/>
								<Line
									type="monotone"
									dataKey="projectedValue"
									stroke="#8b5cf6"
									strokeWidth={3}
									strokeDasharray="5 5"
									name="Projected Value"
									dot={false}
									connectNulls
									fillOpacity={1}
									fill="url(#projectedGradient)"
								/>
							</LineChart>
						</ResponsiveContainer>
					</Box>
				</Stack>
			</Paper>
		</Stack>
	);
};
