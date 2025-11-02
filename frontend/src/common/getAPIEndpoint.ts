export const getAPIEndpoint = () => {
  if (import.meta.env.VITE_APP_ENV === "development") {
    return "http://localhost:8000/";
  }
  return window.location.origin + "/";
};
