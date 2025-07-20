import { ThemeProvider as ThemeContextProvider } from '@/contexts/ThemeContext';
import { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>;
}
