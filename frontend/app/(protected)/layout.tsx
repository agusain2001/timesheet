import { ContentShell } from "@/components/layout/ClientShell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContentShell>{children}</ContentShell>;
}
