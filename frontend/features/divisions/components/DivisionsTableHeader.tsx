interface Props {
  allSelected: boolean;
  onSelectAll: () => void;
}

export function DivisionsTableHeader({ allSelected, onSelectAll }: Props) {
  return (
    <div className="grid grid-cols-4 px-6 py-3 text-sm border-t border-b border-foreground/10 dark:border-white/10">
      <span className="col-span-1 flex items-center gap-2">
        <input
          type="checkbox"
          className="relative top-px scale-125 accent-blue-600 cursor-pointer"
          checked={allSelected}
          onChange={onSelectAll}
        />
        <span onClick={onSelectAll} className="cursor-pointer">
          Department Name
        </span>
      </span>
      <span className="col-span-1 font-semibold text-foreground">
        Manager Name
      </span>
      <span className="col-span-2 font-semibold text-foreground">
        Description
      </span>
    </div>
  );
}
