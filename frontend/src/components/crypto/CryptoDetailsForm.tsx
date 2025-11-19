import React, { useState } from "react";
import { Stack, TextInput, Select, Loader } from "@mantine/core";
import { AssetType, searchCryptoBySymbol } from "../../api/assets";
import { CommonAssetFields } from "../common/CommonAssetFields";

interface CryptoOption {
	symbol: string;
	available_exchanges: string[];
	currency_base: string;
	currency_quote: string;
}

interface CryptoElement {
	symbol: string;
	exchange: string;
	currency_base: string;
	currency_quote: string;
}

interface CryptoDetailsFormProps {
	name: string;
	symbol: string;
	micCode: string;
	purchasePrice: number;
	quantity: number;
	purchaseDate: string;
	deductFromSavings: boolean;
	currency: string;
	onNameChange: (value: string) => void;
	onSymbolChange: (symbol: string, exchange: string, name: string, currency: string) => void;
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

export const CryptoDetailsForm: React.FC<CryptoDetailsFormProps> = ({
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
	const [cryptoSearchQuery, setCryptoSearchQuery] = useState("");
	const [cryptoOption, setCryptoOption] = useState<CryptoOption>();
	const [loadingCryptos, setLoadingCryptos] = useState(false);
	const [selectedCrypto, setSelectedCrypto] = useState<CryptoElement | null>(null);

	const handleCryptoSearch = async (query: string) => {
		setCryptoSearchQuery(query);
		if (query.length < 1) {
			setCryptoOption(undefined);
			return;
		}

		setLoadingCryptos(true);
		const result = await searchCryptoBySymbol(query.toUpperCase());
		setLoadingCryptos(false);

		if (result) {
			setCryptoOption(result.matches?.[0]);
		} else {
			setCryptoOption(undefined);
		}
	};

	const symbolOptions = cryptoOption
		? [
				{
					value: cryptoOption.symbol,
					label: `${cryptoOption.symbol} (${cryptoOption.currency_base}/${cryptoOption.currency_quote})`,
				},
		  ]
		: [];

	const exchangeOptions = cryptoOption
		? cryptoOption.available_exchanges.map((exchange) => ({
				value: exchange,
				label: exchange,
		  }))
		: [];

	const handleSymbolSelect = (selectedSymbol: string) => {
		const crypto = cryptoOption && cryptoOption.symbol === selectedSymbol ? cryptoOption : null;
		if (crypto) {
			onSymbolChange(selectedSymbol, selectedCrypto ? selectedCrypto.exchange : "", crypto.symbol, crypto.symbol.split("/")[1]);
			setSelectedCrypto(null);
		}
	};

	const handleExchangeSelect = (exchange: string) => {
		const crypto: CryptoElement | null =
			cryptoOption && selectedCrypto === null
				? {
						symbol: cryptoOption.symbol,
						exchange: exchange,
						currency_base: cryptoOption.currency_base,
						currency_quote: cryptoOption.currency_quote,
				  }
				: null;

		if (crypto) {
			setSelectedCrypto(crypto);
			onSymbolChange(symbol, exchange, crypto.symbol, crypto.symbol.split("/")[1]);
		}
	};

	return (
		<Stack gap="md" mt="xl">
			<TextInput
				label="Search crypto Symbol"
				placeholder="Type symbol (e.g., BTC/USD, ETH/USD)"
				value={cryptoSearchQuery}
				onChange={(e) => handleCryptoSearch(e.target.value)}
				styles={inputStyles}
			/>

			{loadingCryptos && <Loader size="sm" />}

			{cryptoOption && (
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
							value={selectedCrypto?.exchange}
							onChange={(value) => value && handleExchangeSelect(value)}
							required
							styles={inputStyles}
						/>
					)}

					{selectedCrypto && (
						<>
							<TextInput label="Currency base" value={selectedCrypto.currency_base} disabled styles={disabledInputStyles} />
							<TextInput label="Currency quote" value={selectedCrypto.currency_quote} disabled styles={disabledInputStyles} />
						</>
					)}
				</>
			)}

			<TextInput label="Asset Name" value={name} onChange={(e) => onNameChange(e.target.value)} required styles={inputStyles} />

			<CommonAssetFields
				assetType={AssetType.CRYPTO}
				purchasePrice={purchasePrice}
				quantity={quantity}
				purchaseDate={purchaseDate}
				currency={selectedCrypto ? selectedCrypto.currency_quote : currency}
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
