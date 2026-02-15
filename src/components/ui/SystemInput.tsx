import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SystemInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const SystemInput = forwardRef<HTMLInputElement, SystemInputProps>(
    ({ className, label, error, icon, ...props }, ref) => {
        return (
            <div className="space-y-1">
                {label && (
                    <label className="text-xs uppercase tracking-widest text-gray-400">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-system-blue transition-colors">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        step="0.01"
                        className={cn(
                            "w-full bg-system-dark/50 border border-gray-700 rounded-md py-3 text-white placeholder-gray-600 outline-none transition-all",
                            icon ? "pl-10 pr-4" : "px-4",
                            "focus:border-system-blue focus:shadow-[0_0_10px_rgba(0,163,255,0.3)]",
                            error && "border-system-danger focus:border-system-danger",
                            className
                        )}
                        {...props}
                    />
                    {/* Animated line on focus could go here */}
                </div>
                {error && (
                    <p className="text-system-danger text-xs animate-pulse">
                        ! {error}
                    </p>
                )}
            </div>
        );
    }
);

SystemInput.displayName = "SystemInput";
