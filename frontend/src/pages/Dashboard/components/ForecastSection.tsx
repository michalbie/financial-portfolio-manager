import React, { useState, useEffect, useMemo } from "react";
import { Box, Stack, Text, Title, NumberInput, Group, Paper, Button, Checkbox } from "@mantine/core";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { IconChartLine, IconRefresh } from "@tabler/icons-react";
import { getMyStatistics } from "../../../api/stats";
import { useAuth } from "../../../context/AuthContext";
import type { Asset } from "../../../api/assets";

interface YearlyBreakdown {
	year: number;
	displayYear: string;
	laborIncome: number;
	capitalGains: number;
	totalWealth: number;
}

interface ForecastSectionProps {
	assets: Asset[];
}

const CustomYearlyTooltip = ({ active, payload, user }: any) => {
	if (active && payload && payload.length) {
		const data = payload[0].payload;
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
					Year {data.displayYear}
				</Text>
				<Text size="sm" style={{ color: "#3b82f6", marginBottom: "4px" }}>
					Labor Income: {user?.user_settings.currency} {data.laborIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
				</Text>
				<Text size="sm" style={{ color: "#8b5cf6", marginBottom: "4px" }}>
					Capital Gains: {user?.user_settings.currency}{" "}
					{data.capitalGains.toLocaleString(undefined, { maximumFractionDigits: 0 })}
				</Text>
				<Text size="sm" style={{ color: "#10b981", marginTop: "4px" }}>
					Total Wealth: {user?.user_settings.currency} {data.totalWealth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
				</Text>
			</Box>
		);
	}
	return null;
};

export const ForecastSection: React.FC<ForecastSectionProps> = ({ assets }) => {
	const { user } = useAuth();
	const [portfolioStatistics, setPortfolioStatistics] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	// Forecast parameters
	const [yearsAhead, setYearsAhead] = useState(10);
	const [annualGrowthRate, setAnnualGrowthRate] = useState<number | string>(0);
	const [useCalculatedRate, setUseCalculatedRate] = useState(true);
	const [inflationRate, setInflationRate] = useState(2.5);
	const [monthlySavings, setMonthlySavings] = useState<number>(0);
	const [annualSalaryIncrease, setAnnualSalaryIncrease] = useState<number>(2.5);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		const data = await getMyStatistics();
		if (data) {
			setPortfolioStatistics(data);

			const calculatedMonthlyGrowth = calculateHistoricalMonthlyGrowth(assets);
			// Convert monthly to annual: (1 + monthly)^12 - 1
			const calculatedAnnualGrowth = (Math.pow(1 + calculatedMonthlyGrowth / 100, 12) - 1) * 100;
			if (useCalculatedRate) {
				setAnnualGrowthRate(calculatedAnnualGrowth.toFixed(2));
			}

			if (user?.user_settings?.salary_per_month) {
				setMonthlySavings(user.user_settings.salary_per_month * 0.8);
			}
		}
		setLoading(false);
	};

	const calculateHistoricalMonthlyGrowth = (assets: Asset[]): number => {
		if (assets.length === 0) return 0;

		let totalInvestedAmount = 0;
		let totalCurrentValue = 0;
		let weightedMonthsHeld = 0;

		const now = new Date();

		for (const asset of assets) {
			const quantity = asset.quantity || 1;
			const purchasePrice = asset.purchase_price;
			const currentPrice = asset.current_price || purchasePrice;

			const invested = purchasePrice * quantity;
			const currentValue = currentPrice * quantity;

			totalInvestedAmount += invested;
			totalCurrentValue += currentValue;

			// Calculate months held for this asset
			if (asset.purchase_date) {
				const purchaseDate = new Date(asset.purchase_date);
				const monthsHeld = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

				// Weight by investment amount
				weightedMonthsHeld += monthsHeld * invested;
			}
		}

		if (totalInvestedAmount <= 0) return 0;

		// Calculate average months held (weighted by investment amount)
		const averageMonthsHeld = Math.max(1, weightedMonthsHeld / totalInvestedAmount);

		// Calculate total return percentage
		const totalReturn = ((totalCurrentValue - totalInvestedAmount) / totalInvestedAmount) * 100;

		// Calculate average monthly return
		const monthlyReturn = totalReturn / averageMonthsHeld;

		// Cap between -10% and 10% per month
		const cappedRate = Math.max(-10, Math.min(10, monthlyReturn));

		return parseFloat(cappedRate.toFixed(2));
	};
	// Calculate yearly breakdown with inflation adjustment and salary increases
	const yearlyBreakdown = useMemo(() => {
		if (portfolioStatistics.length === 0) return [];

		const breakdown: YearlyBreakdown[] = [];
		const currentYear = new Date().getFullYear();
		const currentValue = portfolioStatistics[portfolioStatistics.length - 1].total_portfolio_value;

		// Convert annual growth rate to monthly
		const annualGrowth = typeof annualGrowthRate === "number" ? annualGrowthRate : parseFloat(annualGrowthRate.toString()) || 0;
		const monthlyGrowthDecimal = Math.pow(1 + annualGrowth / 100, 1 / 12) - 1;

		const monthlySavingsAmount = monthlySavings || 0;
		const monthlyInflation = inflationRate / 12 / 100;
		const annualSalaryIncreaseRate = annualSalaryIncrease || 0;
		const annualSalaryIncreaseDecimal = annualSalaryIncreaseRate / 100;

		// Year 0 (current year) - just current portfolio value, no additions yet
		breakdown.push({
			year: currentYear,
			displayYear: currentYear.toString(),
			laborIncome: 0,
			capitalGains: 0,
			totalWealth: currentValue,
		});

		let poolValue = currentValue;
		let currentMonthlySavings = monthlySavingsAmount;

		// Start from year 1 onwards - add salary and grow
		for (let year = 1; year <= yearsAhead; year++) {
			const targetYear = currentYear + year;
			const startOfYearPoolValue = poolValue;

			// Apply annual salary increase at the start of each year (except year 1)
			if (year > 1) {
				currentMonthlySavings = currentMonthlySavings * (1 + annualSalaryIncreaseDecimal);
			}

			const annualSavings = currentMonthlySavings * 12;

			// Simulate 12 months: each month add savings then grow the pool (all in nominal terms)
			for (let m = 0; m < 12; m++) {
				poolValue += currentMonthlySavings;
				poolValue = poolValue * (1 + monthlyGrowthDecimal);
			}

			const nominalEndOfYearValue = poolValue;

			// Capital gains in nominal terms = everything minus what we started with minus what we added
			const nominalCapitalGains = nominalEndOfYearValue - startOfYearPoolValue - annualSavings;

			// Store as nominal values (future dollars) to match reference implementation
			breakdown.push({
				year: targetYear,
				displayYear: targetYear.toString(),
				laborIncome: annualSavings,
				capitalGains: nominalCapitalGains,
				totalWealth: nominalEndOfYearValue,
			});
		}

		return breakdown;
	}, [portfolioStatistics, yearsAhead, annualGrowthRate, monthlySavings, inflationRate, annualSalaryIncrease]);

	const finalProjectedValue = yearlyBreakdown[yearlyBreakdown.length - 1]?.totalWealth || 0;
	const currentValue = portfolioStatistics[portfolioStatistics.length - 1]?.total_portfolio_value || 0;
	const totalGrowth = currentValue > 0 ? ((finalProjectedValue - currentValue) / currentValue) * 100 : 0;

	// Calculate breakdown for display (using nominal/future values to match reference)
	const totalContributions = yearlyBreakdown.slice(1).reduce((sum, year) => sum + year.laborIncome, 0);
	const totalGains = finalProjectedValue - currentValue - totalContributions;

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

					{monthlySavings > 0 && (
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
											Your Contributions:
										</Text>
										<Text size="xs" fw={500} style={{ color: "#3b82f6" }}>
											+{user?.user_settings.currency}{" "}
											{totalContributions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
										</Text>
									</Group>
									<Group justify="space-between">
										<Text size="xs" c="dimmed">
											Growth on Everything:
										</Text>
										<Text size="xs" fw={500} style={{ color: "#8b5cf6" }}>
											+{user?.user_settings.currency}{" "}
											{totalGains.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
											{finalProjectedValue.toLocaleString(undefined, {
												maximumFractionDigits: 0,
											})}
										</Text>
									</Group>
									<Text size="xs" c="dimmed" fs="italic" mt="xs">
										(Future money values)
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

					{Math.abs(typeof annualGrowthRate === "number" ? annualGrowthRate : parseFloat(annualGrowthRate.toString())) > 50 && (
						<Box
							p="md"
							style={{
								background: "rgba(245, 158, 11, 0.1)",
								border: "1px solid rgba(245, 158, 11, 0.3)",
								borderRadius: "8px",
							}}
						>
							<Text size="sm" style={{ color: "#f59e0b" }}>
								⚠️ Warning: Growth rate above 50% per year is very aggressive. Typical stock market returns are 6-12%
								annually.
							</Text>
						</Box>
					)}

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
								months.
							</Text>
						</Box>
					)}

					<Group grow style={{ alignItems: "flex-start" }}>
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
								label="Annual Growth Rate (%)"
								description="Investment returns per year"
								value={annualGrowthRate}
								onChange={(value) => {
									setAnnualGrowthRate(value);
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
									if (checked && assets.length > 0) {
										const monthlyGrowth = calculateHistoricalMonthlyGrowth(assets);
										console.log(monthlyGrowth);
										const calculatedAnnual = (Math.pow(1 + monthlyGrowth / 100, 12) - 1) * 100;
										setAnnualGrowthRate(calculatedAnnual.toFixed(2));
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

						<NumberInput
							label="Annual Salary Increase (%)"
							description="Expected yearly raise"
							value={annualSalaryIncrease}
							onChange={(value) =>
								typeof value === "number" ? setAnnualSalaryIncrease(value) : setAnnualSalaryIncrease(parseFloat(value) || 0)
							}
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
					</Group>

					<NumberInput
						label="Monthly Savings"
						description="Current monthly contributions"
						value={monthlySavings}
						onChange={(value) =>
							typeof value === "number" ? setMonthlySavings(value) : setMonthlySavings(parseFloat(value) || 0)
						}
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
				</Stack>
			</Paper>

			{/* Yearly Stacked Bar Chart with Wealth Line */}
			{yearlyBreakdown.length > 0 && (
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
							Yearly Income & Growth Breakdown
						</Title>
						<Text size="sm" c="dimmed">
							All values shown in future money values. Labor income increases by {annualSalaryIncrease}% annually.
						</Text>

						<Box h={500}>
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart data={yearlyBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
									<defs>
										<linearGradient id="laborGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
											<stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6} />
										</linearGradient>
										<linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
											<stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
									<XAxis
										dataKey="displayYear"
										tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
										axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
									/>
									<YAxis
										yAxisId="left"
										tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
										axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
									/>
									<YAxis
										yAxisId="right"
										orientation="right"
										tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
										axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
									/>
									<Tooltip content={<CustomYearlyTooltip user={user} />} />
									<Legend
										wrapperStyle={{ paddingTop: "20px" }}
										formatter={(value) => (
											<span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{value}</span>
										)}
									/>
									<Bar
										yAxisId="left"
										dataKey="laborIncome"
										stackId="income"
										fill="url(#laborGradient)"
										name="Labor Income"
										radius={[0, 0, 0, 0]}
									/>
									<Bar
										yAxisId="left"
										dataKey="capitalGains"
										stackId="income"
										fill="url(#capitalGradient)"
										name="Capital Gains"
										radius={[8, 8, 0, 0]}
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="totalWealth"
										stroke="#10b981"
										strokeWidth={3}
										name="Total Wealth"
										dot={{ fill: "#10b981", r: 5, strokeWidth: 2, stroke: "rgba(10,10,10,1)" }}
										activeDot={{ r: 7 }}
									/>
								</ComposedChart>
							</ResponsiveContainer>
						</Box>
					</Stack>
				</Paper>
			)}
		</Stack>
	);
};
