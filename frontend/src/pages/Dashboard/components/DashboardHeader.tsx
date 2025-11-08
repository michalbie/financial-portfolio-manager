import React from "react";
import { Group, Stack, Text, Title, Button } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";

interface DashboardHeaderProps {
	userName: string;
	onLogout: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName, onLogout }) => {
	return (
		<Group justify="space-between" mb={40}>
			<Stack gap={4}>
				<Text size="sm" style={{ color: "rgba(255,255,255,0.4)" }}>
					Welcome back,
				</Text>
				<Title order={2} style={{ color: "white" }}>
					{userName}
				</Title>
			</Stack>
			<Button leftSection={<IconLogout size={18} />} variant="subtle" color="gray" onClick={onLogout}>
				Logout
			</Button>
		</Group>
	);
};
