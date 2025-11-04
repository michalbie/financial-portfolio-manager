import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getMe } from "../api/auth";

interface User {
	email: string;
	name: string;
	roles?: string[];
	permissions?: string[];
}

interface AuthContextType {
	user: User | null;
	loading: boolean;
	refreshUser: () => Promise<void>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchUser = async () => {
		const token = localStorage.getItem("access_token");
		if (!token) {
			setLoading(false);
			return;
		}

		try {
			const data = await getMe();
			if (data) {
				setUser(data);
			}
		} catch (error) {
			console.error("Failed to fetch user:", error);
			localStorage.removeItem("access_token");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUser();
	}, []);

	const refreshUser = async () => {
		await fetchUser();
	};

	const logout = () => {
		localStorage.removeItem("access_token");
		setUser(null);
		window.location.href = "/login";
	};

	return <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
