// FILE LOCATION: frontend/src/pages/Dashboard/components/BankHistoryModal.tsx
// REPLACE THE ENTIRE FILE

import React, { useState, useEffect } from "react";
import { Modal, Stack, Button, Select, Text, Table, Box, Group, ActionIcon, Loader } from "@mantine/core";
import { IconUpload, IconTrash, IconFileTypeCsv } from "@tabler/icons-react";
import { useAuth } from "../../../context/AuthContext";
import { getMyBankHistory, uploadBankCSV, deleteBankHistory, type BankHistory } from "../../../api/bankHistory";
import { getMyAssets, AssetType, type Asset } from "../../../api/assets";
import { notifications } from "@mantine/notifications";

interface BankHistoryModalProps {
	opened: boolean;
	setOpened: (opened: boolean) => void;
	loadAssets: () => Promise<void>;
}

const BankHistoryModal: React.FC<BankHistoryModalProps> = ({ opened, setOpened, loadAssets }) => {
	const { user } = useAuth();
	const [file, setFile] = useState<File | null>(null);
	const [selectedAssetId, setSelectedAssetId] = useState<string | null>(user?.user_settings.primary_saving_asset_id?.toString() || null);
	const [loading, setLoading] = useState(false);
	const [histories, setHistories] = useState<BankHistory[]>([]);
	const [savingsAssets, setSavingsAssets] = useState<Asset[]>([]);
	const [loadingData, setLoadingData] = useState(true);

	useEffect(() => {
		if (opened) {
			loadData();
		}
	}, [opened]);

	const loadData = async () => {
		setLoadingData(true);
		const [historiesData, assetsData] = await Promise.all([getMyBankHistory(), getMyAssets()]);

		if (historiesData) {
			setHistories(historiesData);
		}

		if (assetsData) {
			const savings = assetsData.filter((asset) => asset.type === AssetType.SAVINGS);
			setSavingsAssets(savings);
		}

		setLoadingData(false);
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = event.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
		}
	};

	const handleUpload = async () => {
		if (!file) {
			notifications.show({
				title: "Error",
				message: "Please select a CSV file to upload.",
				color: "red",
			});
			return;
		}

		setLoading(true);

		const assetId = selectedAssetId ? parseInt(selectedAssetId) : undefined;
		const result = await uploadBankCSV(file, assetId);

		if (result) {
			setFile(null);
			setSelectedAssetId(null);
			await loadData();
			await loadAssets();
		}

		setLoading(false);
	};

	const handleDelete = async (historyId: number) => {
		if (!window.confirm("Are you sure you want to delete this bank history record?")) {
			return;
		}

		const result = await deleteBankHistory(historyId);
		if (result) {
			await loadData();
		}
	};

	const assetOptions = savingsAssets.map((asset) => ({
		value: asset.id.toString(),
		label: asset.name,
	}));

	return (
		<Modal
			opened={opened}
			onClose={() => setOpened(false)}
			title="Bank Transaction History"
			size="xl"
			styles={{
				content: { backgroundColor: "#1a1a1a", border: "2px solid #3b82f6" },
				header: { backgroundColor: "#1a1a1a", borderBottom: "1px solid rgba(59, 130, 246, 0.3)" },
				title: { color: "white", fontWeight: 700, fontSize: "1.25rem" },
				body: { backgroundColor: "#1a1a1a" },
			}}
		>
			<Stack gap="xl">
				{/* Upload Section */}
				<Box
					p="md"
					style={{
						background: "rgba(59, 130, 246, 0.05)",
						border: "1px solid rgba(59, 130, 246, 0.2)",
						borderRadius: "12px",
					}}
				>
					<Stack gap="md">
						<Group gap="xs" align="center">
							<IconFileTypeCsv size={24} color="#3b82f6" />
							<Text size="lg" fw={600} style={{ color: "white" }}>
								Upload Bank CSV
							</Text>
						</Group>

						<Text size="sm" c="dimmed">
							Upload your bank transaction CSV file. The system will automatically detect columns for dates, amounts, and
							descriptions using AI.
							<br />
							<br />
							<Text span fw={700} c="blue">
								Note:
							</Text>{" "}
							It will later update your linked savings account balance accordingly.
						</Text>

						{/* Custom File Input */}
						<Box>
							<Text size="sm" fw={500} mb={8} style={{ color: "rgba(255,255,255,0.7)" }}>
								CSV File
							</Text>
							<input type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} id="csv-file-input" />
							<label htmlFor="csv-file-input">
								<Button
									component="span"
									leftSection={<IconUpload size={16} />}
									variant="outline"
									fullWidth
									styles={{
										root: {
											background: "rgba(255,255,255,0.05)",
											border: "1px solid rgba(255,255,255,0.1)",
											color: "white",
											cursor: "pointer",
											"&:hover": {
												background: "rgba(255,255,255,0.1)",
											},
										},
									}}
								>
									{file ? file.name : "Select CSV file"}
								</Button>
							</label>
						</Box>

						<Select
							label="Link to Savings Account"
							placeholder="Select savings account"
							data={assetOptions}
							value={selectedAssetId}
							onChange={setSelectedAssetId}
							clearable
							styles={{
								label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
								input: {
									background: "rgba(255,255,255,0.05)",
									border: "1px solid rgba(255,255,255,0.1)",
									color: "white",
								},
							}}
						/>

						<Button
							onClick={handleUpload}
							disabled={!file || loading || !selectedAssetId}
							loading={loading}
							leftSection={<IconUpload size={16} />}
							style={{
								background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
							}}
						>
							Upload and Parse CSV
						</Button>
					</Stack>
				</Box>

				{/* History Table */}
				<Box>
					<Text size="lg" fw={600} mb="md" style={{ color: "white" }}>
						Your Bank History
					</Text>

					{loadingData ? (
						<Box style={{ textAlign: "center", padding: "40px" }}>
							<Loader size="lg" />
						</Box>
					) : histories.length === 0 ? (
						<Box
							p="xl"
							style={{
								textAlign: "center",
								background: "rgba(255,255,255,0.02)",
								border: "1px solid rgba(255,255,255,0.1)",
								borderRadius: "12px",
							}}
						>
							<Text c="dimmed">No bank history records yet. Upload a CSV to get started!</Text>
						</Box>
					) : (
						<Table
							highlightOnHover
							styles={{
								table: {
									background: "rgba(255,255,255,0.02)",
									border: "1px solid rgba(255,255,255,0.1)",
									borderRadius: "12px",
								},
								th: { color: "rgba(255,255,255,0.7)" },
								td: { color: "white" },
							}}
						>
							<Table.Thead>
								<Table.Tr>
									<Table.Th>Period</Table.Th>
									<Table.Th>Incomes</Table.Th>
									<Table.Th>Expenses</Table.Th>
									<Table.Th>Final Balance</Table.Th>
									<Table.Th>Actions</Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{histories.map((history) => (
									<Table.Tr key={history.id}>
										<Table.Td>
											{new Date(history.date_start).toLocaleDateString()} -{" "}
											{new Date(history.date_end).toLocaleDateString()}
										</Table.Td>
										<Table.Td style={{ color: "#10b981" }}>
											{user?.user_settings.currency} {history.incomes.toLocaleString()}
										</Table.Td>
										<Table.Td style={{ color: "#ef4444" }}>
											{user?.user_settings.currency} {history.expenses.toLocaleString()}
										</Table.Td>
										<Table.Td>
											{user?.user_settings.currency} {history.final_balance.toLocaleString()}
										</Table.Td>
										<Table.Td>
											<ActionIcon variant="subtle" color="red" onClick={() => handleDelete(history.id)}>
												<IconTrash size={16} />
											</ActionIcon>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					)}
				</Box>
			</Stack>
		</Modal>
	);
};

export default BankHistoryModal;
