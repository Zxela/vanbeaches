import { type VariantProps, cva } from 'class-variance-authority';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const iconVariants = cva('inline-flex shrink-0', {
  variants: {
    size: {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8',
      '2xl': 'w-10 h-10',
    },
    color: {
      default: 'text-current',
      muted: 'text-sand-500 dark:text-sand-400',
      ocean: 'text-ocean-600 dark:text-ocean-400',
      shore: 'text-shore-600 dark:text-shore-400',
      sky: 'text-sky-600 dark:text-sky-400',
      success: 'text-emerald-600 dark:text-emerald-400',
      warning: 'text-amber-600 dark:text-amber-400',
      danger: 'text-red-600 dark:text-red-400',
      'tide-high': 'text-tide-high',
      'tide-low': 'text-tide-low',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'default',
  },
});

export interface IconProps
  extends Omit<LucideProps, 'size' | 'color'>,
    VariantProps<typeof iconVariants> {
  /** The Lucide icon component to render */
  icon: LucideIcon;
  /** Optional label for accessibility */
  label?: string;
}

const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: LucideIcon, size, color, className, label, ...props }, ref) => {
    return (
      <LucideIcon
        ref={ref}
        className={cn(iconVariants({ size, color, className }))}
        aria-label={label}
        aria-hidden={!label}
        {...props}
      />
    );
  },
);
Icon.displayName = 'Icon';

export { Icon, iconVariants };

// Re-export commonly used icons for convenience
export {
  // Weather
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Thermometer,
  Droplets,
  Umbrella,
  // Tides & Water
  Waves,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  // Navigation
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Home,
  MapPin,
  // Actions
  Heart,
  Share2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  // Status
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  // Time
  Clock,
  Calendar,
  Sunrise,
  Sunset,
  // Misc
  Star,
  Eye,
  EyeOff,
  ExternalLink,
  Camera,
} from 'lucide-react';
