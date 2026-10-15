import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/lib/theme";

/** App-wide toasts, announced with role="status". Sits above the transfer bar. */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      offset={64}
      toastOptions={{
        classNames: {
          toast: "!font-sans !text-[13px] !rounded-md !border !border-line !bg-background !text-foreground !shadow-float !py-2.5",
        },
      }}
    />
  );
}
