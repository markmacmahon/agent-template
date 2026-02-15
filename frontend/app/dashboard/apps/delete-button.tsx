"use client";

import { removeApp } from "@/components/actions/apps-action";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface DeleteButtonProps {
  appId: string;
}

export function DeleteButton({ appId }: DeleteButtonProps) {
  const handleDelete = async () => {
    await removeApp(appId);
  };

  return (
    <DropdownMenuItem
      className="text-destructive cursor-pointer"
      onClick={handleDelete}
    >
      Delete
    </DropdownMenuItem>
  );
}
