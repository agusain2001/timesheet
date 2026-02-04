import { Division, Employee } from "@/types/constants";
import Image from "next/image";

interface Props {
  employee: Employee;
  selected: boolean;
  onSelect: () => void;
}

export function EmployeesRow({ employee, selected, onSelect }: Props) {
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
      <span className=" flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={onSelect}
        />
        <Image
          className="ml-2 rounded-full"
          src={employee?.profilePic}
          alt="user logo"
          height={40}
          width={40}
        />
      </span>
      <span className="">{employee?.employeeCode}</span>
      <span className="">{employee?.name}</span>
      <span className="">{employee?.position}</span>
      <span className="">{employee?.department}</span>
    </div>
  );
}
