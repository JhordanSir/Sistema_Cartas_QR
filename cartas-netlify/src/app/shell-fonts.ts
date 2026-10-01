import { Fraunces, Inter } from 'next/font/google';

// Applied per surface (panel, auth pages, 404), never in the root layout, so the
// public menu does not preload fonts it never uses.
const fraunces = Fraunces({ display: 'swap', subsets: ['latin'], variable: '--font-fraunces' });
const inter = Inter({ display: 'swap', subsets: ['latin'], variable: '--font-inter' });

export const shellFontClassName = `${fraunces.variable} ${inter.variable}`;
