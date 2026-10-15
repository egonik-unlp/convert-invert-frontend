import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[opacity,background-color,color] disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-[15px] [&_svg]:w-[15px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Neutral primary: foreground on background. */
        default: "bg-foreground text-background hover:opacity-90",
        /** The one accent: download actions only. */
        accent: "bg-accent text-accent-foreground hover:opacity-90",
        outline: "border border-line hover:bg-hover",
        ghost: "text-muted-foreground hover:bg-hover hover:text-foreground",
        danger: "text-bad hover:bg-bad/10",
        link: "h-auto px-0 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-8 px-3 text-sm",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
