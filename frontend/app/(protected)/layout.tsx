import { ContentShell } from "@/components/layout/ClientShell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ContentShell>{children}</ContentShell>
      </body>
    </html>
  );
}
