export type BeachDetailTab = 'today' | 'about' | 'photos';

interface TabBarProps {
  activeTab: BeachDetailTab;
  onTabChange: (tab: BeachDetailTab) => void;
}

const tabs: { key: BeachDetailTab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'about', label: 'About' },
  { key: 'photos', label: 'Photos' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="sticky top-0 z-30 border-y border-white/15 bg-slate-900/20 px-3 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-3xl">
        {tabs.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onTabChange(key)}
              className={
                isActive
                  ? 'flex-1 py-3 text-sm font-semibold text-white border-b-2 border-white'
                  : 'flex-1 py-3 text-sm font-medium text-white/60 border-b-2 border-transparent hover:text-white'
              }
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
