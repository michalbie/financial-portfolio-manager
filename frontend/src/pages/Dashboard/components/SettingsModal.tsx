import { Button, Modal, NumberInput, Select, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { getUserSettings, updateUserSettings, type UserSettings } from "../../../api/user";
import { useAuth } from "../../../context/AuthContext";
import { notifications } from "@mantine/notifications";
import type { Asset } from "../../../api/assets";
import { AssetType } from "../../../api/assets";

interface SettingsModalProps {
	opened: boolean;
	setOpened: (opened: boolean) => void;
	assets: Asset[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({ opened, setOpened, assets }) => {
	const { user } = useAuth();
	const [userSettings, setUserSettings] = useState<Partial<UserSettings>>();

	useEffect(() => {
		if (opened && !userSettings && user && user.id) {
			getUserSettings(user.id)
				.then((settings) => {
					if (settings) {
						setUserSettings(settings);
					}
				})
				.catch((error) => {
					console.error("Failed to fetch user settings:", error);
					notifications.show({
						title: "Error",
						message: "Failed to load user settings.",
						color: "red",
					});
				});
		}
	}, [opened, user]);

	const onSave = () => {
		if (user && user.id && userSettings) {
			updateUserSettings(user.id, userSettings)
				.then(() => {
					notifications.show({
						title: "Success",
						message: "Settings updated successfully.",
						color: "green",
					});
					setOpened(false);
					window.location.reload();
				})
				.catch((error) => {
					console.error("Failed to update user settings:", error);
					notifications.show({
						title: "Error",
						message: "Failed to update user settings.",
						color: "red",
					});
				});
		}
	};

	return (
		<Modal opened={opened} onClose={() => setOpened(false)} title="Settings">
			{/* Form to change settings */}
			<Select
				label="Currency"
				placeholder="Select currency"
				data={[
					{ value: "USD", label: "USD - US Dollar" },
					{ value: "EUR", label: "EUR - Euro" },
					{ value: "GBP", label: "GBP - British Pound" },
					{ value: "PLN", label: "PLN - Polish Zloty" },
				]}
				value={userSettings?.currency}
				onChange={(value) => setUserSettings({ ...userSettings, currency: value || "USD" })}
			/>

			<Select
				label="Primary Saving Asset (where to add salary after payday)"
				value={userSettings?.primary_saving_asset_id?.toString()}
				data={assets
					.filter((asset) => asset.type === AssetType.SAVINGS)
					.map((asset) => ({ value: asset.id.toString(), label: asset.name }))}
				onChange={(event) => setUserSettings({ ...userSettings, primary_saving_asset_id: event ? parseInt(event) : null })}
			/>

			<NumberInput
				label="Salary per Month"
				value={userSettings?.salary_per_month ?? undefined}
				onChange={(value) =>
					setUserSettings({ ...userSettings, salary_per_month: typeof value === "number" ? value : parseInt(value) })
				}
			/>

			<NumberInput
				label="Salary Day of Month"
				value={userSettings?.salary_day ?? undefined}
				min={1}
				max={28}
				onChange={(value) => setUserSettings({ ...userSettings, salary_day: typeof value === "number" ? value : parseInt(value) })}
			/>

			<Button mt="md" onClick={onSave}>
				Save Changes
			</Button>
		</Modal>
	);
};

export default SettingsModal;
