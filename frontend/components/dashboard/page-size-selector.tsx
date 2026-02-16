"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { t } from "@/i18n/keys";

interface PageSizeSelectorProps {
  currentSize: number;
}

export function PageSizeSelector({ currentSize }: PageSizeSelectorProps) {
  const router = useRouter();
  const pageSizeOptions = [5, 10, 20, 50, 100];

  const handleSizeChange = (newSize: string) => {
    router.push(`/dashboard/apps?page=1&size=${newSize}`);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">
        {t("PAGINATION_ITEMS_PER_PAGE")}
      </span>
      <Select value={currentSize.toString()} onValueChange={handleSizeChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
