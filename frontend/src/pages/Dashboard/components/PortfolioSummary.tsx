import React from "react";
import { Box, Stack, Text, Title } from "@mantine/core";
import type { Asset } from "../../../api/assets";
import getGrowthPercent from "../../../common/getGrowthPercent";

interface PortfolioSummaryProps {
	assets: Asset[];
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ assets }) => {
	const totalNetWorth = assets.reduce((sum, asset) => {
		const currentPrice = asset.current_price || asset.purchase_price;
		return sum + currentPrice * (asset.quantity || 1);
	}, 0);

	const totalGrowth = assets.reduce((sum, asset) => {
		const growth = getGrowthPercent(asset.purchase_price, asset.current_price || asset.purchase_price);
		return sum + parseFloat(growth);
	}, 0);

	return (
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
	);
};
