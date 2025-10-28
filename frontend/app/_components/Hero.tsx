'use client';

import { Container, Title, Text, Button, Group } from '@mantine/core';

export default function Hero() {
  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #e7f5ff 0%, white 100%)',
        padding: '120px 0',
        textAlign: 'center',
      }}
    >
      <Container size="lg">
        <Title order={1} fw={800} size="3rem" mb="md" c="blue.7">
          Manage your <Text span c="blue.5">finances</Text> smarter
        </Title>
        <Text size="lg" c="dimmed" maw={600} mx="auto" mb="xl">
          FinMate helps you understand, track, and grow your personal portfolio with
          intelligent insights and clean design.
        </Text>
        <Group justify="center" gap="md">
          <Button size="md" color="blue.6" radius="md">
            Get started
          </Button>
          <Button size="md" variant="outline" color="blue.6" radius="md">
            Learn more
          </Button>
        </Group>
      </Container>
    </section>
  );
}
