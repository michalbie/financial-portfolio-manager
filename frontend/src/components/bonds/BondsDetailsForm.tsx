import React, { useEffect, useMemo, useState } from "react";
import { Accordion, Box, Checkbox, Divider, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { CommonAssetFields } from "../common/CommonAssetFields";
import { DatePicker, DateTimePicker } from "@mantine/dates";
import { AssetType, type BondSettings } from "../../api/assets";

interface BondsDetailsFormProps {
	name: string;
	purchasePrice: number;
	quantity: number;
	purchaseDate: string;
	deductFromSavings: boolean;
	currency: string;
	bondSettings?: BondSettings | null;
	onNameChange: (value: string) => void;
	onPurchasePriceChange: (value: number) => void;
	onQuantityChange: (value: number) => void;
	onPurchaseDateChange: (value: string) => void;
	onDeductFromSavingsChange: (value: boolean) => void;
	onCurrencyChange: (value: string) => void;
	onBondSettingsChange: (settings: BondSettings) => void;
}

const inputStyles = {
	label: { color: "rgba(255,255,255,0.7)", marginBottom: "8px" },
	input: {
		background: "rgba(255,255,255,0.05)",
		border: "1px solid rgba(255,255,255,0.1)",
		color: "white",
	},
};

const periodNames = {
	0: "At-Maturity",
	1: "Month",
	3: "Quarter",
	6: "Half-Year",
	12: "Year",
};

const getInterestRatesObject = (
	purchaseDate: string,
	maturityDate: string,
	interestRateResetFrequency: number,
	currentInterestRates: Record<number, { rate: number }>
) => {
	const rates: Record<number, { rate: number }> = {};
	const purchaseYear = new Date(purchaseDate).getFullYear();
	const maturityYear = new Date(maturityDate).getFullYear();
	const bondAgeInMonths = (maturityYear - purchaseYear) * 12;
	const frequencyInMonths = interestRateResetFrequency > 0 ? interestRateResetFrequency : bondAgeInMonths;

	for (let period = 1; period <= bondAgeInMonths / frequencyInMonths; period++) {
		rates[period] = currentInterestRates[period] || { rate: 4.5 };
	}

	return rates;
};

const InterestRatePicker: React.FC<{
	period: number;
	value: number;
	frequencyInMonths: number;
	onChange: (value: number) => void;
}> = ({ period, value, frequencyInMonths, onChange }) => {
	return (
		<Box>
			<NumberInput
				label={`${
					Object.keys(periodNames).includes(frequencyInMonths.toString())
						? periodNames[frequencyInMonths as keyof typeof periodNames]
						: frequencyInMonths
				} ${frequencyInMonths > 0 ? period : ""} Interest Rate (%)`}
				placeholder="e.g., 5 for 5%"
				value={value}
				onChange={(val) => onChange(typeof val === "number" ? val : parseInt(val) || 0)}
				suffix="%"
				styles={inputStyles}
				step={0.01}
			/>
		</Box>
	);
};

export const BondsDetailsForm: React.FC<BondsDetailsFormProps> = ({
	name,
	purchasePrice,
	quantity,
	purchaseDate,
	deductFromSavings,
	currency,
	bondSettings,
	onNameChange,
	onPurchasePriceChange,
	onQuantityChange,
	onPurchaseDateChange,
	onDeductFromSavingsChange,
	onCurrencyChange,
	onBondSettingsChange,
}) => {
	const [capitalizationOfInterest, setCapitalizationOfInterest] = useState(bondSettings?.capitalizationOfInterest || false);
	const [capitalizationFrequency, setCapitalizationFrequency] = useState(bondSettings?.capitalizationFrequency || 1);
	const [interestRateResetFrequency, setInterestRateResetFrequency] = useState(bondSettings?.interestRateResetFrequency || 12);
	const [maturityDate, setMaturityDate] = useState<string | null>(
		bondSettings?.maturityDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
	);
	const [interestRates, setInterestRates] = useState<Record<number, { rate: number }>>(
		getInterestRatesObject(purchaseDate || "", maturityDate || "", interestRateResetFrequency, bondSettings?.interestRates || {})
	);

	useEffect(() => {
		if (maturityDate) {
			setInterestRates((prev) => getInterestRatesObject(purchaseDate || "", maturityDate, interestRateResetFrequency, prev));
		}
	}, [maturityDate, purchaseDate, interestRateResetFrequency]);

	useEffect(() => {
		onBondSettingsChange({
			capitalizationOfInterest,
			capitalizationFrequency,
			interestRateResetFrequency,
			maturityDate,
			interestRates,
		});
	}, [capitalizationOfInterest, capitalizationFrequency, interestRateResetFrequency, maturityDate, interestRates]);

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

			<Checkbox
				label="Capitalization of Interest"
				checked={capitalizationOfInterest}
				onChange={(event) => setCapitalizationOfInterest(event.currentTarget.checked)}
			/>

			{capitalizationOfInterest && (
				<Select
					label="Capitalization Frequency"
					placeholder="Select frequency"
					data={[
						{ value: "1", label: "Monthly" },
						{ value: "3", label: "Quarterly" },
						{ value: "12", label: "Annually" },
					]}
					styles={inputStyles}
					value={capitalizationFrequency.toString()}
					onChange={(value) => value && setCapitalizationFrequency(parseInt(value))}
				/>
			)}

			<DateTimePicker
				label="Maturity Date"
				placeholder="Select maturity date"
				value={maturityDate}
				onChange={(date) => {
					setMaturityDate(new Date(date || "").toISOString());
					setInterestRates({});
				}}
				required
				styles={inputStyles}
			/>

			<Select
				label="Interest Rate Reset Frequency"
				placeholder="Select frequency"
				data={[
					{ value: "12", label: "Annually" },
					{ value: "6", label: "Biennially" },
					{ value: "3", label: "Quarterly" },
					{ value: "1", label: "Monthly" },
					{ value: "0", label: "At Maturity" },
				]}
				styles={inputStyles}
				value={interestRateResetFrequency.toString()}
				onChange={(value) => value && setInterestRateResetFrequency(parseInt(value))}
			/>

			{/* Input that lets user select interest rate number at every year separately */}
			<Accordion>
				<Accordion.Item value="interest-rates">
					<Accordion.Control p={0}>Interest Rates</Accordion.Control>
					<Accordion.Panel>
						<Text c={"grey"}>
							Set the interest rates for each period. They can be edited as time goes on. It will trigger recalculation.
						</Text>
						<Box>
							{Array.from({ length: Object.keys(interestRates).length }, (_, index) => (
								<Box key={index}>
									{index <= Object.keys(interestRates).length - 1 && <Divider m={"1rem 0"}></Divider>}
									<InterestRatePicker
										period={index + 1}
										frequencyInMonths={interestRateResetFrequency}
										value={interestRates[index + 1]?.rate || 0}
										onChange={(value) => {
											setInterestRates((prev) => ({
												...prev,
												[index + 1]: { rate: value },
											}));
										}}
									/>
								</Box>
							))}
						</Box>
					</Accordion.Panel>
				</Accordion.Item>
			</Accordion>

			<CommonAssetFields
				assetType={AssetType.BONDS}
				purchasePrice={purchasePrice}
				quantity={quantity}
				purchaseDate={purchaseDate}
				currency={currency}
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
