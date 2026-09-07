import { type VariantProps, cva } from 'class-variance-authority';
import { type HTMLMotionProps, motion } from 'framer-motion';
import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

const cardVariants = cva('rounded-2xl border transition-all duration-200', {
  variants: {
    variant: {
      default: ['bg-slate-800/90', 'border-slate-700/50', 'shadow-md', 'backdrop-blur-sm'],
      glass: ['bg-slate-900/80', 'border-slate-700/30', 'shadow-md', 'backdrop-blur-xl'],
      elevated: ['bg-slate-800', 'border-slate-700', 'shadow-md'],
      interactive: [
        'bg-slate-800/90',
        'border-slate-700/50',
        'shadow-md',
        'backdrop-blur-sm',
        'hover:shadow-md',
        'hover:-translate-y-0.5',
        'cursor-pointer',
      ],
      ocean: [
        'bg-gradient-to-br from-blue-50 to-sky-50',
        'from-slate-800 to-slate-800',
        'border-slate-700',
        'shadow-md',
      ],
      shore: [
        'bg-gradient-to-br from-blue-50 to-blue-50',
        'from-slate-800 to-slate-800',
        'border-slate-700',
        'shadow-md',
      ],
      sky: [
        'bg-gradient-to-br from-sky-50 to-blue-50',
        'from-slate-800 to-slate-800',
        'border-slate-700',
        'shadow-md',
      ],
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Enable framer-motion animations */
  animated?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, animated = false, children, ...props }, ref) => {
    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={cn(cardVariants({ variant, padding, className }))}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          {...(props as HTMLMotionProps<'div'>)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={cn(cardVariants({ variant, padding, className }))} {...props}>
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        'text-slate-100',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-slate-400', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center pt-4', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
