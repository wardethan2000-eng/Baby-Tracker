import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  full?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", full, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          variant === "primary" && "bg-primary text-base rounded-3xl shadow-[0_4px_24px_rgba(56,189,248,0.25)] hover:bg-primary/90",
          variant === "secondary" && "border border-primary text-primary rounded-2xl hover:bg-primary/10",
          variant === "ghost" && "text-text-secondary hover:text-primary rounded-2xl",
          variant === "danger" && "bg-danger text-white rounded-2xl hover:bg-danger/90",
          size === "sm" && "h-9 px-3 text-sm",
          size === "md" && "h-11 px-5",
          size === "lg" && "h-12 px-8 text-lg",
          full && "w-full",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };