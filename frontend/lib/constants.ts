import { Client, Division, Employee } from "@/types/constants";

export const client: Client[] = [
  { id: "1", name: "Acme Corp", alias: "AC", region: "Asia", sector: "IT" },
  { id: "2", name: "Globex", alias: "GX", region: "Europe", sector: "Finance" },
  {
    id: "3",
    name: "Innotech Solutions",
    alias: "IS",
    region: "North America",
    sector: "Healthcare",
  },
];

export const divisions: Division[] = [
  {
    id: "1",
    departmentName: "Engineering",
    managerName: "Arjun Mehta",
    description:
      "Responsible for product development, system architecture, and technical infrastructure. Handles frontend, backend, DevOps, and quality assurance.",
  },
  {
    id: "2",
    departmentName: "Marketing",
    managerName: "Priya Sharma",
    description:
      "Manages brand strategy, digital campaigns, content marketing, and customer acquisition across online and offline channels.",
  },
  {
    id: "3",
    departmentName: "Human Resources",
    managerName: "Rohit Verma",
    description:
      "Oversees recruitment, employee engagement, performance management, and organizational development.",
  },
];

export const employees: Employee[] = [
  {
    id: "emp-001",
    profilePic: "https://randomuser.me/api/portraits/men/32.jpg",
    employeeCode: "EMP1001",
    name: "Arjun Mehta",
    department: "Engineering",
    position: "Senior Frontend Developer",
  },
  {
    id: "emp-002",
    profilePic: "https://randomuser.me/api/portraits/women/44.jpg",
    employeeCode: "EMP1002",
    name: "Priya Sharma",
    department: "Marketing",
    position: "Digital Marketing Manager",
  },
  {
    id: "emp-003",
    profilePic: "https://randomuser.me/api/portraits/men/65.jpg",
    employeeCode: "EMP1003",
    name: "Rohit Verma",
    department: "Human Resources",
    position: "HR Operations Lead",
  },
];
