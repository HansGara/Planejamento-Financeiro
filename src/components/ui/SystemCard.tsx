import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface SystemCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    title?: string;
    glow?: boolean;
}

export function SystemCard({
    children,
    className,
    title,
    glow = false,
    ...props
}: SystemCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={glow ? { boxShadow: "0 0 20px rgba(0, 163, 255, 0.2)" } : undefined}
            className={cn(
                "system-card relative overflow-hidden rounded-lg p-6",
                glow && "system-glow",
                className
            )}
            {...props}
        >
            {/* Decorative Corner Lines */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-system-blue opacity-50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-system-blue opacity-50 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-system-blue opacity-50 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-system-blue opacity-50 rounded-br-lg" />

            {title && (
                <div className="mb-4 border-b border-system-border pb-2">
                    <h3 className="text-system-blue font-bold uppercase tracking-widest text-sm text-glow">
                        {title}
                    </h3>
                </div>
            )}

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
}
