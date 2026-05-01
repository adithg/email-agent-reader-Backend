import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { motion } from 'motion/react';
import { GrainOverlay } from '../landing/GrainOverlay';

const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/submit': 'Submit Request',
  '/queue': 'Approval Queue',
  '/asset-upload': 'Asset Upload',
  '/my-requests': 'My Requests',
  '/rooms': 'Room Availability',
  '/activity': 'Activity Log',
  '/analytics': 'Analytics',
};

export function AppLayout() {
  const location = useLocation();
  const title = pageTitleMap[location.pathname] || 'Auto-Review Agent';
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#fcf7ff] text-candy-ink">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffbff_0%,#f8f5ff_34%,#f6fbff_68%,#fff8fb_100%)]" />
      <div className="candy-orb left-[-10rem] top-[-5rem] h-[24rem] w-[24rem] bg-[#ffc6e9]/70 animate-candy-shimmer" />
      <div className="candy-orb right-[-8rem] top-[8rem] h-[22rem] w-[22rem] bg-[#d1f2ff]/78 animate-candy-float" />
      <div className="candy-orb bottom-[4rem] left-[36%] h-[16rem] w-[16rem] bg-[#ebb1ff]/58 animate-candy-shimmer" />
      <GrainOverlay />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <main className="ml-[17.5rem] flex-1 px-4 py-4 md:px-6 md:py-6">
          <Header
            title={title}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
          <div className="mt-6 px-1 md:px-2">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet context={{ searchQuery }} />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
