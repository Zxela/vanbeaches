import { type VariantProps, cva } from 'class-variance-authority';
import { type HTMLMotionProps, motion } from 'framer-motion';
import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

const cardVariants = cva('rounded-2xl border transition-all duration-200', {
  variants: {
    variant: {
      default: [
        'bg-white/90 dark:bg-sand-800/90',
        'border-sand-200/50 dark:border-sand-700/50',
        'shadow-card dark:shadow-card-dark',
        'backdrop-blur-sm',
      ],
      glass: [
        'bg-white/80 dark:bg-sand-900/80',
        'border-white/30 dark:border-sand-700/30',
        'shadow-lg',
        'backdrop-blur-xl',
      ],
      elevated: [
        'bg-white dark:bg-sand-800',
        'border-sand-100 dark:border-sand-700',
        'shadow-xl dark:shadow-card-dark',
      ],
      interactive: [
        'bg-white/90 dark:bg-sand-800/90',
        'border-sand-200/50 dark:border-sand-700/50',
        'shadow-card dark:shadow-card-dark',
        'backdrop-blur-sm',
        'hover:shadow-card-hover dark:hover:shadow-ocean-md',
        'hover:-translate-y-0.5',
        'cursor-pointer',
      ],
      ocean: [
        'bg-gradient-to-br from-ocean-50 to-sky-50',
        'dark:from-sand-800 dark:to-sand-800',
        'border-ocean-100 dark:border-sand-700',
        'shadow-ocean-sm dark:shadow-card-dark',
      ],
      shore: [
        'bg-gradient-to-br from-shore-50 to-ocean-50',
        'dark:from-sand-800 dark:to-sand-800',
        'border-shore-100 dark:border-sand-700',
        'shadow-shore-sm dark:shadow-card-dark',
      ],
      sky: [
        'bg-gradient-to-br from-sky-50 to-ocean-50',
        'dark:from-sand-800 dark:to-sand-800',
        'border-sky-100 dark:border-sand-700',
        'shadow-ocean-sm dark:shadow-card-dark',
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
        'text-sand-900 dark:text-sand-100',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-sand-500 dark:text-sand-400', className)} {...props} />
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
