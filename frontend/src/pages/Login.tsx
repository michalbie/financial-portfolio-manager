// frontend/src/pages/Login.tsx
import { Button, Stack, Title } from "@mantine/core";
import { loginWithGoogle } from "../api/auth";

export default function Login() {
  return (
    <Stack align="center" mt="10%">
      <Title order={2}>Sign in</Title>
      <Button onClick={loginWithGoogle} variant="filled">
        Continue with Google
      </Button>
    </Stack>
  );
}
