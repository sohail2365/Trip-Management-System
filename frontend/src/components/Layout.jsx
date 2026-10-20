import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/trips', label: 'Trips', icon: '🚌' },
  { to: '/receipts', label: 'Receipts', icon: '🧾' },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/vehicles', label: 'Vehicles', icon: '🚐' },
  { to: '/drivers', label: 'Drivers', icon: '🧑' },
  { to: '/conductors', label: 'Conductors', icon: '🎫' },
  { to: '/staff-payments', label: 'Staff Payments', icon: '💰' },
  { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/fuel', label: 'Fuel Rate', icon: '⛽' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-sidebar flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-text-active">TMS</h1>
          <p className="text-xs text-sidebar-text mt-1 opacity-70">
            Transport Management
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
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

      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}