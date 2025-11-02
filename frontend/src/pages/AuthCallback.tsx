// frontend/src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    console.log(params, token)

    if (token) {
      localStorage.setItem("access_token", token);
      notifications.show({
        title: "Success",
        message: "Logged in!",
        color: "green",
      });
      navigate("/");
    } else {
      notifications.show({
        title: "Error",
        message: "No token received.",
        color: "red",
      });
      navigate("/login");
    }
  }, [navigate]);

  return <div style={{ padding: 20 }}>Authenticating…</div>;
}
