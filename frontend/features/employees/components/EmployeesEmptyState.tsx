import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function EmployeesEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <h2 className="text-lg leading-0 font-semibold">No Department yet!</h2>
      <p className="text-sm font-medium text-gray-400 max-w-xl">
        Manage and organize employees in one place, assign managers, track teams
        efficiently, and add a employee to get started today.
      </p>

      <Button
        className="hover:scale-[1.03] transition-all duration-500 ease-in-out"
        icon={<Plus size={16} />}
      >
        Add Employees
      </Button>
    </div>
  );
}
