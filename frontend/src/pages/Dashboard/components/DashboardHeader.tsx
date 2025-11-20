
import React, { useState } from "react";
import { Group, Stack, Text, Title, Button } from "@mantine/core";
import { IconLogout, IconSettings, IconFileTypeCsv } from "@tabler/icons-react";
import { useAuth } from "../../../context/AuthContext";
import SettingsModal from "./SettingsModal";
import BankHistoryModal from "./BankHistoryModal";
import type { Asset } from "../../../api/assets";

interface DashboardHeaderProps {
	assets: Asset[];
	loadAssets: () => Promise<void>;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ assets, loadAssets }) => {
	const { user, logout } = useAuth();
	const [settingsOpened, setSettingsOpened] = useState(false);
	const [bankHistoryOpened, setBankHistoryOpened] = useState(false);

	return (
		<Group justify="space-between" mb={40}>
			<Stack gap={4}>
				<Text size="sm" style={{ color: "rgba(255,255,255,0.4)" }}>
					Welcome back,
				</Text>
				<Title order={2} style={{ color: "white" }}>
					{user?.name}
				</Title>
			</Stack>
			<Group gap="md">
				<Button
					leftSection={<IconFileTypeCsv size={18} />}
					variant="subtle"
					color="blue"
					onClick={() => setBankHistoryOpened(true)}
				>
					Bank History
				</Button>
				<Button leftSection={<IconSettings size={18} />} variant="subtle" color="gray" onClick={() => setSettingsOpened(true)}>
					Settings
				</Button>
				<Button leftSection={<IconLogout size={18} />} variant="subtle" color="gray" onClick={logout}>
					Logout
				</Button>
			</Group>
			<SettingsModal opened={settingsOpened} setOpened={setSettingsOpened} assets={assets} />
			<BankHistoryModal opened={bankHistoryOpened} setOpened={setBankHistoryOpened} loadAssets={loadAssets} />
		</Group>
	);
};
