'use client';

import { Container, SimpleGrid, Card, Text, Title } from '@mantine/core';
import { Wallet, TrendingUp, ShieldCheck } from 'lucide-react';

const data = [
  { icon: Wallet, title: 'Unified portfolio', desc: 'See all your investments and assets in one clear dashboard.' },
  { icon: TrendingUp, title: 'Smart analytics', desc: 'AI-powered insights help you optimize spending and returns.' },
  { icon: ShieldCheck, title: 'Bank-level security', desc: 'Your data is encrypted and stored securely at all times.' },
];

export default function Features() {
  return (
    <Container size="lg" py={80}>
      <Title order={2} ta="center" mb="xl">
        Why choose FinMate?
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
        {data.map((item) => (
          <Card key={item.title} shadow="md" radius="md" p="lg" withBorder ta="center">
            <item.icon size={36} style={{ margin: 'auto', color: 'var(--mantine-color-blue-6)' }} />
            <Text fw={600} mt="md" mb="xs">
              {item.title}
            </Text>
            <Text size="sm" c="dimmed">
              {item.desc}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
