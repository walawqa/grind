import Link from "next/link";
import { FileUp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { DateRangePicker, PlatformPicker, RestaurantPicker } from "./filters";
import { UserMenu } from "./user-menu";

export function PageHeader({
  title,
  subtitle,
  filters = true,
  platformFilter = true,
  importButton = true,
}: {
  title: string;
  subtitle?: string;
  filters?: boolean;
  platformFilter?: boolean;
  importButton?: boolean;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-text sm:text-[26px]">{title}</h1>
          {subtitle ? <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {importButton ? (
            <Link href="/demo/import" className={cn(buttonVariants({ variant: "primary" }), "hidden sm:inline-flex")}>
              <FileUp />
              Importuj dane
            </Link>
          ) : null}
          <div className="hidden lg:block">
            <UserMenu />
          </div>
        </div>
      </div>
      {filters ? (
        <div className="flex flex-wrap items-center gap-2">
          <RestaurantPicker />
          {platformFilter ? <PlatformPicker /> : null}
          <div className="w-full sm:ml-auto sm:w-auto">
            <DateRangePicker />
          </div>
        </div>
      ) : null}
    </header>
  );
}
