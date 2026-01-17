import { type VariantProps, cva } from 'class-variance-authority';
import { motion } from 'framer-motion';
import type React from 'react';
import { type HTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

const skeletonVariants = cva('relative overflow-hidden rounded-md bg-sand-200 dark:bg-sand-700', {
  variants: {
    animation: {
      shimmer: 'shimmer',
      pulse: 'animate-pulse',
      none: '',
    },
  },
  defaultVariants: {
    animation: 'shimmer',
  },
});

export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, animation, width, height, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ animation, className }))}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    );
  },
);
Skeleton.displayName = 'Skeleton';

/** Text line skeleton with realistic width */
interface SkeletonTextProps extends Omit<SkeletonProps, 'height'> {
  /** Number of lines */
  lines?: number;
  /** Last line width percentage */
  lastLineWidth?: string;
}

const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 1, lastLineWidth = '70%', animation, ...props }, ref) => {
    const id = useId();
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={`${id}-line-${i}`}
            animation={animation}
            className="h-4"
            style={{
              width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%',
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    );
  },
);
SkeletonText.displayName = 'SkeletonText';

/** Circular skeleton for avatars/icons */
interface SkeletonCircleProps extends Omit<SkeletonProps, 'width' | 'height'> {
  /** Diameter of the circle */
  size?: number | string;
}

const SkeletonCircle = forwardRef<HTMLDivElement, SkeletonCircleProps>(
  ({ className, size = 40, animation, ...props }, ref) => {
    const dimension = typeof size === 'number' ? `${size}px` : size;
    return (
      <Skeleton
        ref={ref}
        animation={animation}
        className={cn('rounded-full', className)}
        style={{ width: dimension, height: dimension }}
        {...props}
      />
    );
  },
);
SkeletonCircle.displayName = 'SkeletonCircle';

/** Card skeleton with typical content layout */
interface SkeletonCardProps {
  className?: string;
  /** Show header section */
  showHeader?: boolean;
  /** Number of content lines */
  contentLines?: number;
  /** Show footer section */
  showFooter?: boolean;
}

const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, showHeader = true, contentLines = 3, showFooter = false }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-2xl border border-sand-200/50 dark:border-sand-700/50',
          'bg-white/90 dark:bg-sand-800/90 p-4 space-y-4',
          className,
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {showHeader && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <SkeletonCircle size={24} />
          </div>
        )}
        <SkeletonText lines={contentLines} />
        {showFooter && (
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        )}
      </motion.div>
    );
  },
);
SkeletonCard.displayName = 'SkeletonCard';

/** Staggered skeleton group for lists */
interface SkeletonGroupProps {
  className?: string;
  /** Number of skeleton items */
  count?: number;
  /** Stagger delay between items in ms */
  staggerDelay?: number;
  /** Custom skeleton content */
  children?: React.ReactNode;
}

const SkeletonGroup = forwardRef<HTMLDivElement, SkeletonGroupProps>(
  ({ className, count = 3, staggerDelay = 50, children }, ref) => {
    const id = useId();
    return (
      <motion.div
        ref={ref}
        className={cn('space-y-3', className)}
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: staggerDelay / 1000,
            },
          },
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={`${id}-item-${i}`}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            {children || <SkeletonCard showHeader contentLines={2} />}
          </motion.div>
        ))}
      </motion.div>
    );
  },
);
SkeletonGroup.displayName = 'SkeletonGroup';

export { Skeleton, SkeletonText, SkeletonCircle, SkeletonCard, SkeletonGroup, skeletonVariants };
