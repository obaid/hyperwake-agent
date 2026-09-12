import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Mola Agent',
  description: 'A chat app whose agent drives a throwaway Omarchy computer.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
