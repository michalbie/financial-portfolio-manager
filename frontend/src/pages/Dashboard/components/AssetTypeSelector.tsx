import React from "react";
import { Stack, Text, Grid, Box } from "@mantine/core";
import { AssetType } from "../../../api/assets";
import { IconChartLine, IconBuildingBank, IconCoin, IconHome, IconWallet, IconChartPie } from "@tabler/icons-react";

export const ASSET_TYPES = [
	{ value: "stocks", label: "Stocks", icon: IconChartLine, color: "#3b82f6" },
	{ value: "bonds", label: "Bonds", icon: IconBuildingBank, color: "#8b5cf6" },
	{ value: "crypto", label: "Cryptocurrency", icon: IconCoin, color: "#f59e0b" },
	{ value: "real-estate", label: "Real Estate", icon: IconHome, color: "#10b981" },
	{ value: "savings", label: "Savings", icon: IconWallet, color: "#06b6d4" },
	{ value: "other", label: "Other Assets", icon: IconChartPie, color: "#ec4899" },
];

interface AssetTypeSelectorProps {
	selectedType: AssetType;
	onSelect: (type: AssetType) => void;
}

export const AssetTypeSelector: React.FC<AssetTypeSelectorProps> = ({ selectedType, onSelect }) => {
	return (
		<Stack gap="md" mt="xl">
			<Text size="sm" c="dimmed">
				Select the type of asset you want to add
			</Text>

			<Grid gutter="md">
				{ASSET_TYPES.map((type) => {
					const Icon = type.icon;
					const isSelected = selectedType === type.value;

					return (
						<Grid.Col key={type.value} span={6}>
							<Box
								onClick={() => onSelect(type.value as AssetType)}
								style={{
									padding: "20px",
									border: isSelected ? `2px solid ${type.color}` : "1px solid rgba(255,255,255,0.1)",
									borderRadius: "12px",
									background: isSelected ? `${type.color}15` : "rgba(255,255,255,0.02)",
									cursor: "pointer",
									transition: "all 0.2s",
								}}
							>
								<Stack gap="sm" align="center">
									<Icon size={32} color={type.color} />
									<Text size="sm" fw={600} style={{ color: "white" }}>
										{type.label}
									</Text>
								</Stack>
							</Box>
						</Grid.Col>
					);
				})}
			</Grid>
		</Stack>
	);
};
