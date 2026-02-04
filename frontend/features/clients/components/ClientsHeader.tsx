import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function ClientsHeader() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Manage Clients</h1>

      <Button icon={<Plus size={16} />}>Add Client</Button>
    </div>
  );
}
