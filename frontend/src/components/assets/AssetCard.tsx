import React, { useState } from "react";
import { Card, Stack, Box, Group, ActionIcon, Menu, Text, Title, Divider } from "@mantine/core";
import { IconCash, IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import type { Asset } from "../../api/assets";
import getGrowthPercent from "../../common/getGrowthPercent";
import ClosePositionModal from "./ClosePositionModal";

interface AssetCardProps {
	asset: Asset;
	assetType: {
		label: string;
		icon: React.ComponentType<{ size?: number; color?: string }>;
		color: string;
	};
	onEdit: (asset: Asset) => void;
	onDelete: (id: number) => void;
	onClosePosition: (id: number, taxFromProfit: number, transferToSavings: boolean) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, assetType, onEdit, onDelete, onClosePosition }) => {
	const [closePositionModalOpened, setClosePositionModalOpened] = useState(false);
	const Icon = assetType.icon;
	const totalValue = (asset.current_price || asset.purchase_price) * (asset.quantity || 1);
	const growthChange: string = getGrowthPercent(asset.purchase_price, asset.current_price || asset.purchase_price);
	const growthValue: string = `${asset.current_price && asset.current_price > asset.purchase_price ? "+" : ""}${growthChange}%`;

	return (
		<Card
			padding="lg"
			radius="lg"
			style={{
				background: "rgba(255,255,255,0.02)",
				border: "1px solid rgba(59, 130, 246, 0.2)",
				backdropFilter: "blur(20px)",
				height: "100%",
			}}
		>
			<Stack gap="md" h="100%">
				<Group justify="space-between">
					<Box
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "10px",
							background: `${assetType.color}15`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Icon size={20} color={assetType.color} />
					</Box>
					<Menu position="bottom-end">
						<Menu.Target>
							<ActionIcon variant="subtle" color="gray">
								<IconDotsVertical size={18} />
							</ActionIcon>
						</Menu.Target>
						<Menu.Dropdown
							style={{
								background: "rgba(0,0,0,0.95)",
								border: "1px solid rgba(59, 130, 246, 0.2)",
							}}
						>
							{asset.type !== "stocks" && (
								<Menu.Item leftSection={<IconEdit size={16} />} onClick={() => onEdit(asset)} style={{ color: "white" }}>
									Edit
								</Menu.Item>
							)}
							{(asset.type === "stocks" || asset.type === "crypto" || asset.type === "bonds") && (
								<>
									<Menu.Item
										leftSection={<IconCash size={16} />}
										onClick={() => setClosePositionModalOpened(true)}
										style={{ color: "white" }}
									>
										Close position
									</Menu.Item>
								</>
							)}
							<Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => onDelete(asset.id)}>
								Delete
							</Menu.Item>
						</Menu.Dropdown>
					</Menu>
					<ClosePositionModal
						opened={closePositionModalOpened}
						setOpened={(opened) => {
							setClosePositionModalOpened(opened);
						}}
						onClosePosition={onClosePosition}
						asset={asset}
					/>
				</Group>

				<Stack gap={4} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
					<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
						{assetType.label}
					</Text>
					<Title order={4} style={{ color: "white" }} lineClamp={1}>
						{asset.name}
					</Title>
					{asset.symbol && (
						<Group gap="xs">
							<Text size="xs" c="dimmed">
								{asset.symbol}
							</Text>
							{asset.mic_code && (
								<Text size="xs" c="dimmed">
									• {asset.mic_code}
								</Text>
							)}
						</Group>
					)}

					<Divider color="rgba(255,255,255,0.1)" />

					<Text
						size="sm"
						fw={600}
						style={{
							color: asset.current_price ? (asset.current_price > asset.purchase_price ? "#10b981" : "#ef4444") : "gray",
						}}
					>
						{asset.current_price ? `${growthValue}` : "N/A"}
					</Text>
				</Stack>

				<Box style={{ flex: 1 }} />

				<Divider color="rgba(255,255,255,0.1)" />

				<Stack gap="xs">
					<Group justify="space-between">
						<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
							Quantity
						</Text>
						<Text size="sm" fw={600} style={{ color: "white" }}>
							{asset.quantity || 1}
						</Text>
					</Group>
					<Group justify="space-between">
						<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
							Purchase Price
						</Text>
						<Text size="sm" fw={600} style={{ color: "white" }}>
							{asset.currency + " " + asset.purchase_price.toLocaleString()}
						</Text>
					</Group>
					<Group justify="space-between">
						<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
							Total Value
						</Text>
						<Text size="lg" fw={700} style={{ color: "white" }}>
							{(asset.type === "stocks" || asset.type === "crypto") && asset.current_price && (
								<span style={{ marginRight: 4, fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
									({asset.currency + " " + asset.current_price.toFixed(2)})
								</span>
							)}
							{asset.currency + " " + totalValue.toLocaleString()}
						</Text>
					</Group>
					{asset.purchase_date && (
						<Group justify="space-between">
							<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
								Purchase Date
							</Text>
							<Text size="xs" style={{ color: "rgba(255,255,255,0.6)" }}>
								{new Date(asset.purchase_date).toLocaleDateString()}
							</Text>
						</Group>
					)}
				</Stack>
			</Stack>
		</Card>
	);
};
