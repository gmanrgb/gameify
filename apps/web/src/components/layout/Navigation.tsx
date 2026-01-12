type Page = 'today' | 'goals' | 'review' | 'settings';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; icon: string; label: string }[] = [
  { page: 'today', icon: '📅', label: 'Today' },
  { page: 'goals', icon: '🎯', label: 'Goals' },
  { page: 'review', icon: '📊', label: 'Review' },
  { page: 'settings', icon: '⚙️', label: 'Settings' },
];

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary/95 backdrop-blur-lg border-t border-white/5 z-40">
      <div className="container mx-auto max-w-4xl">
        <ul className="flex justify-around items-center py-2">
          {navItems.map(({ page, icon, label }) => (
            <li key={page}>
              <button
                onClick={() => onNavigate(page)}
                className={`
                  flex flex-col items-center gap-1 px-4 py-2 rounded-lg
                  transition-all duration-200
                  ${currentPage === page
                    ? 'text-text-primary bg-white/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }
                `}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-medium">{label}</span>
                {currentPage === page && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
