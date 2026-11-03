import { Boxes, CalendarCheck2, Hotel, Layers3, Plane, TicketCheck, UsersRound, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';

const destinations = [
  { label: 'Inventory', to: '/admin/inventory/flights', icon: Layers3 },
  { label: 'Flights', to: '/admin/inventory/flights', icon: Plane },
  { label: 'Hotels', to: '/admin/inventory/hotels', icon: Hotel },
  { label: 'Visa Catalogue', to: '/admin/inventory/visa', icon: TicketCheck },
  { label: 'Bookings', to: '/admin/bookings', icon: CalendarCheck2 },
  { label: 'Finance', to: '/admin/finance', icon: WalletCards },
  { label: 'Customers & Staff', to: '/admin/customers', icon: UsersRound },
  { label: 'Custom Package', to: '/admin/packages/custom', icon: Boxes },
];

export default function QuickAccess() {
  return (
    <nav className="dashboard-quick" aria-label="Quick destinations">
      <span className="dashboard-quick-label">Quick access</span>
      {destinations.map((item) => (
        <Link key={item.label} className="dashboard-quick-link" to={item.to}>
          <item.icon size={14} aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
