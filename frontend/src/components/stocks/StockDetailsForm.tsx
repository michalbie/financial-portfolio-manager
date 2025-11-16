import React, { useState } from "react";
import { Stack, TextInput, Select, Loader } from "@mantine/core";
import { searchStocksBySymbol } from "../../api/assets";
import { CommonAssetFields } from "../common/CommonAssetFields";

interface StockOption {
	symbol: string;
	name: string;
	exchange: string;
	mic_code: string;
	country: string;
	currency: string;
}

interface StockDetailsFormProps {
	name: string;
	symbol: string;
	micCode: string;
	purchasePrice: number;
	quantity: number;
	purchaseDate: string;
	deductFromSavings: boolean;
	currency: string;
	onNameChange: (value: string) => void;
	onSymbolChange: (symbol: string, name: string, micCode: string, exchange: string, currency: string) => void;
	onPurchasePriceChange: (value: number) => void;
	onQuantityChange: (value: number) => void;
	onPurchaseDateChange: (value: string) => void;
	onDeductFromSavingsChange: (value: boolean) => void;
	onCurrencyChange: (value: string) => void;
}

const inputStyles = {
	label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
	input: {
		background: "rgba(255,255,255,0.05)",
		border: "1px solid rgba(255,255,255,0.1)",
		color: "white",
	},
};

const disabledInputStyles = {
	label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
	input: {
		background: "rgba(255,255,255,0.02)",
		border: "1px solid rgba(255,255,255,0.1)",
		color: "rgba(255,255,255,0.5)",
	},
};

export const StockDetailsForm: React.FC<StockDetailsFormProps> = ({
	name,
	symbol,
	micCode,
	purchasePrice,
	quantity,
	purchaseDate,
	deductFromSavings,
	currency,
	onNameChange,
	onSymbolChange,
	onPurchasePriceChange,
	onQuantityChange,
	onPurchaseDateChange,
	onDeductFromSavingsChange,
	onCurrencyChange,
}) => {
	const [stockSearchQuery, setStockSearchQuery] = useState("");
	const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
	const [loadingStocks, setLoadingStocks] = useState(false);
	const [selectedStock, setSelectedStock] = useState<StockOption | null>(null);

	const handleStockSearch = async (query: string) => {
		setStockSearchQuery(query);
		if (query.length < 1) {
			setStockOptions([]);
			return;
		}

		setLoadingStocks(true);
		const result = await searchStocksBySymbol(query.toUpperCase());
		setLoadingStocks(false);

		if (result) {
			setStockOptions(result.matches);
		} else {
			setStockOptions([]);
		}
	};

	const symbolOptions = [...new Set(stockOptions.map((s) => s.symbol))].map((sym) => ({
		value: sym,
		label: sym,
	}));

	const exchangeOptions = stockOptions
		.filter((s) => s.symbol === symbol)
		.map((s) => ({
			value: s.exchange,
			label: `${s.exchange} (${s.country})`,
		}));

	const handleSymbolSelect = (selectedSymbol: string) => {
		const stock = stockOptions.find((s) => s.symbol === selectedSymbol);
		if (stock) {
			onNameChange(stock.name);
			onSymbolChange(selectedSymbol, stock.name, "", "", stock.currency);
			setSelectedStock(null);
		}
	};

	const handleExchangeSelect = (exchange: string) => {
		const stock = stockOptions.find((s) => s.symbol === symbol && s.exchange === exchange);
		if (stock) {
			setSelectedStock(stock);
			onSymbolChange(symbol, stock.name, stock.mic_code, stock.exchange, stock.currency);
		}
	};

	return (
		<Stack gap="md" mt="xl">
			<TextInput
				label="Search Stock Symbol"
				placeholder="Type symbol (e.g., AAPL, TSLA)"
				value={stockSearchQuery}
				onChange={(e) => handleStockSearch(e.target.value)}
				styles={inputStyles}
			/>

			{loadingStocks && <Loader size="sm" />}

			{stockOptions.length > 0 && (
				<>
					<Select
						label="Symbol"
						placeholder="Select symbol"
						data={symbolOptions}
						value={symbol}
						onChange={(value) => value && handleSymbolSelect(value)}
						searchable
						required
						styles={inputStyles}
					/>

					{symbol && exchangeOptions.length > 0 && (
						<Select
							label="Exchange"
							placeholder="Select exchange"
							data={exchangeOptions}
							value={selectedStock?.exchange}
							onChange={(value) => value && handleExchangeSelect(value)}
							required
							styles={inputStyles}
						/>
					)}

					{selectedStock && <TextInput label="MIC Code" value={micCode} disabled styles={disabledInputStyles} />}
				</>
			)}

			<TextInput label="Asset Name" value={name} onChange={(e) => onNameChange(e.target.value)} required styles={inputStyles} />

			<CommonAssetFields
				purchasePrice={purchasePrice}
				quantity={quantity}
				purchaseDate={purchaseDate}
				currency={selectedStock ? selectedStock.currency : currency}
				onPurchasePriceChange={onPurchasePriceChange}
				onQuantityChange={onQuantityChange}
				onPurchaseDateChange={onPurchaseDateChange}
				deductFromSavings={deductFromSavings}
				onDeductFromSavingsChange={onDeductFromSavingsChange}
				onCurrencyChange={onCurrencyChange}
			/>
		</Stack>
	);
};
