'use client';

import { Container, Text, Group } from '@mantine/core';

export default function Footer() {
  return (
    <Container size="lg" py="xl" ta="center">
      <Group justify="center" gap="lg" mb="sm">
        <Text size="sm" c="dimmed">Privacy</Text>
        <Text size="sm" c="dimmed">Terms</Text>
        <Text size="sm" c="dimmed">Contact</Text>
      </Group>
      <Text size="sm" c="dimmed">
        © {new Date().getFullYear()} FinMate. All rights reserved.
      </Text>
    </Container>
  );
}
