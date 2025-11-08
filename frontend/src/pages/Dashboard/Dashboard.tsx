// frontend/src/pages/Dashboard/Dashboard.tsx

import React, { useState, useEffect } from "react";
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
	Loader,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { DateTimePicker } from "@mantine/dates";
import "@mantine/dates/styles.css";
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
	IconSearch,
} from "@tabler/icons-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getMyAssets, createAsset, updateAsset, deleteAsset, AssetType, type Asset, type AssetCreate } from "../../api/assets";
import StockSearchModal from "../../components/stocks/StockSearchModal";

const ASSET_TYPES = [
	{ value: "stocks", label: "Stocks", icon: IconChartLine, color: "#3b82f6" },
	{ value: "bonds", label: "Bonds", icon: IconBuildingBank, color: "#8b5cf6" },
	{ value: "crypto", label: "Cryptocurrency", icon: IconCoin, color: "#f59e0b" },
	{ value: "real-estate", label: "Real Estate", icon: IconHome, color: "#10b981" },
	{ value: "cash", label: "Cash & Savings", icon: IconWallet, color: "#06b6d4" },
	{ value: "other", label: "Other Assets", icon: IconChartPie, color: "#ec4899" },
];

const Dashboard: React.FC = () => {
	const { user, logout } = useAuth();
	const [assets, setAssets] = useState<Asset[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpened, setModalOpened] = useState(false);
	const [stockSearchOpened, setStockSearchOpened] = useState(false);
	const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
	const [formData, setFormData] = useState<AssetCreate>({
		name: "",
		type: AssetType.STOCKS,
		symbol: "",
		exchange: "",
		purchase_price: 0,
		purchase_date: new Date().toISOString(),
		quantity: 1,
	});

	useEffect(() => {
		loadAssets();
	}, []);

	const loadAssets = async () => {
		setLoading(true);
		const data = await getMyAssets();
		if (data) {
			setAssets(data);
		}
		setLoading(false);
	};

	const totalNetWorth = assets.reduce((sum, asset) => sum + asset.purchase_price * (asset.quantity || 1), 0);

	const handleAddAsset = async () => {
		if (editingAsset) {
			const result = await updateAsset(editingAsset.id, formData);
			if (result) {
				await loadAssets();
			}
		} else {
			const result = await createAsset(formData);
			if (result) {
				await loadAssets();
			}
		}
		setModalOpened(false);
		setEditingAsset(null);
		resetForm();
	};

	const handleDeleteAsset = async (id: number) => {
		if (window.confirm("Are you sure you want to delete this asset?")) {
			const result = await deleteAsset(id);
			if (result) {
				await loadAssets();
			}
		}
	};

	const openEditModal = (asset: Asset) => {
		setEditingAsset(asset);
		setFormData({
			name: asset.name,
			type: asset.type,
			symbol: asset.symbol,
			exchange: asset.exchange,
			purchase_price: asset.purchase_price,
			purchase_date: asset.purchase_date,
			quantity: asset.quantity,
		});
		setModalOpened(true);
	};

	const resetForm = () => {
		setFormData({
			name: "",
			type: AssetType.STOCKS,
			symbol: "",
			exchange: "",
			purchase_price: 0,
			purchase_date: new Date().toISOString(),
			quantity: 1,
		});
	};

	const handleStockSelect = (stock: { symbol: string; name: string; exchange: string }) => {
		setFormData({
			...formData,
			name: stock.name,
			symbol: stock.symbol,
			exchange: stock.exchange,
		});
	};

	const assetsByType = ASSET_TYPES.map((type) => ({
		name: type.label,
		value: assets.filter((a) => a.type === type.value).reduce((sum, a) => sum + a.purchase_price * (a.quantity || 1), 0),
		color: type.color,
	})).filter((item) => item.value > 0);

	if (loading) {
		return (
			<Box style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
				<Loader size="xl" color="blue" />
			</Box>
		);
	}

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
							${totalNetWorth.toLocaleString()}
						</Title>
					</Stack>
				</Box>

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
								resetForm();
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

					{assets.length === 0 ? (
						<Card
							padding="xl"
							radius="lg"
							style={{
								background: "rgba(255,255,255,0.02)",
								border: "1px solid rgba(59, 130, 246, 0.2)",
								backdropFilter: "blur(20px)",
								textAlign: "center",
							}}
						>
							<Stack align="center" gap="md" py="xl">
								<IconChartPie size={64} color="rgba(255,255,255,0.3)" />
								<Text size="lg" c="dimmed">
									No assets yet. Add your first asset to start tracking!
								</Text>
							</Stack>
						</Card>
					) : (
						<Grid gutter="lg">
							{assets.map((asset) => {
								const assetType = ASSET_TYPES.find((t) => t.value === asset.type);
								const Icon = assetType?.icon || IconChartPie;
								const totalValue = asset.purchase_price * (asset.quantity || 1);

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
													{asset.symbol && (
														<Group gap="xs">
															<Text size="xs" c="dimmed">
																{asset.symbol}
															</Text>
															{asset.exchange && (
																<Text size="xs" c="dimmed">
																	• {asset.exchange}
																</Text>
															)}
														</Group>
													)}
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
															${asset.purchase_price.toLocaleString()}
														</Text>
													</Group>
													<Group justify="space-between">
														<Text size="xs" style={{ color: "rgba(255,255,255,0.4)" }}>
															Total Value
														</Text>
														<Text size="lg" fw={700} style={{ color: "white" }}>
															${totalValue.toLocaleString()}
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
									</Grid.Col>
								);
							})}
						</Grid>
					)}
				</Stack>
			</Container>

			{/* Add/Edit Asset Modal */}
			<Modal
				opened={modalOpened}
				onClose={() => {
					setModalOpened(false);
					setEditingAsset(null);
					resetForm();
				}}
				title={editingAsset ? "Edit Asset" : "Add New Asset"}
				centered
				size="md"
				styles={{
					content: { backgroundColor: "#1a1a1a", border: "2px solid #3b82f6" },
					header: { backgroundColor: "#1a1a1a", borderBottom: "1px solid rgba(59, 130, 246, 0.3)" },
					title: { color: "white", fontWeight: 700, fontSize: "1.25rem" },
					body: { backgroundColor: "#1a1a1a" },
				}}
			>
				<Stack gap="md">
					<Select
						label="Asset Type"
						placeholder="Select type"
						value={formData.type}
						onChange={(value) => {
							setFormData({ ...formData, type: value as AssetType });
							// Reset stock-specific fields if changing away from stocks
							if (value !== AssetType.STOCKS) {
								setFormData({ ...formData, type: value as AssetType, symbol: "", exchange: "" });
							}
						}}
						data={ASSET_TYPES.map((t) => ({ value: t.value, label: t.label }))}
						styles={{
							label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
							input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" },
						}}
					/>

					{formData.type === AssetType.STOCKS && (
						<>
							<Button
								leftSection={<IconSearch size={18} />}
								variant="light"
								onClick={() => setStockSearchOpened(true)}
								fullWidth
							>
								Search for Stock
							</Button>

							<TextInput
								label="Stock Symbol"
								placeholder="e.g., AAPL"
								value={formData.symbol || ""}
								onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
								required
								styles={{
									label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
									input: {
										background: "rgba(255,255,255,0.05)",
										border: "1px solid rgba(255,255,255,0.1)",
										color: "white",
									},
								}}
							/>

							<TextInput
								label="Exchange"
								placeholder="e.g., NASDAQ"
								value={formData.exchange || ""}
								onChange={(e) => setFormData({ ...formData, exchange: e.target.value.toUpperCase() })}
								required
								styles={{
									label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
									input: {
										background: "rgba(255,255,255,0.05)",
										border: "1px solid rgba(255,255,255,0.1)",
										color: "white",
									},
								}}
							/>
						</>
					)}

					<TextInput
						label="Asset Name"
						placeholder="e.g., Apple Inc, Bitcoin, etc."
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						required
						styles={{
							label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
							input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" },
						}}
					/>

					<NumberInput
						label="Purchase Price"
						placeholder="Price per unit"
						value={formData.purchase_price}
						onChange={(value) => setFormData({ ...formData, purchase_price: Number(value) || 0 })}
						prefix="$"
						thousandSeparator=","
						decimalScale={2}
						required
						styles={{
							label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
							input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" },
						}}
					/>

					<NumberInput
						label="Quantity"
						placeholder="Number of units"
						value={formData.quantity}
						onChange={(value) => setFormData({ ...formData, quantity: Number(value) || 1 })}
						min={0.000001}
						decimalScale={6}
						required
						styles={{
							label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
							input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" },
						}}
					/>

					<DateTimePicker
						label="Purchase Date"
						placeholder="When did you buy this?"
						value={formData.purchase_date || new Date().toISOString()}
						onChange={(value) => {
							// 'value' is string | null in your Mantine setup
							setFormData({
								...formData,
								purchase_date: value || new Date().toISOString(),
							});
						}}
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
								resetForm();
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddAsset}
							disabled={
								!formData.name ||
								formData.purchase_price <= 0 ||
								!formData.quantity ||
								(formData.type === AssetType.STOCKS && (!formData.symbol || !formData.exchange))
							}
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

			{/* Stock Search Modal */}
			<StockSearchModal opened={stockSearchOpened} onClose={() => setStockSearchOpened(false)} onSelect={handleStockSelect} />
		</Box>
	);
};

export default Dashboard;
