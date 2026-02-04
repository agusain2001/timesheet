import { Division } from "@/types/constants";

interface Props {
  division: Division;
  selected: boolean;
  onSelect: () => void;
}

export function DivisionsRow({ division, selected, onSelect }: Props) {
  return (
    <div
      onClick={onSelect}
      className="
  grid grid-cols-4 items-center px-6 py-3 text-sm
  border-b border-foreground/10
  hover:bg-foreground/5
  transition-colors
"
    >
      <span className="col-span-1 flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={onSelect}
        />
        {division?.departmentName}
      </span>
      <span className="col-span-1">{division?.managerName}</span>
      <span className="col-span-2">{division?.description}</span>
    </div>
  );
}
