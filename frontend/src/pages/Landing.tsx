import React from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Box,
  Group,
} from '@mantine/core';
import {
  IconArrowRight,
  IconSparkles,
  IconChartLine,
  IconRobot,
  IconShieldCheck,
  IconTrendingUp,
} from '@tabler/icons-react';

export default function Landing() {
  return (
    <Box style={{ background: '#0a0a0a', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Futuristic grid background */}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.3,
        }}
      />

      {/* Glow effect */}
      <Box
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Container size="md" style={{ position: 'relative', zIndex: 1 }} py={80}>
        {/* Hero Section */}
        <Stack align="center" justify="center" gap={50}>
          <Stack align="center" gap="xl">
            {/* Badge */}
            <Box
              style={{
                padding: '8px 20px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '100px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <IconSparkles size={16} color="#3b82f6" />
              <Text size="sm" fw={500} style={{ color: '#3b82f6' }}>
                All Assets, One Place
              </Text>
            </Box>

            {/* Main Title */}
            <Title
              order={1}
              size={72}
              fw={900}
              ta="center"
              style={{
                color: 'white',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              Your Net Worth,
              <br />
              <Text
                span
                inherit
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                One Number
              </Text>
            </Title>

            {/* Subtitle */}
            <Text
              size="xl"
              ta="center"
              maw={600}
              style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}
            >
              Track your complete financial picture in one place. Stocks, bonds, crypto, and more.
              AI-powered prognosis predicts your future net worth.
            </Text>

            {/* Demo Display - Big centered number mockup */}
            <Box
              mt={40}
              mb={40}
              p={60}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '24px',
                backdropFilter: 'blur(20px)',
                width: '100%',
                maxWidth: '700px',
              }}
            >
              <Stack align="center" gap="md">
                <Text size="sm" fw={500} style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Total Net Worth
                </Text>
                <Title
                  order={1}
                  style={{
                    fontSize: '96px',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  $1,247,382
                </Title>
                <Group gap="xs">
                  <Box
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                    }}
                  />
                  <Text size="sm" style={{ color: '#10b981' }}>
                    +12.4% this month
                  </Text>
                </Group>
              </Stack>
            </Box>

            {/* CTA Button */}
            <Button
              size="xl"
              radius="xl"
              rightSection={<IconArrowRight size={20} />}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                border: 'none',
                fontWeight: 600,
                fontSize: '18px',
                padding: '24px 48px',
                height: 'auto',
              }}
            >
              Get Started
            </Button>
          </Stack>
        </Stack>
      </Container>

      {/* Features Section */}
      <Container size="lg" style={{ position: 'relative', zIndex: 1 }} py={80}>
        <Stack gap={60}>
          {/* Section Title */}
          <Stack align="center" gap="md">
            <Text
              size="sm"
              fw={600}
              style={{
                color: 'rgba(59, 130, 246, 0.8)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Features
            </Text>
            <Title
              order={2}
              size={48}
              fw={900}
              ta="center"
              style={{ color: 'white', letterSpacing: '-0.02em' }}
            >
              Built for the Future
            </Title>
          </Stack>

          {/* Feature Grid */}
          <Group justify="center" gap="xl" style={{ flexWrap: 'wrap' }}>
            {/* Feature 1 */}
            <Box
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '16px',
                padding: '32px',
                width: '320px',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Stack gap="md">
                <Box
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconChartLine size={24} color="#3b82f6" />
                </Box>
                <Title order={3} size="h4" style={{ color: 'white' }}>
                  Real-time Tracking
                </Title>
                <Text size="sm" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Monitor all your assets in real-time. Stocks, bonds, crypto, and more - 
                  all updated instantly as markets move.
                </Text>
              </Stack>
            </Box>

            {/* Feature 2 */}
            <Box
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '16px',
                padding: '32px',
                width: '320px',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Stack gap="md">
                <Box
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconRobot size={24} color="#8b5cf6" />
                </Box>
                <Title order={3} size="h4" style={{ color: 'white' }}>
                  AI Prognosis
                </Title>
                <Text size="sm" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Advanced AI algorithms predict your portfolio's future performance and 
                  suggest optimization strategies.
                </Text>
              </Stack>
            </Box>

            {/* Feature 3 */}
            <Box
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px',
                padding: '32px',
                width: '320px',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Stack gap="md">
                <Box
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconTrendingUp size={24} color="#10b981" />
                </Box>
                <Title order={3} size="h4" style={{ color: 'white' }}>
                  Growth Insights
                </Title>
                <Text size="sm" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Identify opportunities and risks with AI-powered analytics that learn 
                  from market patterns and trends.
                </Text>
              </Stack>
            </Box>
          </Group>
        </Stack>
      </Container>

      {/* Security Section */}
      <Container size="md" style={{ position: 'relative', zIndex: 1 }} py={60}>
        <Stack align="center" gap="xl">
          <Box
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconShieldCheck size={32} color="#ef4444" />
          </Box>
          <Stack align="center" gap="sm">
            <Title order={2} size={36} fw={900} ta="center" style={{ color: 'white' }}>
              Your Privacy First
            </Title>
            <Text size="lg" ta="center" maw={500} style={{ color: 'rgba(255,255,255,0.6)' }}>
              No bank account pairing required. No linking to financial institutions. 
              You control your data - manually track your assets with complete privacy and security.
            </Text>
          </Stack>
        </Stack>
      </Container>

      {/* Footer */}
      <Container size="lg" style={{ position: 'relative', zIndex: 1 }} py={40}>
        <Text ta="center" size="sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          © 2025 Networthy. All rights reserved.
        </Text>
      </Container>
    </Box>
  );
}