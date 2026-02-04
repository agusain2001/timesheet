import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function DivisionsHeader() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Manage Departments</h1>

      <Button icon={<Plus size={16} />}>Add Department</Button>
    </div>
  );
}
