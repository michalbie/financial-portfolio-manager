import "./App.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login/Login";
import AuthCallback from "./pages/Login/AuthCallback";
import type { JSX } from "react";
import Dashboard from "./pages/Dashboard/Dashboard";
import { AuthProvider } from "./context/AuthContext";
import { ModalsProvider } from "@mantine/modals";

function RequireAuth({ children }: { children: JSX.Element }) {
	const token = localStorage.getItem("access_token");
	return token ? children : <Navigate to="/login" replace />;
}

function App() {
	const token = localStorage.getItem("access_token");

	return (
		<MantineProvider defaultColorScheme="dark">
			<ModalsProvider>
				<Notifications />
				<AuthProvider>
					<BrowserRouter>
						<Routes>
							<Route path="/login" element={<Login />} />
							<Route path="/auth/callback" element={<AuthCallback />} />
							<Route
								path="/dashboard"
								element={
									<RequireAuth>
										<Dashboard />
									</RequireAuth>
								}
							/>
							<Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Landing />} />
							<Route path="*" element={<NotFound />} />
						</Routes>
					</BrowserRouter>
				</AuthProvider>
			</ModalsProvider>
		</MantineProvider>
	);
}

export default App;
