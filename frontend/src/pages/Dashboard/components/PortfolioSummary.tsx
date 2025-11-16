import React, { useEffect, useMemo, useState } from "react";
import { Box, Flex, Stack, Text, Title } from "@mantine/core";
import type { Asset } from "../../../api/assets";
import getGrowthPercent from "../../../common/getGrowthPercent";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { getMyStatistics } from "../../../api/stats";

interface PortfolioSummaryProps {
	assets: Asset[];
}

interface PortfolioStat {
	id: number;
	user_id: number;
	date: string;
	total_portfolio_value: number;
	created_at: string;
	updated_at: string;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#14b8a6", "#6366f1"];

// Custom tooltip for line chart
const CustomLineTooltip = ({ active, payload }: any) => {
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
				<Text size="sm" fw={500} style={{ color: "white", marginBottom: "4px" }}>
					{payload[0].payload.fullDateTime}
				</Text>
				<Text size="sm" style={{ color: "#3b82f6" }}>
					${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
				</Text>
			</Box>
		);
	}
	return null;
};

// Custom tooltip for pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
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
				<Text size="sm" fw={500} style={{ color: "white", marginBottom: "4px" }}>
					{payload[0].name}
				</Text>
				<Text size="sm" style={{ color: payload[0].payload.fill }}>
					${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
				</Text>
				<Text size="xs" style={{ color: "rgba(255,255,255,0.6)" }}>
					{payload[0].payload.percentage}%
				</Text>
			</Box>
		);
	}
	return null;
};

// Custom legend renderer to show percentages
const renderLegend = (props: any) => {
	const { payload } = props;
	return (
		<Box style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px", marginTop: "16px" }}>
			{payload.map((entry: any, index: number) => (
				<Box key={`legend-${index}`} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Box
						style={{
							width: "12px",
							height: "12px",
							borderRadius: "50%",
							backgroundColor: entry.color,
						}}
					/>
					<Text size="sm" style={{ color: "rgba(255,255,255,0.7)" }}>
						{entry.value}: {entry.payload.percentage}%
					</Text>
				</Box>
			))}
		</Box>
	);
};

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ assets }) => {
	const [portfolioStatistics, setPortfolioStatistics] = useState<PortfolioStat[]>([]);

	// Compute distribution by asset type
	const portfolioDistribution = assets.reduce((acc, asset) => {
		const currentPrice = asset.current_price || asset.purchase_price;
		acc[asset.type] = (acc[asset.type] || 0) + currentPrice * (asset.quantity || 1);
		return acc;
	}, {} as Record<string, number>);

	// Calculate total for percentages
	const totalValue = Object.values(portfolioDistribution).reduce((sum, val) => sum + val, 0);

	// Prepare pie chart data with percentages
	const pieData = Object.entries(portfolioDistribution).map(([type, value]) => ({
		name: type.charAt(0).toUpperCase() + type.slice(1).replace("-", " "),
		value,
		percentage: ((value / totalValue) * 100).toFixed(1),
	}));

	// Compute total portfolio value and growth
	const totalNetWorth = useMemo(() => {
		if (portfolioStatistics.length === 0) return 0;
		return portfolioStatistics[portfolioStatistics.length - 1].total_portfolio_value || 0;
	}, [portfolioStatistics]);

	// Growth this month
	const thisMonthGrowth = useMemo(() => {
		if (portfolioStatistics.length === 0) return 0;

		const now = new Date();
		const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const oneMonthAgo = new Date(firstDayOfMonth);

		const pastStat = portfolioStatistics
			.slice()
			.reverse()
			.find((stat) => new Date(stat.date) <= oneMonthAgo);

		if (pastStat) {
			return parseFloat(getGrowthPercent(pastStat.total_portfolio_value, totalNetWorth));
		}
		return 0;
	}, [portfolioStatistics, totalNetWorth]);

	// Format chart data for better display - keep full datetime for unique data points
	const formattedChartData = portfolioStatistics.map((stat) => {
		const dateObj = new Date(stat.date);
		return {
			...stat,
			dateDisplay: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
			timeDisplay: dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
			fullDateTime: dateObj.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}),
			total_portfolio_value: stat.total_portfolio_value,
		};
	});

	useEffect(() => {
		getMyStatistics().then((data) => {
			if (data === null) return;
			setPortfolioStatistics(data);
		});
	}, []);

	return (
		<Box>
			{/* Summary Card */}
			<Box
				mb={40}
				p={60}
				style={{
					background: "rgba(255,255,255,0.02)",
					border: "1px solid rgba(59, 130, 246, 0.2)",
					borderRadius: "24px",
					backdropFilter: "blur(20px)",
				}}
			>
				<Stack align="center" gap="md">
					<Text
						size="sm"
						fw={500}
						style={{
							color: "rgba(255,255,255,0.4)",
							letterSpacing: "0.1em",
							textTransform: "uppercase",
						}}
					>
						Total Portfolio Value
					</Text>
					<Title
						order={1}
						style={{
							fontSize: "96px",
							fontWeight: 900,
							background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
							backgroundClip: "text",
							letterSpacing: "-0.02em",
							lineHeight: 1,
						}}
					>
						${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</Title>
					<Text
						size="lg"
						fw={500}
						style={{
							color: thisMonthGrowth >= 0 ? "#10b981" : "#ef4444",
						}}
					>
						{thisMonthGrowth >= 0 ? "+" : ""}
						{thisMonthGrowth.toFixed(2)}% this month
					</Text>
				</Stack>
			</Box>

			{/* Charts */}
			{(portfolioStatistics.length > 0 || pieData.length > 0) && (
				<Flex justify="space-between" align="flex-start" mb={20} gap="xl" wrap="wrap">
					{/* Line Chart: Portfolio Value Over Time */}
					{portfolioStatistics.length > 0 && (
						<Box
							style={{
								flex: 1,
								minWidth: "400px",
								background: "rgba(255,255,255,0.02)",
								border: "1px solid rgba(59, 130, 246, 0.2)",
								borderRadius: "16px",
								padding: "24px",
								backdropFilter: "blur(20px)",
							}}
						>
							<Text size="lg" fw={600} mb={20} style={{ color: "white" }}>
								Portfolio Value Over Time
							</Text>
							<ResponsiveContainer width="100%" height={300}>
								<LineChart data={formattedChartData}>
									<defs>
										<linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
										</linearGradient>
									</defs>
									<XAxis
										dataKey="fullDateTime"
										tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
										axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickFormatter={(value) => {
											// Show date and time for better clarity
											const date = new Date(value);
											return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
										}}
									/>
									<YAxis
										tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
										axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
										tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
									/>
									<Tooltip content={<CustomLineTooltip />} />
									<Line
										type="monotone"
										dataKey="total_portfolio_value"
										stroke="#3b82f6"
										strokeWidth={3}
										dot={{ fill: "#3b82f6", r: 4, strokeWidth: 2, stroke: "rgba(10,10,10,1)" }}
										activeDot={{ r: 6, fill: "#3b82f6", stroke: "rgba(10,10,10,1)", strokeWidth: 2 }}
										fillOpacity={1}
										fill="url(#lineGradient)"
									/>
								</LineChart>
							</ResponsiveContainer>
						</Box>
					)}

					{/* Pie Chart: Asset Type Distribution */}
					{pieData.length > 0 && (
						<Box
							style={{
								flex: 1,
								minWidth: "400px",
								background: "rgba(255,255,255,0.02)",
								border: "1px solid rgba(59, 130, 246, 0.2)",
								borderRadius: "16px",
								padding: "24px",
								backdropFilter: "blur(20px)",
							}}
						>
							<Text size="lg" fw={600} mb={20} style={{ color: "white" }}>
								Portfolio Distribution
							</Text>
							<Box h={300}>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={pieData}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={80}
											paddingAngle={2}
											dataKey="value"
										>
											{pieData.map((_, index) => (
												<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
											))}
										</Pie>
										<Tooltip content={<CustomPieTooltip />} />
										<Legend content={renderLegend} />
									</PieChart>
								</ResponsiveContainer>
							</Box>
						</Box>
					)}
				</Flex>
			)}
		</Box>
	);
};
