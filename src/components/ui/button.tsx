import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

// Utility for class merging if not already present, I'll create it next
// actually I should create utils/cn.ts first or inline it. 
// I'll assume I'll create utils/cn.ts.

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-500/30 active:scale-95 transition-all duration-200",
                destructive:
                    "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20 active:scale-95 transition-all duration-200",
                outline:
                    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-sm active:scale-95 transition-all duration-200",
                secondary:
                    "bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-95 transition-all duration-200",
                ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors",
                link: "text-teal-600 underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
