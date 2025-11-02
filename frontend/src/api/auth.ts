
export function loginWithGoogle() {
  // Full-page redirect to backend OAuth start
  window.location.href = `${getAPIEndpoint()}auth/login/google`;
}

export interface MeResponse {
  email: string;
  name: string;
}

import { getAPIEndpoint } from "../common/getAPIEndpoint";
import { makeSafeRequest } from "../common/makeSafeRequest";

export function getMe() {
  return makeSafeRequest<MeResponse>("auth/me", "GET", {
    onErrorMessage: "Failed to load user.",
  });
}
