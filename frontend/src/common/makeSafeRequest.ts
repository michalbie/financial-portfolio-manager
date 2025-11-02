import makeRequest from "./makeRequest";
import { notifications } from '@mantine/notifications';

function isErrorResponse<T>(data: T | { error: string }): data is { error: string } {
	return (data as { error: string }).error !== undefined;
}

interface OptionsParams<T> {
	payload?: any;
	params?: any;
	contentType?: string;
	onErrorMessage?: string;
	onSuccessMessage?: string;
	onError?: () => void;
	onSuccess?: (data: T) => void;
}

const statusMessages: Record<number, string> = {
	200: "Request was successful.",
	401: "Unauthorized access. Try again",
	404: "Resource not found.",
	500: "Internal server error.",
	503: "Service unavailable. Please try again later.",
};

/**
 * Sends a safe HTTP request and parses the JSON response with built-in error handling.
 *
 * @template T The expected shape of the JSON response.
 * @param url - The API endpoint.
 * @param method - The HTTP method (e.g., "GET", "POST").
 * @param options - Optional parameters including payload, query parameters, content type, and success message.
 * @param options.payload - The request body for POST requests.
 * @param options.params - Query parameters to append to the URL.
 * @param options.contentType - The content type of the request (default is "json").
 * @param options.onErrorMessage - A message to display on error.
 * @param options.onSuccessMessage - A message to display on successful request completion.
 * @param options.onError - A callback function to handle errors.
 * @param options.onSuccess - A callback function to execute on successful request completion.
 * @returns A Promise that resolves to the parsed response of type T, or null on error.
 */

export async function makeSafeRequest<T>(url: string, method: string, options?: OptionsParams<T>): Promise<T | null> {
	const { payload, params, contentType, onErrorMessage, onSuccessMessage, onSuccess, onError } = options || {};

	try {
		const response = await makeRequest(url, method, payload, params, contentType);
		const json = (await response.json()) as T | { error: string };
		const isError = isErrorResponse(json);

		if (isError || !response.ok) {
			if (isError) {
				console.error(json.error);
                notifications.show({
                    title: 'Error',
                    message: json.error,
                    color: 'red',
                });
			} else {
				console.error(statusMessages[response.status] || `HTTP Error: ${response.status} ${response.statusText}`);
                notifications.show({
                    title: 'Error',
                    message: statusMessages[response.status] || `HTTP Error: ${response.status} ${response.statusText}`,
                    color: 'red',
                });
			}
			onError && onError();
			return null;
		}

		onSuccessMessage && notifications.show({
            title: 'Success',
            message: onSuccessMessage,
            color: 'green',
        });
		onSuccess && onSuccess(json);
		return json;
	} catch (error) {
		console.error("Request failed:", error);
		notifications.show({
            title: 'Error',
            message: onErrorMessage || "An error occurred while processing your request. Please try again later.",
            color: 'red',
        });
		onError && onError();
		return null;
	}
}