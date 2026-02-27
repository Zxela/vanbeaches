import { BookOpen } from 'lucide-react';
import { Icon } from './ui';

export function BeachGuidePromo() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ocean-600 via-ocean-500 to-shore-500 p-8 md:p-10">
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Icon icon={BookOpen} size="xl" className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Your guide to Vancouver's best beaches</h3>
            <p className="text-white/70 mt-1 text-sm">
              Tips, hidden spots, and seasonal highlights from locals who know the coast.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors border border-white/20 whitespace-nowrap cursor-default"
        >
          Coming Soon
        </button>
      </div>
    </div>
  );
}
