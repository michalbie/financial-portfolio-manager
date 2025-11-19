import React, { useState } from "react";
import { Stack, NumberInput, Checkbox, Tooltip, Select } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useAuth } from "../../context/AuthContext";

interface CommonAssetFieldsProps {
	assetType: string;
	purchasePrice: number;
	currentPrice?: number;
	quantity: number;
	purchaseDate: string;
	deductFromSavings: boolean;
	currency: string;
	onPurchasePriceChange: (value: number) => void;
	onQuantityChange: (value: number) => void;
	onPurchaseDateChange: (value: string) => void;
	onDeductFromSavingsChange: (value: boolean) => void;
	onCurrencyChange: (value: string) => void;
	setCurrentPrice?: (value: number) => void;
}

const inputStyles = {
	label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
	input: {
		background: "rgba(255,255,255,0.05)",
		border: "1px solid rgba(255,255,255,0.1)",
		color: "white",
	},
};

export const CommonAssetFields: React.FC<CommonAssetFieldsProps> = ({
	assetType,
	purchasePrice,
	currentPrice,
	quantity,
	purchaseDate,
	deductFromSavings,
	currency,
	onPurchasePriceChange,
	onQuantityChange,
	onPurchaseDateChange,
	onDeductFromSavingsChange,
	onCurrencyChange,
	setCurrentPrice,
}) => {
	const { user } = useAuth();
	const hasPrimarySavingsAccount = user?.user_settings?.primary_saving_asset_id;

	return (
		<Stack gap="md">
			<Select
				label="Currency"
				placeholder="Select currency"
				data={[
					{ value: "USD", label: "USD - US Dollar" },
					{ value: "EUR", label: "EUR - Euro" },
					{ value: "GBP", label: "GBP - British Pound" },
					{ value: "PLN", label: "PLN - Polish Zloty" },
				]}
				styles={inputStyles}
				value={currency}
				onChange={(value) => onCurrencyChange(value || "USD")}
			/>

			<NumberInput
				label="Purchase Price"
				placeholder="Price per unit"
				value={purchasePrice}
				onChange={(value) => onPurchasePriceChange(Number(value) || 0)}
				thousandSeparator=","
				decimalScale={2}
				required
				styles={inputStyles}
			/>

			{assetType !== "stocks" && assetType !== "crypto" && assetType !== "bonds" && (
				<NumberInput
					label="Current Price"
					placeholder="Current price per unit"
					value={currentPrice}
					onChange={(value) => setCurrentPrice?.(Number(value) || 0)}
					required
					styles={inputStyles}
				/>
			)}

			<NumberInput
				label="Quantity"
				placeholder="Number of units"
				value={quantity}
				onChange={(value) => onQuantityChange(Number(value) || 1)}
				min={0.000001}
				decimalScale={6}
				required
				styles={inputStyles}
			/>

			<DateTimePicker
				label="Purchase Date"
				placeholder="When did you buy this?"
				value={purchaseDate ? new Date(purchaseDate) : new Date()}
				onChange={(value) => {
					onPurchaseDateChange(value || new Date().toISOString());
				}}
				styles={inputStyles}
			/>

			<Tooltip
				multiline
				label="You must have a primary savings account to deduct funds. Create one in assets and set it as primary in the settings."
				disabled={hasPrimarySavingsAccount !== null && hasPrimarySavingsAccount !== undefined}
				position="top"
			>
				<Checkbox
					label="Deduct funds from primary savings account upon purchase"
					disabled={!hasPrimarySavingsAccount}
					checked={deductFromSavings}
					onChange={(e) => onDeductFromSavingsChange(e.currentTarget.checked)}
				/>
			</Tooltip>
		</Stack>
	);
};
