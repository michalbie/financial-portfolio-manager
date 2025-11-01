'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css'; // Mantine 8: required to load base CSS reset
import '@fontsource/inter/variable.css'; // load Inter font

const theme = createTheme({
  fontFamily: 'InterVariable, Inter, sans-serif',
  headings: { fontFamily: 'InterVariable, Inter, sans-serif', fontWeight: "700" },
  primaryColor: 'indigo',
  defaultRadius: 'md',
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      {children}
    </MantineProvider>
  );
}
