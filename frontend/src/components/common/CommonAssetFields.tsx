import React, { useState } from "react";
import { Stack, NumberInput, Checkbox, Tooltip } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useAuth } from "../../context/AuthContext";

interface CommonAssetFieldsProps {
	purchasePrice: number;
	quantity: number;
	purchaseDate: string;
	deductFromSavings: boolean;
	onPurchasePriceChange: (value: number) => void;
	onQuantityChange: (value: number) => void;
	onPurchaseDateChange: (value: string) => void;
	onDeductFromSavingsChange: (value: boolean) => void;
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
	purchasePrice,
	quantity,
	purchaseDate,
	deductFromSavings,
	onPurchasePriceChange,
	onQuantityChange,
	onPurchaseDateChange,
	onDeductFromSavingsChange,
}) => {
	const { user } = useAuth();
	const hasPrimarySavingsAccount = user?.user_settings?.primary_saving_asset_id;

	return (
		<Stack gap="md">
			<NumberInput
				label="Purchase Price"
				placeholder="Price per unit"
				value={purchasePrice}
				onChange={(value) => onPurchasePriceChange(Number(value) || 0)}
				prefix="$"
				thousandSeparator=","
				decimalScale={2}
				required
				styles={inputStyles}
			/>

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
