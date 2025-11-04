import React, { useState, useEffect } from "react";
import {
	Container,
	Title,
	Table,
	Badge,
	Button,
	Group,
	Stack,
	TextInput,
	Select,
	Modal,
	Paper,
	Text,
	Textarea,
	MultiSelect,
	Tabs,
	ActionIcon,
	Tooltip,
} from "@mantine/core";
import { IconTrash, IconEdit, IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
	listUsers,
	assignRole,
	removeRoleFromUser,
	listRoles,
	createRole,
	updateRolePermissions,
	deleteRole,
	listPermissions,
	createPermission,
	type UserRoleInfo,
	type RoleInfo,
	type PermissionInfo,
} from "../../api/admin";
import { getMe } from "../../api/auth";
import { useNavigate } from "react-router-dom";

const AdminPanel: React.FC = () => {
	const [users, setUsers] = useState<UserRoleInfo[]>([]);
	const [roles, setRoles] = useState<RoleInfo[]>([]);
	const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
	const [loading, setLoading] = useState(true);

	// Modal states
	const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
	const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
	const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
	const [createPermissionModalOpen, setCreatePermissionModalOpen] = useState(false);

	// Form states
	const [selectedUserEmail, setSelectedUserEmail] = useState("");
	const [selectedRoleName, setSelectedRoleName] = useState("");
	const [newRoleName, setNewRoleName] = useState("");
	const [newRoleDescription, setNewRoleDescription] = useState("");
	const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
	const [editingRole, setEditingRole] = useState<RoleInfo | null>(null);
	const [newPermissionName, setNewPermissionName] = useState("");
	const [newPermissionDescription, setNewPermissionDescription] = useState("");

	const navigate = useNavigate();

	const loadData = async () => {
		setLoading(true);

		// Check if user has permission
		const meData = await getMe();
		if (!meData || !meData.permissions.includes("manage_users")) {
			notifications.show({
				title: "Access Denied",
				message: "You do not have permission to access this page.",
				color: "red",
			});
			navigate("/dashboard");
			return;
		}

		const [usersData, rolesData, permissionsData] = await Promise.all([listUsers(), listRoles(), listPermissions()]);

		if (usersData) setUsers(usersData.users);
		if (rolesData) setRoles(rolesData.roles);
		if (permissionsData) setPermissions(permissionsData.permissions);

		setLoading(false);
	};

	useEffect(() => {
		loadData();
	}, []);

	const handleAssignRole = async () => {
		if (!selectedUserEmail || !selectedRoleName) {
			notifications.show({
				title: "Error",
				message: "Please select both user and role.",
				color: "red",
			});
			return;
		}

		const result = await assignRole(selectedUserEmail, selectedRoleName);
		if (result) {
			setAssignRoleModalOpen(false);
			setSelectedUserEmail("");
			setSelectedRoleName("");
			loadData();
		}
	};

	const handleRemoveRole = async (email: string, roleName: string) => {
		const result = await removeRoleFromUser(email, roleName);
		if (result) {
			loadData();
		}
	};

	const handleCreateRole = async () => {
		if (!newRoleName || selectedPermissions.length === 0) {
			notifications.show({
				title: "Error",
				message: "Please enter role name and select at least one permission.",
				color: "red",
			});
			return;
		}

		const result = await createRole(newRoleName, newRoleDescription, selectedPermissions);

		if (result) {
			setCreateRoleModalOpen(false);
			setNewRoleName("");
			setNewRoleDescription("");
			setSelectedPermissions([]);
			loadData();
		}
	};

	const handleUpdateRole = async () => {
		if (!editingRole || selectedPermissions.length === 0) {
			notifications.show({
				title: "Error",
				message: "Please select at least one permission.",
				color: "red",
			});
			return;
		}

		const result = await updateRolePermissions(editingRole.name, selectedPermissions);

		if (result) {
			setEditRoleModalOpen(false);
			setEditingRole(null);
			setSelectedPermissions([]);
			loadData();
		}
	};

	const handleDeleteRole = async (roleName: string) => {
		if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
			return;
		}

		const result = await deleteRole(roleName);
		if (result) {
			loadData();
		}
	};

	const handleCreatePermission = async () => {
		if (!newPermissionName) {
			notifications.show({
				title: "Error",
				message: "Please enter permission name.",
				color: "red",
			});
			return;
		}

		const result = await createPermission(newPermissionName, newPermissionDescription);

		if (result) {
			setCreatePermissionModalOpen(false);
			setNewPermissionName("");
			setNewPermissionDescription("");
			loadData();
		}
	};

	const openEditRoleModal = (role: RoleInfo) => {
		setEditingRole(role);
		setSelectedPermissions(role.permissions);
		setEditRoleModalOpen(true);
	};

	if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

	const permissionOptions = permissions.map((p) => ({ value: p.name, label: `${p.name}${p.description ? ` - ${p.description}` : ""}` }));
	const roleOptions = roles.map((r) => ({ value: r.name, label: r.name }));
	const userOptions = users.map((u) => ({ value: u.email, label: `${u.name} (${u.email})` }));

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				<Group justify="space-between">
					<Title order={2}>Admin Panel</Title>
					<Button onClick={() => navigate("/dashboard")} variant="subtle">
						Back to Dashboard
					</Button>
				</Group>

				<Tabs defaultValue="users">
					<Tabs.List>
						<Tabs.Tab value="users">Users</Tabs.Tab>
						<Tabs.Tab value="roles">Roles</Tabs.Tab>
						<Tabs.Tab value="permissions">Permissions</Tabs.Tab>
					</Tabs.List>

					{/* Users Tab */}
					<Tabs.Panel value="users" pt="md">
						<Paper shadow="xs" p="md" withBorder>
							<Group justify="space-between" mb="md">
								<Title order={3}>Users</Title>
								<Button onClick={() => setAssignRoleModalOpen(true)} leftSection={<IconPlus size={16} />}>
									Assign Role
								</Button>
							</Group>

							<Table striped highlightOnHover>
								<Table.Thead>
									<Table.Tr>
										<Table.Th>Name</Table.Th>
										<Table.Th>Email</Table.Th>
										<Table.Th>Roles</Table.Th>
										<Table.Th>Permissions</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{users.length === 0 ? (
										<Table.Tr>
											<Table.Td colSpan={4}>
												<Text ta="center" c="dimmed">
													No users found
												</Text>
											</Table.Td>
										</Table.Tr>
									) : (
										users.map((user) => (
											<Table.Tr key={user.id}>
												<Table.Td>{user.name}</Table.Td>
												<Table.Td>{user.email}</Table.Td>
												<Table.Td>
													<Group gap="xs">
														{user.roles.map((role) => (
															<Badge
																key={role}
																color={role === "admin" ? "red" : "blue"}
																style={{ cursor: "pointer" }}
																rightSection={
																	<ActionIcon
																		size="xs"
																		color="red"
																		variant="transparent"
																		onClick={() => handleRemoveRole(user.email, role)}
																	>
																		×
																	</ActionIcon>
																}
															>
																{role}
															</Badge>
														))}
													</Group>
												</Table.Td>
												<Table.Td>
													<Group gap="xs">
														{user.permissions.slice(0, 3).map((perm) => (
															<Badge key={perm} variant="light" size="sm">
																{perm}
															</Badge>
														))}
														{user.permissions.length > 3 && (
															<Tooltip label={user.permissions.slice(3).join(", ")}>
																<Badge variant="light" size="sm">
																	+{user.permissions.length - 3}
																</Badge>
															</Tooltip>
														)}
													</Group>
												</Table.Td>
											</Table.Tr>
										))
									)}
								</Table.Tbody>
							</Table>
						</Paper>
					</Tabs.Panel>

					{/* Roles Tab */}
					<Tabs.Panel value="roles" pt="md">
						<Paper shadow="xs" p="md" withBorder>
							<Group justify="space-between" mb="md">
								<Title order={3}>Roles</Title>
								<Button onClick={() => setCreateRoleModalOpen(true)} leftSection={<IconPlus size={16} />}>
									Create Role
								</Button>
							</Group>

							<Stack gap="md">
								{roles.map((role) => (
									<Paper key={role.id} p="md" withBorder>
										<Group justify="space-between">
											<Stack gap="xs" style={{ flex: 1 }}>
												<Group>
													<Badge size="lg" color={role.name === "admin" ? "red" : "blue"}>
														{role.name}
													</Badge>
													{role.description && (
														<Text size="sm" c="dimmed">
															{role.description}
														</Text>
													)}
												</Group>
												<Group gap="xs">
													<Text size="sm" fw={500}>
														Permissions:
													</Text>
													{role.permissions.map((perm) => (
														<Badge key={perm} variant="light" size="sm">
															{perm}
														</Badge>
													))}
												</Group>
											</Stack>
											<Group gap="xs">
												<ActionIcon variant="light" color="blue" onClick={() => openEditRoleModal(role)}>
													<IconEdit size={16} />
												</ActionIcon>
												{!["admin", "user", "guest"].includes(role.name) && (
													<ActionIcon variant="light" color="red" onClick={() => handleDeleteRole(role.name)}>
														<IconTrash size={16} />
													</ActionIcon>
												)}
											</Group>
										</Group>
									</Paper>
								))}
							</Stack>
						</Paper>
					</Tabs.Panel>

					{/* Permissions Tab */}
					<Tabs.Panel value="permissions" pt="md">
						<Paper shadow="xs" p="md" withBorder>
							<Group justify="space-between" mb="md">
								<Title order={3}>Permissions</Title>
								<Button onClick={() => setCreatePermissionModalOpen(true)} leftSection={<IconPlus size={16} />}>
									Create Permission
								</Button>
							</Group>

							<Stack gap="sm">
								{permissions.map((perm) => (
									<Paper key={perm.id} p="sm" withBorder>
										<Group justify="space-between">
											<div>
												<Badge size="lg">{perm.name}</Badge>
												{perm.description && (
													<Text size="sm" c="dimmed" mt="xs">
														{perm.description}
													</Text>
												)}
											</div>
										</Group>
									</Paper>
								))}
							</Stack>
						</Paper>
					</Tabs.Panel>
				</Tabs>
			</Stack>

			{/* Assign Role Modal */}
			<Modal opened={assignRoleModalOpen} onClose={() => setAssignRoleModalOpen(false)} title="Assign Role to User">
				<Stack>
					<Select
						label="User"
						placeholder="Select a user"
						data={userOptions}
						value={selectedUserEmail}
						onChange={(value) => setSelectedUserEmail(value || "")}
						searchable
					/>
					<Select
						label="Role"
						placeholder="Select a role"
						data={roleOptions}
						value={selectedRoleName}
						onChange={(value) => setSelectedRoleName(value || "")}
					/>
					<Button onClick={handleAssignRole}>Assign Role</Button>
				</Stack>
			</Modal>

			{/* Create Role Modal */}
			<Modal opened={createRoleModalOpen} onClose={() => setCreateRoleModalOpen(false)} title="Create New Role">
				<Stack>
					<TextInput
						label="Role Name"
						placeholder="e.g., moderator"
						value={newRoleName}
						onChange={(e) => setNewRoleName(e.target.value)}
					/>
					<Textarea
						label="Description"
						placeholder="Optional description"
						value={newRoleDescription}
						onChange={(e) => setNewRoleDescription(e.target.value)}
					/>
					<MultiSelect
						label="Permissions"
						placeholder="Select permissions"
						data={permissionOptions}
						value={selectedPermissions}
						onChange={setSelectedPermissions}
						searchable
					/>
					<Button onClick={handleCreateRole}>Create Role</Button>
				</Stack>
			</Modal>

			{/* Edit Role Modal */}
			<Modal
				opened={editRoleModalOpen}
				onClose={() => {
					setEditRoleModalOpen(false);
					setEditingRole(null);
					setSelectedPermissions([]);
				}}
				title={`Edit Role: ${editingRole?.name}`}
			>
				<Stack>
					<MultiSelect
						label="Permissions"
						placeholder="Select permissions"
						data={permissionOptions}
						value={selectedPermissions}
						onChange={setSelectedPermissions}
						searchable
					/>
					<Button onClick={handleUpdateRole}>Update Permissions</Button>
				</Stack>
			</Modal>

			{/* Create Permission Modal */}
			<Modal opened={createPermissionModalOpen} onClose={() => setCreatePermissionModalOpen(false)} title="Create New Permission">
				<Stack>
					<TextInput
						label="Permission Name"
						placeholder="e.g., export_data"
						value={newPermissionName}
						onChange={(e) => setNewPermissionName(e.target.value)}
					/>
					<Textarea
						label="Description"
						placeholder="Optional description"
						value={newPermissionDescription}
						onChange={(e) => setNewPermissionDescription(e.target.value)}
					/>
					<Button onClick={handleCreatePermission}>Create Permission</Button>
				</Stack>
			</Modal>
		</Container>
	);
};

export default AdminPanel;
