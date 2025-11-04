import React from "react";
import { Container, Title, Text, Button, Stack, Box, Paper } from "@mantine/core";
import { IconBrandGoogle, IconSparkles, IconShieldCheck } from "@tabler/icons-react";
import { loginWithGoogle } from "../../api/auth";

export default function Login() {
	return (
		<Box style={{ background: "#0a0a0a", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
			{/* Futuristic grid background */}
			<Box
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
					backgroundSize: "50px 50px",
					opacity: 0.3,
				}}
			/>

			{/* Glow effect */}
			<Box
				style={{
					position: "absolute",
					top: "30%",
					left: "50%",
					transform: "translateX(-50%)",
					width: "600px",
					height: "600px",
					background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
					pointerEvents: "none",
				}}
			/>

			<Container size="sm" style={{ position: "relative", zIndex: 1 }} py={120}>
				<Stack align="center" justify="center" gap={50}>
					{/* Logo/Brand Badge */}
					<Box
						style={{
							padding: "8px 20px",
							background: "rgba(59, 130, 246, 0.1)",
							border: "1px solid rgba(59, 130, 246, 0.3)",
							borderRadius: "100px",
							display: "inline-flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<IconSparkles size={16} color="#3b82f6" />
						<Text size="sm" fw={500} style={{ color: "#3b82f6" }}>
							Networthy
						</Text>
					</Box>

					{/* Main Title */}
					<Stack align="center" gap="md">
						<Title
							order={1}
							size={56}
							fw={900}
							ta="center"
							style={{
								color: "white",
								lineHeight: 1.1,
								letterSpacing: "-0.02em",
							}}
						>
							Welcome Back
						</Title>

						<Text size="lg" ta="center" maw={400} style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
							Sign in to access your financial dashboard and track your net worth.
						</Text>
					</Stack>

					{/* Login Card */}
					<Paper
						shadow="xl"
						p={50}
						radius="xl"
						style={{
							background: "rgba(255,255,255,0.03)",
							border: "1px solid rgba(59, 130, 246, 0.2)",
							backdropFilter: "blur(20px)",
							width: "100%",
							maxWidth: "450px",
						}}
					>
						<Stack gap="xl" align="center">
							<Stack gap="sm" align="center">
								<Title order={3} size="h4" style={{ color: "white" }}>
									Sign In
								</Title>
								<Text size="sm" ta="center" style={{ color: "rgba(255,255,255,0.5)" }}>
									Choose your preferred sign in method
								</Text>
							</Stack>

							{/* Google Sign In Button */}
							<Button
								size="lg"
								radius="lg"
								fullWidth
								onClick={loginWithGoogle}
								leftSection={
									<Box
										style={{
											width: "24px",
											height: "24px",
											background: "white",
											borderRadius: "4px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<IconBrandGoogle size={18} color="#4285F4" />
									</Box>
								}
								styles={{
									root: {
										background: "rgba(255, 255, 255, 0.1)",
										border: "1px solid rgba(255, 255, 255, 0.2)",
										color: "white",
										height: "56px",
										fontSize: "16px",
										fontWeight: 600,
										transition: "all 0.2s ease",
										"&:hover": {
											background: "rgba(255, 255, 255, 0.15)",
											border: "1px solid rgba(59, 130, 246, 0.5)",
											transform: "translateY(-2px)",
										},
									},
								}}
							>
								Continue with Google
							</Button>

							{/* Divider with "or" */}
							<Box style={{ width: "100%", position: "relative", textAlign: "center" }}>
								<Box
									style={{
										position: "absolute",
										top: "50%",
										left: 0,
										right: 0,
										height: "1px",
										background: "rgba(255,255,255,0.1)",
									}}
								/>
								<Text
									size="sm"
									style={{
										position: "relative",
										background: "rgba(10,10,10,1)",
										display: "inline-block",
										padding: "0 16px",
										color: "rgba(255,255,255,0.4)",
									}}
								>
									More options coming soon
								</Text>
							</Box>

							{/* Security Note */}
							<Box
								style={{
									padding: "16px",
									background: "rgba(59, 130, 246, 0.05)",
									border: "1px solid rgba(59, 130, 246, 0.2)",
									borderRadius: "12px",
									width: "100%",
								}}
							>
								<Stack gap="xs" align="center">
									<IconShieldCheck size={20} color="#3b82f6" />
									<Text size="xs" ta="center" style={{ color: "rgba(255,255,255,0.6)" }}>
										Your data is encrypted and secure. We never access your financial accounts directly.
									</Text>
								</Stack>
							</Box>
						</Stack>
					</Paper>

					{/* Back to Landing */}
					<Button
						variant="subtle"
						size="sm"
						component="a"
						href="/"
						style={{
							color: "rgba(255,255,255,0.5)",
							"&:hover": {
								color: "#3b82f6",
							},
						}}
					>
						← Back to home
					</Button>
				</Stack>
			</Container>

			{/* Footer */}
			<Box
				style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					padding: "32px",
					textAlign: "center",
					zIndex: 1,
				}}
			>
				<Text size="sm" style={{ color: "rgba(255,255,255,0.3)" }}>
					By signing in, you agree to our Terms of Service and Privacy Policy
				</Text>
			</Box>
		</Box>
	);
}
