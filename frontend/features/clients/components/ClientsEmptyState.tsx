import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function ClientsEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <h2 className="text-lg leading-0 font-semibold">No clients yet!</h2>
      <p className="text-sm font-medium text-gray-400 max-w-xl">
        Manage and organize all your clients in one place, keep everything
        structured, and add a client to get started today.
      </p>

      <Button
        className="hover:scale-[1.03] transition-all duration-500 ease-in-out"
        icon={<Plus size={16} />}
      >
        Add Client
      </Button>
    </div>
  );
}
