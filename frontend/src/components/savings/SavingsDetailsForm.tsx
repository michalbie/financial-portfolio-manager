import React, { useEffect } from "react";
import { NumberInput, Stack, TextInput } from "@mantine/core";

interface SavingsDetailsFormProps {
	name: string;
	purchasePrice: number;
	onPurchasePriceChange: (value: number) => void;
	onNameChange?: (value: string) => void;
}

const inputStyles = {
	label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
	input: {
		background: "rgba(255,255,255,0.05)",
		border: "1px solid rgba(255,255,255,0.1)",
		color: "white",
	},
};

export const SavingsDetailsForm: React.FC<SavingsDetailsFormProps> = ({ name, purchasePrice, onPurchasePriceChange, onNameChange }) => {
	useEffect(() => {
		onNameChange && onNameChange("Savings Account");
	}, []);

	return (
		<Stack gap="md" mt="xl">
			<TextInput
				label="Account Name"
				placeholder="Savings Account"
				defaultValue="Savings Account"
				value={name}
				onChange={(e) => onNameChange && onNameChange(e.currentTarget.value)}
				required
				styles={inputStyles}
			/>

			<NumberInput
				label="Savings Amount"
				placeholder="Total amount of savings"
				value={purchasePrice}
				onChange={(value) => onPurchasePriceChange(Number(value) || 0)}
				prefix="$"
				thousandSeparator=","
				decimalScale={2}
				required
				styles={inputStyles}
			/>
		</Stack>
	);
};
