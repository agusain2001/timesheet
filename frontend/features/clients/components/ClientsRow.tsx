import { Client } from "@/types/constants";

interface Props {
  client: Client;
  selected: boolean;
  onSelect: () => void;
}

export function ClientsRow({ client, selected, onSelect }: Props) {
  return (
    <div
      onClick={onSelect}
      className="
  grid grid-cols-5 items-center px-6 py-3 text-sm
  border-b border-foreground/10
  hover:bg-foreground/5
  transition-colors
"
    >
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={onSelect}
        />
        {client?.name}
      </span>
      <span>{client?.alias}</span>
      <span>{client?.region}</span>
      <span>{client?.business_sector || client?.sector}</span>
      <span>•••</span>
    </div>
  );
}
