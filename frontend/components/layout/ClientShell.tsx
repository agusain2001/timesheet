import { LayoutContainer } from "./LayoutContainer";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

interface Props {
  children: React.ReactNode;
}

export function ContentShell({ children }: Props) {
  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col">
      {/* Navbar full width */}
      <Navbar />

      {/* Below navbar */}
      <LayoutContainer sidebar={<Sidebar />}>{children}</LayoutContainer>
    </div>
  );
}
