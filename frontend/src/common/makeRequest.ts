import { getAPIEndpoint } from "./getAPIEndpoint";

const contentTypes: Record<string, string> = {
	json: "application/json",
	form: "application/x-www-form-urlencoded",
	html: "text/html",
};

const makeRequest = async (url: string, method: string, payload?: any, params?: any, contentType: string = "json") => {
	let urlParams: string = "";
	const queryParamsMethods = ["GET", "HEAD", "OPTIONS"];

	if (params) {
		const urlPayload = params as Record<string, string>;
		for (const key in urlPayload) {
			urlParams += `&${key}=${urlPayload[key]}`;
		}
	}

	const token = localStorage.getItem("access_token");
	const headers: Record<string, string> = {
		"Content-Type": contentTypes[contentType],
	};

	// Add Authorization header if token exists and URL doesn't include "login" or "callback"
	if (token && !url.includes("login") && !url.includes("callback")) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	const response = await fetch(`${getAPIEndpoint()}${url}${urlParams.length > 0 ? `?${urlParams.substring(1)}` : ""}`, {
		method,
		headers,
		credentials: "include",
		...(!queryParamsMethods.includes(method)
			? {
					body: JSON.stringify(payload),
			  }
			: {}),
	});

	if (response.status === 401 && !url.includes("login") && !url.includes("callback")) {
		localStorage.removeItem("access_token");
		window.location.href = "/login";
	}

	return response;
};

export default makeRequest;