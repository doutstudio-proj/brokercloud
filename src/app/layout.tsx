// Layout raiz mínimo — cada Route Group ((auth) e (app)) declara seu próprio <html> e <body>
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
