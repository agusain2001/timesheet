import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function EmployeesHeader() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Manage Employees</h1>

      <Button icon={<Plus size={16} />}>Add Employee</Button>
    </div>
  );
}
