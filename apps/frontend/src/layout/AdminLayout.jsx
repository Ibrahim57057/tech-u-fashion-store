import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tag,
  ClipboardList,
  Undo2,
  Users,
  Truck,
  Mail,
  MailPlus,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { isAdmin } from "../features/admin/permissions.js";

const navItems = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Categories", to: "/admin/categories", icon: Tag },
  { label: "Orders", to: "/admin/orders", icon: ClipboardList },
  { label: "Returns", to: "/admin/returns", icon: Undo2 },
  { label: "Messages", to: "/admin/messages", icon: Mail },
  { label: "Subscribers", to: "/admin/subscribers", icon: MailPlus },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Delivery zones", to: "/admin/delivery-zones", icon: Truck },
];
export default function AdminLayout() {
  const { user } = useAuth();
  const fullAdmin = isAdmin(user);

  const visibleNavItems = fullAdmin
    ? navItems
    : navItems.filter((item) =>
        ["Dashboard", "Orders", "Returns"].includes(item.label),
      );

  return (
    <div className='flex min-h-screen flex-col md:flex-row'>
      {/* Below md the sidebar is hidden and there was no replacement, so
          every admin page on a phone was a dead end — you could see one
          screen and reach nothing else. A scrollable strip of the same
          links keeps the panel usable without a drawer's worth of state. */}
      <div className='md:hidden sticky top-0 z-30 bg-brand-dark px-4 pt-4'>
        <h2 className='font-display font-bold text-lg mb-3'>TECH-U Admin</h2>
        <nav className='flex gap-1 overflow-x-auto pb-3 -mx-4 px-4'>
          {visibleNavItems.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-card text-sm whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-brand-accent text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`
              }>
              <Icon className='w-4 h-4' />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <aside className='w-56 shrink-0 bg-brand-dark text-white p-4 hidden md:block'>
        <h2 className='font-display font-bold text-lg mb-6 px-2'>
          TECH-U Admin
        </h2>
        <nav className='space-y-1'>
          {visibleNavItems.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-card text-sm ${
                  isActive
                    ? "bg-brand-accent text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`
              }>
              <Icon className='w-4 h-4' />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* p-4 sm:p-6: 24px of padding each side was a fifth of a phone's
          usable width. overflow-x-auto still contains anything a table
          needs to scroll. */}
      <main className='flex-1 bg-neutral-50 p-4 sm:p-6 overflow-x-auto'>
        {/* Each admin page renders here, depending on the URL. */}
        <Outlet />
      </main>
    </div>
  );
}