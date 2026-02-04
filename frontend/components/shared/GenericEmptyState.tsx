"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  title: string;
  description: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}

export function GenericEmptyState({
  title,
  description,
  buttonLabel = "Add Item",
  onButtonClick,
}: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <h2 className="text-lg leading-0 font-semibold">{title}</h2>
      <p className="text-sm font-medium text-gray-400 max-w-xl">
        {description}
      </p>

      {onButtonClick && (
        <Button
          className="hover:scale-[1.03] transition-all duration-500 ease-in-out"
          icon={<Plus size={16} />}
          onClick={onButtonClick}
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
