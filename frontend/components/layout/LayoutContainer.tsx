interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function LayoutContainer({ sidebar, children }: Props) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden px-2 gap-2">
      {/* Sidebar */}
      {sidebar}

      {/* Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}
