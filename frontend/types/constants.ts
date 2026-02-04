import { LucideIcon } from "lucide-react";

export type NavItem = {
  name: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
};

// Re-export API types for backwards compatibility
export type { Client, Department, User, Project, Task } from "./api";

// Legacy types for gradual migration
export interface Division {
  id: string;
  departmentName: string;
  managerName: string;
  description: string;
}

export interface Employee {
  id: string;
  profilePic: string;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
}
