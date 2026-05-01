import { Search, Bell, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export function Header({ title, searchQuery, onSearchQueryChange }: HeaderProps) {
  return (
    <header className="candy-glass sticky top-4 z-20 flex h-16 items-center justify-between rounded-[24px] px-6">
      <h2 className="text-xl font-bold text-[#453857]">{title}</h2>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c6d91]" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="app-input w-64 rounded-full px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#8d69b3]/30"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="relative rounded-xl border border-white/50 bg-white/35 p-2 text-[#6f6281] transition-colors hover:bg-white/55 hover:text-[#453857]">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#d9485f]"></span>
          </button>

          <button className="rounded-xl border border-white/55 bg-white/35 p-1 pl-2 transition-colors hover:bg-white/58">
            <div className="candy-glass-soft flex h-8 w-8 items-center justify-center rounded-full text-[#8d69b3]">
              <User className="h-5 w-5" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
