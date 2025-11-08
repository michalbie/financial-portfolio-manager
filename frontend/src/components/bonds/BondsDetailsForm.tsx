import React from "react";
import { Stack, TextInput } from "@mantine/core";
import { CommonAssetFields } from "../common/CommonAssetFields";

interface BondsDetailsFormProps {
	name: string;
	purchasePrice: number;
	quantity: number;
	purchaseDate: string;
	onNameChange: (value: string) => void;
	onPurchasePriceChange: (value: number) => void;
	onQuantityChange: (value: number) => void;
	onPurchaseDateChange: (value: string) => void;
}

const inputStyles = {
	label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
	input: {
		background: "rgba(255,255,255,0.05)",
		border: "1px solid rgba(255,255,255,0.1)",
		color: "white",
	},
};

export const BondsDetailsForm: React.FC<BondsDetailsFormProps> = ({
	name,
	purchasePrice,
	quantity,
	purchaseDate,
	onNameChange,
	onPurchasePriceChange,
	onQuantityChange,
	onPurchaseDateChange,
}) => {
	return (
		<Stack gap="md" mt="xl">
			<TextInput
				label="Bond Name"
				placeholder="e.g., US Treasury Bond, Corporate Bond, etc."
				value={name}
				onChange={(e) => onNameChange(e.target.value)}
				required
				styles={inputStyles}
			/>

			<CommonAssetFields
				purchasePrice={purchasePrice}
				quantity={quantity}
				purchaseDate={purchaseDate}
				onPurchasePriceChange={onPurchasePriceChange}
				onQuantityChange={onQuantityChange}
				onPurchaseDateChange={onPurchaseDateChange}
			/>
		</Stack>
	);
};
