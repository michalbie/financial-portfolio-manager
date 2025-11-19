import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Container, Title, Text, Button, Stack, Box, Group, Grid, Card, Modal, Stepper, Loader, TextInput } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { IconPlus, IconChartPie } from "@tabler/icons-react";
import {
	getMyAssets,
	createAsset,
	updateAsset,
	deleteAsset,
	AssetType,
	type Asset,
	type AssetCreate,
	closeAsset,
	AssetStatus,
} from "../../api/assets";
import { DashboardHeader } from "./components/DashboardHeader";
import { PortfolioSummary } from "./components/PortfolioSummary";
import { AssetTypeSelector, ASSET_TYPES } from "./components/AssetTypeSelector";
import { AssetCard } from "../../components/assets/AssetCard";
import { StockDetailsForm } from "../../components/stocks/StockDetailsForm";
import { BondsDetailsForm } from "../../components/bonds/BondsDetailsForm";
import { CommonAssetFields } from "../../components/common/CommonAssetFields";
import { SavingsDetailsForm } from "../../components/savings/SavingsDetailsForm";
import { CryptoDetailsForm } from "../../components/crypto/CryptoDetailsForm";

const Dashboard: React.FC = () => {
	const { user } = useAuth();
	const [assets, setAssets] = useState<Asset[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpened, setModalOpened] = useState(false);
	const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
	const [activeStep, setActiveStep] = useState(0);
	const hasPrimarySavingsAccount = user?.user_settings?.primary_saving_asset_id;

	const [formData, setFormData] = useState<AssetCreate>({
		name: "",
		type: AssetType.STOCKS,
		symbol: "",
		mic_code: "",
		purchase_price: 0,
		currency: "USD",
		purchase_date: new Date().toISOString(),
		exchange: undefined,
		quantity: 1,
		deduct_from_savings: hasPrimarySavingsAccount ? true : false,
		bond_settings: null,
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
		closeModal();
	};

	const handleDeleteAsset = async (id: number) => {
		if (window.confirm("Are you sure you want to delete this asset?")) {
			const result = await deleteAsset(id);
			if (result) {
				await loadAssets();
			}
		}
	};

	const onClosePosition = async (id: number, taxFromProfit: number, transferToSavings: boolean) => {
		if (window.confirm("Are you sure you want to close this position?")) {
			const result = await closeAsset(id, taxFromProfit, transferToSavings);
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
			mic_code: asset.mic_code,
			currency: asset.currency || "USD",
			purchase_price: asset.purchase_price,
			purchase_date: asset.purchase_date,
			exchange: asset.exchange,
			quantity: asset.quantity,
			deduct_from_savings: hasPrimarySavingsAccount ? true : false,
			bond_settings: asset.bond_settings || null,
		});
		setActiveStep(1);
		setModalOpened(true);
	};

	const resetForm = () => {
		setFormData({
			name: "",
			type: AssetType.STOCKS,
			symbol: "",
			mic_code: "",
			purchase_price: 0,
			currency: "USD",
			purchase_date: new Date().toISOString(),
			exchange: undefined,
			quantity: 1,
			deduct_from_savings: hasPrimarySavingsAccount ? true : false,
			bond_settings: null,
		});
		setActiveStep(0);
	};

	const closeModal = () => {
		setModalOpened(false);
		setEditingAsset(null);
		resetForm();
	};

	const nextStep = () => setActiveStep((current) => (current < 1 ? current + 1 : current));
	const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current));

	const renderDetailsForm = useCallback(() => {
		switch (formData.type) {
			case AssetType.STOCKS:
				return (
					<StockDetailsForm
						name={formData.name}
						symbol={formData.symbol || ""}
						micCode={formData.mic_code || ""}
						purchasePrice={formData.purchase_price}
						quantity={formData.quantity || 1}
						purchaseDate={formData.purchase_date || new Date().toISOString()}
						currency={formData.currency}
						deductFromSavings={formData.deduct_from_savings}
						onNameChange={(value) => setFormData({ ...formData, name: value })}
						onSymbolChange={(symbol, name, micCode, exchange, currency) =>
							setFormData({ ...formData, symbol, name, mic_code: micCode, exchange, currency: currency })
						}
						onPurchasePriceChange={(value) => setFormData({ ...formData, purchase_price: value })}
						onQuantityChange={(value) => setFormData({ ...formData, quantity: value })}
						onPurchaseDateChange={(value) => setFormData({ ...formData, purchase_date: value })}
						onDeductFromSavingsChange={(value) => setFormData({ ...formData, deduct_from_savings: value })}
						onCurrencyChange={(value) => setFormData({ ...formData, currency: value })}
					/>
				);

			case AssetType.BONDS:
				return (
					<BondsDetailsForm
						name={formData.name}
						purchasePrice={formData.purchase_price}
						quantity={formData.quantity || 1}
						purchaseDate={formData.purchase_date || new Date().toISOString()}
						currency={formData.currency}
						deductFromSavings={formData.deduct_from_savings}
						bondSettings={formData.bond_settings ? formData.bond_settings : null}
						onNameChange={(value) => setFormData({ ...formData, name: value })}
						onPurchasePriceChange={(value) => setFormData({ ...formData, purchase_price: value })}
						onQuantityChange={(value) => setFormData({ ...formData, quantity: value })}
						onPurchaseDateChange={(value) => setFormData({ ...formData, purchase_date: value })}
						onDeductFromSavingsChange={(value) => setFormData({ ...formData, deduct_from_savings: value })}
						onCurrencyChange={(value) => setFormData({ ...formData, currency: value })}
						onBondSettingsChange={(settings) => setFormData({ ...formData, bond_settings: settings })}
					/>
				);

			case AssetType.CRYPTO:
				return (
					<CryptoDetailsForm
						name={formData.name}
						symbol={formData.symbol || ""}
						micCode={formData.mic_code || ""}
						purchasePrice={formData.purchase_price}
						quantity={formData.quantity || 1}
						purchaseDate={formData.purchase_date || new Date().toISOString()}
						currency={formData.currency}
						deductFromSavings={formData.deduct_from_savings}
						onNameChange={(value) => setFormData({ ...formData, name: value })}
						onSymbolChange={(symbol, exchange, name, currency) =>
							setFormData({ ...formData, symbol, exchange, name, currency })
						}
						onPurchasePriceChange={(value) => setFormData({ ...formData, purchase_price: value })}
						onQuantityChange={(value) => setFormData({ ...formData, quantity: value })}
						onPurchaseDateChange={(value) => setFormData({ ...formData, purchase_date: value })}
						onDeductFromSavingsChange={(value) => setFormData({ ...formData, deduct_from_savings: value })}
						onCurrencyChange={(value) => setFormData({ ...formData, currency: value })}
					/>
				);

			case AssetType.SAVINGS:
				return (
					<SavingsDetailsForm
						name={formData.name}
						purchasePrice={formData.purchase_price}
						currency={formData.currency}
						onPurchasePriceChange={(value) => setFormData({ ...formData, purchase_price: value })}
						onNameChange={(value) => setFormData({ ...formData, name: value })}
						onCurrencyChange={(value) => setFormData({ ...formData, currency: value })}
					/>
				);

			default:
				return (
					<Stack gap="md" mt="xl">
						<TextInput
							label="Asset Name"
							placeholder="e.g., My House, Savings Account, etc."
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
						<CommonAssetFields
							purchasePrice={formData.purchase_price}
							quantity={formData.quantity || 1}
							purchaseDate={formData.purchase_date || new Date().toISOString()}
							currency={formData.currency}
							onPurchasePriceChange={(value) => setFormData({ ...formData, purchase_price: value })}
							onQuantityChange={(value) => setFormData({ ...formData, quantity: value })}
							onPurchaseDateChange={(value) => setFormData({ ...formData, purchase_date: value })}
							deductFromSavings={formData.deduct_from_savings}
							onDeductFromSavingsChange={(value: boolean) => setFormData({ ...formData, deduct_from_savings: value })}
							onCurrencyChange={(value: string) => setFormData({ ...formData, currency: value })}
						/>
					</Stack>
				);
		}
	}, [formData]);

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
				<DashboardHeader assets={assets} />
				<PortfolioSummary />

				{/* Assets Section */}
				<Stack gap="lg">
					<Group justify="space-between">
						<div>
							<Title order={2} style={{ color: "white" }} mb={4}>
								Your Assets
							</Title>
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
							{assets
								.filter((asset) => asset.status === AssetStatus.ACTIVE)
								.map((asset) => {
									const assetType = ASSET_TYPES.find((t) => t.value === asset.type)!;
									return (
										<Grid.Col key={asset.id} span={{ base: 12, sm: 6, md: 4 }}>
											<AssetCard
												asset={asset}
												assetType={assetType}
												onEdit={openEditModal}
												onDelete={handleDeleteAsset}
												onClosePosition={onClosePosition}
											/>
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
				onClose={closeModal}
				title={editingAsset ? "Edit Asset" : "Add New Asset"}
				centered
				size="lg"
				styles={{
					content: { backgroundColor: "#1a1a1a", border: "2px solid #3b82f6" },
					header: { backgroundColor: "#1a1a1a", borderBottom: "1px solid rgba(59, 130, 246, 0.3)" },
					title: { color: "white", fontWeight: 700, fontSize: "1.25rem" },
					body: { backgroundColor: "#1a1a1a" },
				}}
			>
				<Stepper active={activeStep} onStepClick={setActiveStep} color="blue" mt={"1rem"}>
					<Stepper.Step label="Asset Type" description="Choose asset category">
						<AssetTypeSelector
							selectedType={formData.type}
							onSelect={(type) => setFormData({ ...formData, type })}
							hasSavingsAsset={assets.some((asset) => asset.type === "savings")}
						/>
						<Group justify="flex-end" mt="xl">
							<Button onClick={nextStep} style={{ background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
								Next Step
							</Button>
						</Group>
					</Stepper.Step>

					<Stepper.Step label="Details" description="Enter asset information">
						{renderDetailsForm()}
						<Group justify="space-between" mt="xl">
							<Button variant="subtle" onClick={prevStep}>
								Back
							</Button>
							<Button
								onClick={handleAddAsset}
								disabled={
									!formData.name ||
									formData.purchase_price <= 0 ||
									!formData.quantity ||
									(formData.type === AssetType.STOCKS && (!formData.symbol || !formData.mic_code))
								}
								style={{ background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}
							>
								{editingAsset ? "Update" : "Add"} Asset
							</Button>
						</Group>
					</Stepper.Step>
				</Stepper>
			</Modal>
		</Box>
	);
};

export default Dashboard;
