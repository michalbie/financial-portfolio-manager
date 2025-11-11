import React, { useState } from "react";
import { Group, Stack, Text, Title, Button } from "@mantine/core";
import { IconLogout, IconSettings } from "@tabler/icons-react";
import { useAuth } from "../../../context/AuthContext";
import SettingsModal from "./SettingsModal";
import type { Asset } from "../../../api/assets";

interface DashboardHeaderProps {
	assets: Asset[];
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ assets }) => {
	const { user, logout } = useAuth();
	const [settingsOpened, setSettingsOpened] = useState(false);

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
				<Button leftSection={<IconSettings size={18} />} variant="subtle" color="gray" onClick={() => setSettingsOpened(true)}>
					Settings
				</Button>
				<Button leftSection={<IconLogout size={18} />} variant="subtle" color="gray" onClick={logout}>
					Logout
				</Button>
			</Group>
			<SettingsModal opened={settingsOpened} setOpened={setSettingsOpened} assets={assets} />
		</Group>
	);
};
