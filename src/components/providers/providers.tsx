"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { ToastProvider } from "./toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <ToastProvider>{children}</ToastProvider>
    </Tooltip.Provider>
  );
}
