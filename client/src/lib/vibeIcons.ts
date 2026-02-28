import {
  Activity,
  Building2,
  Dog,
  MessageCircle,
  Moon,
  Sunset,
  TreePine,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BeachVibe } from '../data/beach-personalities';

export const VIBE_ICONS: Record<BeachVibe, LucideIcon> = {
  active: Activity,
  quiet: Moon,
  family: Users,
  'dog-friendly': Dog,
  sunset: Sunset,
  social: MessageCircle,
  nature: TreePine,
  urban: Building2,
};
