interface Props {
  allSelected: boolean;
  onSelectAll: () => void;
}

export function EmployeesTableHeader({ allSelected, onSelectAll }: Props) {
  return (
    <div className="grid grid-cols-5 px-6 py-3 text-sm border-t border-b border-foreground/10 dark:border-white/10">
      <span className=" flex items-center gap-2">
        <input
          type="checkbox"
          className="relative top-px scale-125 accent-blue-600 cursor-pointer"
          checked={allSelected}
          onChange={onSelectAll}
        />
        <span onClick={onSelectAll} className="cursor-pointer">
          Profile Photo
        </span>
      </span>
      <span className=" font-semibold text-foreground">Employee Code</span>
      <span className="font-semibold text-foreground">Employee Name</span>
      <span className="font-semibold text-foreground">Department</span>
      <span className="font-semibold text-foreground">Position</span>
    </div>
  );
}
