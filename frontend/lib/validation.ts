/**
 * Validation schemas for API data
 * Using Zod for runtime type validation
 */

import { z, type ZodIssue } from "zod";

// Client validation schema
export const ClientSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Client name is required")
    .min(3, "Client name must be at least 3 characters")
    .max(100, "Client name must be less than 100 characters"),
  alias: z
    .string()
    .min(1, "Alias is required")
    .min(2, "Alias must be at least 2 characters")
    .max(10, "Alias must be less than 10 characters"),
  region: z.string().min(1, "Region is required"),
  sector: z.string().min(1, "Sector is required"),
});

export type ClientFormData = z.infer<typeof ClientSchema>;

// Division validation schema
export const DivisionSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Division name is required")
    .min(3, "Division name must be at least 3 characters")
    .max(100, "Division name must be less than 100 characters"),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .min(2, "Abbreviation must be at least 2 characters")
    .max(10, "Abbreviation must be less than 10 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  headOfDivision: z.string().min(1, "Head of division is required"),
});

export type DivisionFormData = z.infer<typeof DivisionSchema>;

// Employee validation schema
export const EmployeeSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Employee name is required")
    .min(3, "Employee name must be at least 3 characters")
    .max(100, "Employee name must be less than 100 characters"),
  employeeCode: z
    .string()
    .min(1, "Employee code is required")
    .min(2, "Employee code must be at least 2 characters"),
  email: z.string().email("Valid email is required"),
  position: z.string().min(1, "Position is required"),
  department: z.string().min(1, "Department is required"),
  profilePic: z
    .string()
    .url("Profile picture must be a valid URL")
    .optional()
    .nullable(),
});

export type EmployeeFormData = z.infer<typeof EmployeeSchema>;

// Login validation schema
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Valid email is required"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

/**
 * Validate data against schema
 * Returns { success: boolean; errors: Record<string, string> }
 */
export function validateData<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
): { success: boolean; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((err: z.ZodIssue) => {
      const path = err.path.join(".");
      errors[path] = err.message;
    });
    return { success: false, errors };
  }

  return { success: true, errors: {} };
}
