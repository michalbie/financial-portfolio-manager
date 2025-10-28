'use client';

import { Container, Title, Text, Button, Group, Paper } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function CTASection() {
  const router = useRouter();

  return (
    <Paper radius={0} py={100} withBorder={false} bg="blue.6" c="white">
      <Container size="lg" ta="center">
        <Title order={2} mb="md">
          Ready to take control of your finances?
        </Title>
        <Text size="lg" mb="xl" c="white">
          Join FinMate today and start building your smart portfolio.
        </Text>
        <Group justify="center">
          <Button color="dark" size="md" onClick={() => router.push('/register')}>
            Get Started
          </Button>
          <Button variant="white" color="blue" onClick={() => router.push('/login')}>
            Log In
          </Button>
        </Group>
      </Container>
    </Paper>
  );
}
