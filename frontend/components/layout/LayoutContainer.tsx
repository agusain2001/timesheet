interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function LayoutContainer({ sidebar, children }: Props) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden px-2 gap-2">
      {/* Sidebar */}
      {sidebar}

      {/* Content Area — uniform p-6 padding for all pages */}
      <main className="flex-1 min-h-0 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
