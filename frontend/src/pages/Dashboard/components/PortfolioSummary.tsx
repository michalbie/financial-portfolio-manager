import React, { useEffect, useState } from "react";
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

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ assets }) => {
	const [portfolioStatistics, setPortfolioStatistics] = useState<PortfolioStat[]>([]);

	// Compute distribution by asset type
	const portfolioDistribution = assets.reduce((acc, asset) => {
		const currentPrice = asset.current_price || asset.purchase_price;
		acc[asset.type] = (acc[asset.type] || 0) + currentPrice * (asset.quantity || 1);
		return acc;
	}, {} as Record<string, number>);

	const pieData = Object.entries(portfolioDistribution).map(([type, value]) => ({
		name: type,
		value,
	}));

	// Compute total portfolio value and growth
	const totalNetWorth = assets.reduce((sum, asset) => {
		const currentPrice = asset.current_price || asset.purchase_price;
		return sum + currentPrice * (asset.quantity || 1);
	}, 0);

	const totalGrowth = assets.reduce((sum, asset) => {
		const growth = getGrowthPercent(asset.purchase_price, asset.current_price || asset.purchase_price);
		return sum + parseFloat(growth);
	}, 0);

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
						${totalNetWorth.toFixed(2)}
					</Title>
					<Text
						size="lg"
						fw={500}
						style={{
							color: totalGrowth >= 0 ? "#10b981" : "#ef4444",
						}}
					>
						{totalGrowth >= 0 ? "+" : ""}
						{totalGrowth.toLocaleString()}%
					</Text>
				</Stack>
			</Box>

			{/* Charts */}
			<Flex justify="space-between" align="center" mb={20} gap="xl" wrap="wrap">
				{/* Line Chart: Portfolio Value Over Time */}
				<Box style={{ flex: 1, minWidth: "400px" }}>
					<Text size="lg" fw={600} mb={10} style={{ color: "rgba(255,255,255,0.7)" }}>
						Portfolio Value Over Time
					</Text>
					<ResponsiveContainer width="100%" height={300}>
						<LineChart data={portfolioStatistics}>
							<XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.5)" }} />
							<YAxis tick={{ fill: "rgba(255,255,255,0.5)" }} />
							<Tooltip
								contentStyle={{
									backgroundColor: "rgba(30,41,59,0.9)",
									border: "1px solid rgba(59,130,246,0.3)",
								}}
							/>
							<Line
								type="monotone"
								dataKey="total_portfolio_value"
								stroke="#3b82f6"
								strokeWidth={3}
								dot={false}
								activeDot={{ r: 6 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</Box>

				{/* Pie Chart: Asset Type Distribution */}
				<Box style={{ flex: 1, minWidth: "400px" }}>
					<Text size="lg" fw={600} mb={10} style={{ color: "rgba(255,255,255,0.7)" }}>
						Portfolio Distribution by Asset Type
					</Text>
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
								{pieData.map((_, index) => (
									<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
							<Tooltip
								contentStyle={{
									backgroundColor: "rgba(30,41,59,0.9)",
									border: "1px solid rgba(59,130,246,0.3)",
								}}
							/>
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</Box>
			</Flex>
		</Box>
	);
};
