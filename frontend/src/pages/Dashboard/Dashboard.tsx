import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
	Container,
	Title,
	Text,
	Button,
	Stack,
	Box,
	Group,
	Grid,
	Card,
	Modal,
	TextInput,
	Select,
	NumberInput,
	ActionIcon,
	Menu,
	Divider,
} from "@mantine/core";
import "@mantine/core/styles.css";
import {
	IconPlus,
	IconTrendingUp,
	IconTrendingDown,
	IconLogout,
	IconDotsVertical,
	IconEdit,
	IconTrash,
	IconChartPie,
	IconBuildingBank,
	IconHome,
	IconCoin,
	IconChartLine,
	IconWallet,
} from "@tabler/icons-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Asset {
	id: string;
	name: string;
	type: "stocks" | "bonds" | "crypto" | "real-estate" | "cash" | "other";
	value: number;
	purchasePrice: number;
}

const ASSET_TYPES = [
	{ value: "stocks", label: "Stocks", icon: IconChartLine, color: "#3b82f6" },
	{ value: "bonds", label: "Bonds", icon: IconBuildingBank, color: "#8b5cf6" },
	{ value: "crypto", label: "Cryptocurrency", icon: IconCoin, color: "#f59e0b" },
	{ value: "real-estate", label: "Real Estate", icon: IconHome, color: "#10b981" },
	{ value: "cash", label: "Cash & Savings", icon: IconWallet, color: "#06b6d4" },
	{ value: "other", label: "Other Assets", icon: IconChartPie, color: "#ec4899" },
];

// Mock historical data
const historicalData = [
	{ month: "Jan", value: 950000 },
	{ month: "Feb", value: 980000 },
	{ month: "Mar", value: 1020000 },
	{ month: "Apr", value: 1100000 },
	{ month: "May", value: 1150000 },
	{ month: "Jun", value: 1247382 },
];

const Dashboard: React.FC = () => {
	const { user, logout } = useAuth();
	const [assets, setAssets] = useState<Asset[]>([
		{ id: "1", name: "Apple Stock", type: "stocks", value: 450000, purchasePrice: 400000 },
		{ id: "2", name: "Treasury Bonds", type: "bonds", value: 200000, purchasePrice: 200000 },
		{ id: "3", name: "Bitcoin", type: "crypto", value: 150000, purchasePrice: 100000 },
		{ id: "4", name: "Primary Residence", type: "real-estate", value: 400000, purchasePrice: 350000 },
		{ id: "5", name: "Savings Account", type: "cash", value: 47382, purchasePrice: 47382 },
	]);
	const [modalOpened, setModalOpened] = useState(false);
	const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		type: "stocks" as Asset["type"],
		value: 0,
		purchasePrice: 0,
	});

	const totalNetWorth = assets.reduce((sum, asset) => sum + asset.value, 0);
	const totalGainLoss = assets.reduce((sum, asset) => sum + (asset.value - asset.purchasePrice), 0);
	const gainLossPercentage = ((totalGainLoss / (totalNetWorth - totalGainLoss)) * 100).toFixed(2);

	const handleAddAsset = () => {
		if (editingAsset) {
			setAssets(assets.map((a) => (a.id === editingAsset.id ? { ...editingAsset, ...formData } : a)));
		} else {
			const newAsset: Asset = {
				id: Date.now().toString(),
				...formData,
			};
			setAssets([...assets, newAsset]);
		}
		setModalOpened(false);
		setEditingAsset(null);
		setFormData({ name: "", type: "stocks", value: 0, purchasePrice: 0 });
	};

	const handleDeleteAsset = (id: string) => {
		setAssets(assets.filter((a) => a.id !== id));
	};

	const openEditModal = (asset: Asset) => {
		setEditingAsset(asset);
		setFormData({
			name: asset.name,
			type: asset.type,
			value: asset.value,
			purchasePrice: asset.purchasePrice,
		});
		setModalOpened(true);
	};

	const assetsByType = ASSET_TYPES.map((type) => ({
		name: type.label,
		value: assets.filter((a) => a.type === type.value).reduce((sum, a) => sum + a.value, 0),
		color: type.color,
	})).filter((item) => item.value > 0);

	return (
		<Box style={{ background: "#0a0a0a", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
			{/* Background effects */}
			<Box
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
          `,
					backgroundSize: "50px 50px",
					opacity: 0.3,
				}}
			/>

			<Box
				style={{
					position: "absolute",
					top: "10%",
					left: "50%",
					transform: "translateX(-50%)",
					width: "1000px",
					height: "1000px",
					background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
					pointerEvents: "none",
				}}
			/>

			<Container size="xl" style={{ position: "relative", zIndex: 1 }} py={40}>
				{/* Header */}
				<Group justify="space-between" mb={40}>
					<Stack gap={4}>
						<Text size="sm" style={{ color: "rgba(255,255,255,0.4)" }}>
							Welcome back,
						</Text>
						<Title order={2} style={{ color: "white" }}>
							{user?.name || "Loading..."}
						</Title>
					</Stack>
					<Button leftSection={<IconLogout size={18} />} variant="subtle" color="gray" onClick={logout}>
						Logout
					</Button>
				</Group>

				{/* Main Net Worth Display */}
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
							Total Net Worth
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
							${totalNetWorth.toLocaleString()}
						</Title>
						<Group gap="xs">
							{totalGainLoss >= 0 ? (
								<IconTrendingUp size={20} color="#10b981" />
							) : (
								<IconTrendingDown size={20} color="#ef4444" />
							)}
							<Text size="lg" fw={600} style={{ color: totalGainLoss >= 0 ? "#10b981" : "#ef4444" }}>
								{totalGainLoss >= 0 ? "+" : ""}${totalGainLoss.toLocaleString()} ({gainLossPercentage}%)
							</Text>
							<Text size="sm" style={{ color: "rgba(255,255,255,0.4)" }}>
								all time
							</Text>
						</Group>
					</Stack>
				</Box>

				{/* Charts Section */}
				<Grid gutter="xl" mb={40}>
					{/* Performance Chart */}
					<Grid.Col span={{ base: 12, md: 8 }}>
						<Card
							padding="xl"
							radius="lg"
							style={{
								background: "rgba(255,255,255,0.02)",
								border: "1px solid rgba(59, 130, 246, 0.2)",
								backdropFilter: "blur(20px)",
							}}
						>
							<Stack gap="lg">
								<Group justify="space-between">
									<div>
										<Title order={3} style={{ color: "white" }} mb={4}>
											Performance
										</Title>
										<Text size="sm" style={{ color: "rgba(255,255,255,0.4)" }}>
											Last 6 months
										</Text>
									</div>
								</Group>
								<Box h={300}>
									<ResponsiveContainer width="100%" height="100%">
										<LineChart data={historicalData}>
											<defs>
												<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
													<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
											<XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" style={{ fontSize: "12px" }} />
											<YAxis
												stroke="rgba(255,255,255,0.4)"
												style={{ fontSize: "12px" }}
												tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
											/>
											<Tooltip
												contentStyle={{
													background: "rgba(0,0,0,0.9)",
													border: "1px solid rgba(59, 130, 246, 0.3)",
													borderRadius: "8px",
													color: "white",
												}}
												formatter={(value: number) => [`$${value.toLocaleString()}`, "Net Worth"]}
											/>
											<Line
												type="monotone"
												dataKey="value"
												stroke="#3b82f6"
												strokeWidth={3}
												dot={{ fill: "#3b82f6", r: 4 }}
												activeDot={{ r: 6 }}
												fill="url(#colorValue)"
											/>
										</LineChart>
									</ResponsiveContainer>
								</Box>
							</Stack>
						</Card>
					</Grid.Col>

					{/* Asset Allocation */}
					<Grid.Col span={{ base: 12, md: 4 }}>
						<Card
							padding="xl"
							radius="lg"
							style={{
								background: "rgba(255,255,255,0.02)",
								border: "1px solid rgba(59, 130, 246, 0.2)",
								backdropFilter: "blur(20px)",
							}}
						>
							<Stack gap="lg">
								<div>
									<Title order={3} style={{ color: "white" }} mb={4}>
										Asset Allocation
									</Title>
									<Text size="sm" style={{ color: "rgba(255,255,255,0.4)" }}>
										Portfolio breakdown
									</Text>
								</div>
								<Box h={200}>
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={assetsByType}
												cx="50%"
												cy="50%"
												innerRadius={60}
												outerRadius={80}
												paddingAngle={2}
												dataKey="value"
											>
												{assetsByType.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												))}
											</Pie>
										</PieChart>
									</ResponsiveContainer>
								</Box>
								<Stack gap="xs">
									{assetsByType.map((item) => (
										<Group key={item.name} justify="space-between">
											<Group gap="xs">
												<Box w={12} h={12} style={{ borderRadius: "4px", background: item.color }} />
												<Text size="sm" style={{ color: "rgba(255,255,255,0.7)" }}>
													{item.name}
												</Text>
											</Group>
											<Text size="sm" fw={600} style={{ color: "white" }}>
												{((item.value / totalNetWorth) * 100).toFixed(1)}%
											</Text>
										</Group>
									))}
								</Stack>
							</Stack>
						</Card>
					</Grid.Col>
				</Grid>

				{/* Assets Section */}
				<Stack gap="lg">
					<Group justify="space-between">
						<div>
							<Title order={2} style={{ color: "white" }} mb={4}>
								Your Assets
							</Title>
							<Text size="sm" style={{ color: "rgba(255,255,255,0.4)" }}>
								Manage your investment portfolio
							</Text>
						</div>
						<Button
							leftSection={<IconPlus size={18} />}
							size="lg"
							radius="xl"
							onClick={() => {
								setEditingAsset(null);
								setFormData({ name: "", type: "stocks", value: 0, purchasePrice: 0 });
								setModalOpened(true);
							}}
							style={{
								background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
								border: "none",
							}}
						>
							Add Asset
						</Button>
					</Group>

					<Grid gutter="lg">
						{assets.map((asset) => {
							const assetType = ASSET_TYPES.find((t) => t.value === asset.type);
							const Icon = assetType?.icon || IconChartPie;
							const gainLoss = asset.value - asset.purchasePrice;
							const gainLossPercent = ((gainLoss / asset.purchasePrice) * 100).toFixed(2);

							return (
								<Grid.Col key={asset.id} span={{ base: 12, sm: 6, md: 4 }}>
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
														background: `${assetType?.color}15`,
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}
												>
													<Icon size={20} color={assetType?.color} />
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
														<Menu.Item
															leftSection={<IconEdit size={16} />}
															onClick={() => openEditModal(asset)}
															style={{ color: "white" }}
														>
															Edit
														</Menu.Item>
														<Menu.Item
															leftSection={<IconTrash size={16} />}
															color="red"
															onClick={() => handleDeleteAsset(asset.id)}
														>
															Delete
														</Menu.Item>
													</Menu.Dropdown>
												</Menu>
											</Group>

											<Stack gap={4}>
												<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
													{assetType?.label}
												</Text>
												<Title order={4} style={{ color: "white" }} lineClamp={1}>
													{asset.name}
												</Title>
											</Stack>

											<Box style={{ flex: 1 }} />

											<Divider color="rgba(255,255,255,0.1)" />

											<Stack gap="xs">
												<Group justify="space-between">
													<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
														Current Value
													</Text>
													<Text size="lg" fw={700} style={{ color: "white" }}>
														${asset.value.toLocaleString()}
													</Text>
												</Group>
												<Group justify="space-between">
													<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
														Gain/Loss
													</Text>
													<Text size="sm" fw={600} style={{ color: gainLoss >= 0 ? "#10b981" : "#ef4444" }}>
														{gainLoss >= 0 ? "+" : ""}${gainLoss.toLocaleString()} ({gainLossPercent}%)
													</Text>
												</Group>
											</Stack>
										</Stack>
									</Card>
								</Grid.Col>
							);
						})}
					</Grid>
				</Stack>
			</Container>

			{/* Add/Edit Asset Modal */}
			<Modal
				opened={modalOpened}
				onClose={() => {
					setModalOpened(false);
					setEditingAsset(null);
				}}
				title={editingAsset ? "Edit Asset" : "Add New Asset"}
				centered
				size="md"
				withinPortal={false}
				overlayProps={{
					backgroundOpacity: 0.55,
					blur: 3,
				}}
				styles={{
					content: {
						backgroundColor: "#1a1a1a",
						border: "2px solid #3b82f6",
					},
					header: {
						backgroundColor: "#1a1a1a",
						borderBottom: "1px solid rgba(59, 130, 246, 0.3)",
					},
					title: {
						color: "white",
						fontWeight: 700,
						fontSize: "1.25rem",
					},
					body: {
						backgroundColor: "#1a1a1a",
					},
				}}
			>
				<Stack gap="md">
					<TextInput
						label="Asset Name"
						placeholder="e.g., Apple Stock, Bitcoin, etc."
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						styles={{
							label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
							input: {
								background: "rgba(255,255,255,0.05)",
								border: "1px solid rgba(255,255,255,0.1)",
								color: "white",
							},
						}}
					/>

					<Select
						label="Asset Type"
						placeholder="Select type"
						value={formData.type}
						onChange={(value) => setFormData({ ...formData, type: value as Asset["type"] })}
						data={ASSET_TYPES.map((t) => ({ value: t.value, label: t.label }))}
						styles={{
							label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
							input: {
								background: "rgba(255,255,255,0.05)",
								border: "1px solid rgba(255,255,255,0.1)",
								color: "white",
							},
						}}
					/>

					<NumberInput
						label="Current Value"
						placeholder="Current market value"
						value={formData.value}
						onChange={(value) => setFormData({ ...formData, value: Number(value) || 0 })}
						prefix="$"
						thousandSeparator=","
						styles={{
							label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
							input: {
								background: "rgba(255,255,255,0.05)",
								border: "1px solid rgba(255,255,255,0.1)",
								color: "white",
							},
						}}
					/>

					<NumberInput
						label="Purchase Price"
						placeholder="Original purchase price"
						value={formData.purchasePrice}
						onChange={(value) => setFormData({ ...formData, purchasePrice: Number(value) || 0 })}
						prefix="$"
						thousandSeparator=","
						styles={{
							label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
							input: {
								background: "rgba(255,255,255,0.05)",
								border: "1px solid rgba(255,255,255,0.1)",
								color: "white",
							},
						}}
					/>

					<Group justify="flex-end" mt="md">
						<Button
							variant="subtle"
							color="gray"
							onClick={() => {
								setModalOpened(false);
								setEditingAsset(null);
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddAsset}
							disabled={!formData.name || formData.value <= 0 || formData.purchasePrice <= 0}
							style={{
								background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
								border: "none",
							}}
						>
							{editingAsset ? "Update" : "Add"} Asset
						</Button>
					</Group>
				</Stack>
			</Modal>
		</Box>
	);
};

export default Dashboard;
