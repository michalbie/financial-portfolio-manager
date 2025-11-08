// frontend/src/components/StockSearchModal.tsx

import React, { useState } from "react";
import { Modal, TextInput, Stack, Button, Group, Table, Text, Badge, Loader } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { searchStocksBySymbol } from "../../api/assets";

interface StockSearchModalProps {
	opened: boolean;
	onClose: () => void;
	onSelect: (stock: { symbol: string; name: string; exchange: string; mic_code: string; country: string; currency: string }) => void;
}

const StockSearchModal: React.FC<StockSearchModalProps> = ({ opened, onClose, onSelect }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [searched, setSearched] = useState(false);

	const handleSearch = async () => {
		if (!searchQuery.trim()) return;

		setLoading(true);
		setSearched(true);
		const results = await searchStocksBySymbol(searchQuery.trim().toUpperCase());
		setLoading(false);

		if (results) {
			setSearchResults(results.matches);
		} else {
			setSearchResults([]);
		}
	};

	const handleSelect = (stock: any) => {
		onSelect(stock);
		onClose();
		setSearchQuery("");
		setSearchResults([]);
		setSearched(false);
	};

	return (
		<Modal
			opened={opened}
			onClose={() => {
				onClose();
				setSearchQuery("");
				setSearchResults([]);
				setSearched(false);
			}}
			title="Search for Stock"
			size="lg"
			styles={{
				content: { backgroundColor: "#1a1a1a", border: "2px solid #3b82f6" },
				header: { backgroundColor: "#1a1a1a", borderBottom: "1px solid rgba(59, 130, 246, 0.3)" },
				title: { color: "white", fontWeight: 700, fontSize: "1.25rem" },
				body: { backgroundColor: "#1a1a1a" },
			}}
		>
			<Stack gap="md">
				<Group>
					<TextInput
						placeholder="Enter stock symbol (e.g., AAPL)"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSearch();
						}}
						style={{ flex: 1 }}
						styles={{
							input: {
								background: "rgba(255,255,255,0.05)",
								border: "1px solid rgba(255,255,255,0.1)",
								color: "white",
							},
						}}
					/>
					<Button
						leftSection={<IconSearch size={18} />}
						onClick={handleSearch}
						loading={loading}
						style={{
							background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
							border: "none",
						}}
					>
						Search
					</Button>
				</Group>

				{loading && (
					<Group justify="center" py="xl">
						<Loader color="blue" />
					</Group>
				)}

				{!loading && searched && searchResults.length === 0 && (
					<Text ta="center" c="dimmed" py="xl">
						No stocks found with symbol "{searchQuery}"
					</Text>
				)}

				{!loading && searchResults.length > 0 && (
					<Stack gap="xs">
						<Text size="sm" c="dimmed">
							Found {searchResults.length} result(s)
						</Text>
						<Table
							highlightOnHover
							styles={{
								table: { color: "white" },
								th: { color: "rgba(255,255,255,0.6)" },
								td: { borderBottom: "1px solid rgba(255,255,255,0.1)" },
							}}
						>
							<Table.Thead>
								<Table.Tr>
									<Table.Th>Symbol</Table.Th>
									<Table.Th>Name</Table.Th>
									<Table.Th>Exchange</Table.Th>
									<Table.Th>MIC Code</Table.Th>
									<Table.Th>Country</Table.Th>
									<Table.Th></Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{searchResults.map((stock, index) => (
									<Table.Tr key={`${stock.mic_code}-${index}`}>
										<Table.Td>
											<Badge color="blue">{stock.symbol}</Badge>
										</Table.Td>
										<Table.Td>{stock.name}</Table.Td>
										<Table.Td>
											<Badge variant="light">{stock.exchange}</Badge>
										</Table.Td>
										<Table.Td>
											<Badge variant="outline">{stock.mic_code}</Badge>
										</Table.Td>
										<Table.Td>{stock.country}</Table.Td>
										<Table.Td>
											<Button size="xs" variant="light" onClick={() => handleSelect(stock)}>
												Select
											</Button>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					</Stack>
				)}
			</Stack>
		</Modal>
	);
};

export default StockSearchModal;
