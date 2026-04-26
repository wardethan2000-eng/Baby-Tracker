import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {label}
          </label>
        )}
        <input
          className={cn(
            "flex h-11 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50",
            error && "border-danger focus:ring-danger",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-danger text-sm mt-1">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };