import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/trips', label: 'Trips', icon: '🚌' },
  { to: '/receipts', label: 'Receipts', icon: '🧾' },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/vehicles', label: 'Vehicles', icon: '🚐' },
  { to: '/drivers', label: 'Drivers', icon: '🧑‍✈️' },
  { to: '/conductors', label: 'Conductors', icon: '🎫' },
  { to: '/staff-payments', label: 'Staff Payments', icon: '💰' },
  { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/fuel', label: 'Fuel Rate', icon: '⛽' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Jab bhi route change ho, mobile menu band ho jaye
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-surface-bg">
      {/* Mobile Overlay (Peeche ka dhundla background) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-sidebar-border flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-sidebar-text-active">TMS</h1>
            <p className="text-xs text-sidebar-text mt-1 opacity-70">Transport Management</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-sidebar-text hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-sidebar-hover text-sidebar-text-active font-medium'
                    : 'text-sidebar-text hover:bg-sidebar-hover/60 hover:text-sidebar-text-active'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 text-xs text-sidebar-text opacity-60 border-t border-sidebar-border">
          v1.0 • © TMS
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (Sirf mobile par dikhega) */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-surface border-b border-surface-border sticky top-0 z-30">
          <h1 className="text-xl font-bold text-content">TMS</h1>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-content-muted hover:text-content rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}