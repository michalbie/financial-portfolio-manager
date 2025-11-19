import { Button, Checkbox, Modal, NumberInput, Tooltip } from "@mantine/core";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { closeAsset, type Asset } from "../../api/assets";

interface ClosePositionModalProps {
	opened: boolean;
	setOpened: (opened: boolean) => void;
	onClosePosition: (id: number, taxFromProfit: number, transferToSavings: boolean) => void;
	asset: Asset;
}

const ClosePositionModal: React.FC<ClosePositionModalProps> = ({ opened, setOpened, onClosePosition, asset }) => {
	const { user } = useAuth();
	const [transferToSavings, setTransferToSavings] = useState<boolean>(true);
	const [taxFromProfit, setTaxFromProfit] = useState<number>(0);

	const hasPrimarySavingsAccount = user?.user_settings?.primary_saving_asset_id;

	const handleClosePosition = () => {
		onClosePosition(asset.id, taxFromProfit / 100, transferToSavings);
		setOpened(false);
	};

	return (
		<Modal opened={opened} onClose={() => setOpened(false)} title="Close Position">
			<Checkbox
				label="Transfer funds to primary savings account after closing"
				disabled={!hasPrimarySavingsAccount}
				checked={transferToSavings}
				onChange={(e) => setTransferToSavings(e.currentTarget.checked)}
			/>

			<NumberInput
				label={"Tax from profit (%)"}
				value={taxFromProfit}
				min={0}
				max={100}
				onChange={(value) => {
					setTaxFromProfit(typeof value === "number" ? value : parseFloat(value));
				}}
			/>

			<Tooltip
				multiline
				label="You must have a primary savings account to transfer funds. Create one in assets and set it as primary in the settings."
				disabled={hasPrimarySavingsAccount !== null && hasPrimarySavingsAccount !== undefined}
				position="top"
			>
				<Button mt="md" onClick={handleClosePosition} disabled={!hasPrimarySavingsAccount} fullWidth>
					Close Position
				</Button>
			</Tooltip>
		</Modal>
	);
};

export default ClosePositionModal;
