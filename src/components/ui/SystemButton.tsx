import { ButtonHTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface SystemButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "danger" | "outline";
    isLoading?: boolean;
}

// Combine Framer Motion with standard button props
type ButtonProps = SystemButtonProps & HTMLMotionProps<"button">;

export const SystemButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", isLoading, children, ...props }, ref) => {

        const variants = {
            primary: "bg-system-blue/10 border-system-blue text-system-blue hover:bg-system-blue hover:text-black",
            danger: "bg-system-danger/10 border-system-danger text-system-danger hover:bg-system-danger hover:text-black",
            outline: "bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white"
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "relative border px-6 py-3 rounded-md font-bold uppercase tracking-wider transition-colors duration-200",
                    variants[variant],
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <span className="animate-pulse">PROCESSING...</span>
                ) : (
                    children
                )}
            </motion.button>
        );
    }
);

SystemButton.displayName = "SystemButton";
