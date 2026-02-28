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
    <nav className="sticky top-0 z-10 bg-sand-50 border-b border-sand-200">
      <div className="flex">
        {tabs.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onTabChange(key)}
              className={
                isActive
                  ? 'flex-1 py-3 text-sm font-semibold text-coral-500 border-b-2 border-coral-500'
                  : 'flex-1 py-3 text-sm font-medium text-sand-600 border-b-2 border-transparent'
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
