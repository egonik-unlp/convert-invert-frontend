import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/lib/theme";

/** App-wide toast surface. Themed to match the active light/dark theme. */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans rounded-lg border border-border",
        },
      }}
    />
  );
}
