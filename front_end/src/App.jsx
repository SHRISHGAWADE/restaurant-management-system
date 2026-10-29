import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const navigation = [
  { label: 'Dashboard', icon: '◫', section: 'main' },
  { label: 'Customers', icon: '♙', section: 'main' },
  { label: 'Reservations', icon: '▦', section: 'main' },
  { label: 'Tables', icon: '▤', section: 'manage' },
  { label: 'Menu', icon: '◉', section: 'manage' },
  { label: 'Staff', icon: '♧', section: 'manage' },
  { label: 'Orders', icon: '▣', section: 'manage' },
  { label: 'Payments', icon: '＄', section: 'insights' },
  { label: 'Reports', icon: '▥', section: 'insights' },
];

const titles = {
  Dashboard: ['Good morning', 'Here’s what’s happening at your restaurant today.'],
  Customers: ['Customers', 'Keep your guest details up to date.'],
  Reservations: ['Reservations', 'Plan the room and make every guest feel expected.'],
  Tables: ['Tables', 'Keep the dining room ready for the next service.'],
  Menu: ['Menu', 'Manage the dishes and prices your guests love.'],
  Staff: ['Staff', 'Your team, all in one place.'],
  Orders: ['Orders', 'Follow each order from the table to the kitchen.'],
  Payments: ['Billing & payments', 'Review bills and keep payment records in step.'],
  Reports: ['Reports', 'A clearer view of how the restaurant is doing.'],
};

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

function formatCompactMoney(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [openPopover, setOpenPopover] = useState('');
  const [quickAction, setQuickAction] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = 'success') => {
    setToast({ message, tone, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const navigate = (event) => {
      const destination = typeof event.detail === 'string' ? { page: event.detail } : event.detail;
      if (!destination?.page || !titles[destination.page]) return;
      setActivePage(destination.page);
      setQuickAction(destination.action ? destination : null);
    };
    window.addEventListener('navigate-app', navigate);
    return () => window.removeEventListener('navigate-app', navigate);
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkApi = async () => {
      try {
        await api.get('/api/health');
        if (mounted) setApiStatus('connected');
      } catch {
        if (mounted) setApiStatus('disconnected');
      }
    };
    checkApi();
    const timer = window.setInterval(checkApi, 30000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  const [title, subtitle] = titles[activePage];

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>H</span></div>
          <div className="brand-copy"><strong>hearth</strong><small>RESTAURANT OS</small></div>
          <button className="icon-button sidebar-collapse" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{sidebarCollapsed ? '›' : '‹'}</button>
          <button className="icon-button sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">×</button>
        </div>
        <div className="restaurant-switcher">
          <div className="restaurant-avatar">M</div>
          <div className="restaurant-info"><strong>Maison Rose</strong><span>Downtown · Main floor</span></div>
          <span className="switcher-chevron">⌄</span>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {['main', 'manage', 'insights'].map((section, index) => (
            <div className="nav-group" key={section}>
              <span className="nav-caption">{['WORKSPACE', 'MANAGE', 'INSIGHTS'][index]}</span>
              {navigation.filter((item) => item.section === section).map((item) => (
                <button
                  key={item.label}
                  className={`nav-item ${activePage === item.label ? 'active' : ''}`}
                  aria-current={activePage === item.label ? 'page' : undefined}
                  onClick={() => { setActivePage(item.label); setMobileNavOpen(false); }}
                >
                  <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
                  {item.label === 'Reservations' && <span className="nav-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card"><div className="support-symbol">✳</div><strong>Need a hand?</strong><p>Our team is here to help you run a smoother service.</p><button onClick={() => notify('Support resources are coming soon.', 'info')}>Visit help centre <span>↗</span></button></div>
          <div className="profile-row"><div className="profile-avatar">M</div><div className="profile-copy"><strong>Manager workspace</strong><span>Local demo profile</span></div><button className="more-button" onClick={() => setOpenPopover(openPopover === 'profile' ? '' : 'profile')} aria-label="Manager workspace options" aria-expanded={openPopover === 'profile'}>···</button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">☰</button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-separator">/</span><strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <div className={`service-status api-${apiStatus}`} role="status" aria-live="polite"><span className="status-pulse" />{apiStatus === 'checking' ? 'Checking connection' : apiStatus === 'connected' ? 'API connected' : 'API unavailable'}</div>
            <div className="header-popover-wrap"><button className="notification-button" onClick={() => setOpenPopover(openPopover === 'notifications' ? '' : 'notifications')} aria-label="Notifications" aria-expanded={openPopover === 'notifications'}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></button>{openPopover === 'notifications' && <div className="header-popover"><strong>Service notifications</strong><p>There is no notification feed configured yet. Reservation and order updates remain available in their workspace pages.</p><button onClick={() => { setActivePage('Reservations'); setOpenPopover(''); }}>Open reservations <span>↗</span></button></div>}</div>
            <div className="header-popover-wrap"><button className="top-avatar avatar-button" onClick={() => setOpenPopover(openPopover === 'profile' ? '' : 'profile')} aria-label="Open manager workspace menu" aria-expanded={openPopover === 'profile'}>M</button>{openPopover === 'profile' && <div className="header-popover profile-popover"><strong>Manager workspace</strong><p>Local demo profile · sign-in is not configured.</p><button onClick={() => { setActivePage('Staff'); setOpenPopover(''); }}>Team management <span>↗</span></button><button onClick={() => { setActivePage('Reports'); setOpenPopover(''); }}>Restaurant reports <span>↗</span></button></div>}</div>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div><p className="eyebrow">{activePage === 'Dashboard' ? new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase() : 'MAISON ROSE · DOWNTOWN'}</p><h1>{title}{activePage === 'Dashboard' && <span className="heading-period">.</span>}</h1><p className="page-subtitle">{subtitle}</p></div>
            {activePage === 'Dashboard' && <div className="heading-date"><span className="date-icon">▦</span><span>Today</span><span className="date-divider" /><strong>{new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</strong><span>⌄</span></div>}
          </div>
          <div key={activePage} className="page-transition">
            {activePage === 'Dashboard' && <Dashboard />}
            {activePage === 'Customers' && <Customers notify={notify} quickAction={quickAction?.page === 'Customers' ? quickAction.action : ''} onQuickActionHandled={() => setQuickAction(null)} />}
            {activePage === 'Reservations' && <Reservations notify={notify} quickAction={quickAction?.page === 'Reservations' ? quickAction.action : ''} onQuickActionHandled={() => setQuickAction(null)} />}
            {activePage === 'Tables' && <TablesPage notify={notify} />}
            {activePage === 'Menu' && <MenuPage notify={notify} />}
            {activePage === 'Staff' && <StaffPage notify={notify} />}
            {activePage === 'Orders' && <OrdersPage notify={notify} quickAction={quickAction?.page === 'Orders' ? quickAction.action : ''} onQuickActionHandled={() => setQuickAction(null)} />}
            {activePage === 'Payments' && <PaymentsPage notify={notify} />}
            {activePage === 'Reports' && <ReportsPage />}
          </div>
          <footer className="page-footer"><span>© 2026 Hearth Restaurant OS</span><span>Made for a more thoughtful service <span className="footer-heart">♥</span></span></footer>
        </div>
      </main>
      {toast && <div key={toast.key} className={`toast toast-${toast.tone}`} role="status"><span>{toast.tone === 'success' ? '✓' : '!'}</span>{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss message">×</button></div>}
    </div>
  );
}

function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadOverview = useCallback(async () => {
    setLoading(true); setError('');
    const now = new Date();
    const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const today = localDate(now);
    const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    try {
      const results = await Promise.allSettled([
        api.get('/api/reports/overview'),
        api.get(`/api/reports/revenue?from=${localDate(fromDate)}&to=${today}`),
        api.get(`/api/reports/reservations?from=${today}`),
      ]);
      if (results[0].status === 'fulfilled') setOverview(results[0].value);
      else throw results[0].reason;
      setRevenue(results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : []);
      setReservations(results[2].status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : []);
    }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const revenueDays = useMemo(() => {
    const now = new Date();
    const byDate = new Map(revenue.map((row) => [String(row.revenue_date).slice(0, 10), row]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { key, label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date), ...(byDate.get(key) || {}) };
    });
  }, [revenue]);
  const maxRevenue = Math.max(...revenueDays.map((row) => Number(row.total_revenue || 0)), 0);
  const revenueScale = maxRevenue || 1;
  const todayKey = (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })();
  const upcomingReservations = reservations
    .filter((row) => row.status === 'confirmed' || row.status === 'pending')
    .filter((row) => String(row.reservation_date).slice(0, 10) > todayKey || (String(row.reservation_date).slice(0, 10) === todayKey && String(row.reservation_time).slice(0, 5) >= new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())))
    .sort((a, b) => `${a.reservation_date} ${a.reservation_time}`.localeCompare(`${b.reservation_date} ${b.reservation_time}`))
    .slice(0, 4);

  const cards = [
    { label: 'Total customers', key: 'total_customers', icon: '♙', color: 'sage', hint: 'Guest profiles' },
    { label: 'Reservations', key: 'total_reservations', icon: '▦', color: 'peach', hint: 'All bookings' },
    { label: 'Total orders', key: 'total_orders', icon: '▣', color: 'lavender', hint: 'Orders placed' },
    { label: 'Available tables', key: 'available_tables', icon: '▤', color: 'blue', hint: 'Ready to seat' },
  ];

  return <div className="dashboard-content">
    <div className="metric-grid">
      {cards.map((card) => <div className="metric-card" key={card.key}><div className="metric-top"><span className={`metric-icon ${card.color}`}>{card.icon}</span></div><span className="metric-label">{card.label}</span><div className="metric-value">{loading ? <span className="skeleton skeleton-number" /> : overview ? Number(overview[card.key] || 0).toLocaleString('en-IN') : '—'}</div><span className="metric-hint">{card.hint}</span></div>)}
    </div>
    <div className="dashboard-lower">
      <section className="panel revenue-panel"><div className="panel-heading"><div><span className="section-kicker">PAID PAYMENTS · LAST 7 DAYS</span><h2>Revenue overview</h2></div><button className="select-button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-app', { detail: 'Reports' }))}>Full reports <span>↗</span></button></div><div className="revenue-body"><div className="revenue-summary"><span className="muted-label">Successful payment revenue · all time</span><strong>{loading ? <span className="skeleton skeleton-revenue" /> : overview ? formatMoney(overview.successful_payment_revenue) : '—'}</strong><span className="revenue-note"><span className="revenue-check">✓</span> Recorded paid payments</span></div><div className="live-chart-plot"><div className="live-chart-axis" aria-hidden="true"><span>{formatCompactMoney(maxRevenue)}</span><span>{formatCompactMoney(maxRevenue / 2)}</span><span>₹0</span></div><div className="live-revenue-chart" role="img" aria-label="Paid revenue over the last seven days">{revenueDays.map((day) => { const amount = Number(day.total_revenue || 0); return <div className="live-revenue-day" key={day.key} title={`${formatDate(day.key)}: ${formatMoney(amount)} · ${day.successful_payment_count || 0} paid payments`}><div className="live-revenue-track"><i style={{ height: `${amount > 0 ? Math.max(4, amount / revenueScale * 100) : 0}%` }} /></div><strong>{day.label}</strong><small>{formatDate(day.key).replace(/\s\d{4}$/, '')}</small></div>; })}</div></div>{error && <div className="inline-error"><span>{error}</span><button className="text-button" onClick={loadOverview}>Retry</button></div>}</div></section>
      <section className="panel service-panel"><div className="panel-heading"><div><span className="section-kicker">UPCOMING SERVICE</span><h2>Reservations ahead</h2></div><button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-app', { detail: 'Reservations' }))}>View all ↗</button></div>{loading ? <LoadingRows /> : upcomingReservations.length ? <div className="upcoming-list">{upcomingReservations.map((reservation) => <div className="upcoming-reservation" key={reservation.reservation_id}><span className="upcoming-time">{String(reservation.reservation_time).slice(0, 5)}</span><span className="upcoming-guest"><strong>{reservation.customer_name}</strong><small>{formatDate(reservation.reservation_date)} · Table {reservation.table_number} · {reservation.party_size} guests</small></span><StatusBadge status={reservation.status} /></div>)}</div> : <EmptyState icon="▦" title="No upcoming bookings" description="Confirmed and pending reservations will appear here." action={<button className="secondary-button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-app', { detail: 'Reservations' }))}>Open reservations</button>} />}{error && <div className="inline-error"><span>{error}</span><button className="text-button" onClick={loadOverview}>Retry</button></div>}</section>
    </div>
    <section className="panel activity-panel"><div className="panel-heading"><div><span className="section-kicker">QUICK ACCESS</span><h2>Make a little room for hospitality</h2></div><span className="activity-caption">Jump into your daily workflow</span></div><div className="quick-links"><button onClick={() => window.dispatchEvent(new CustomEvent('navigate-app', { detail: { page: 'Customers', action: 'create' } }))}><span className="quick-icon sage">♙</span><span><strong>Add a customer</strong><small>Open a new guest form</small></span><b>↗</b></button><button onClick={() => window.dispatchEvent(new CustomEvent('navigate-app', { detail: { page: 'Reservations', action: 'create' } }))}><span className="quick-icon peach">▦</span><span><strong>New reservation</strong><small>Plan an upcoming visit</small></span><b>↗</b></button><button onClick={() => window.dispatchEvent(new CustomEvent('navigate-app', { detail: { page: 'Orders', action: 'create' } }))}><span className="quick-icon lavender">▣</span><span><strong>Start an order</strong><small>Open a new order form</small></span><b>↗</b></button></div></section>
  </div>;
}

function Customers({ notify, quickAction, onQuickActionHandled }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const loadCustomers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get('/api/customers');
      if (!Array.isArray(data)) throw new Error('The customer list response was not in the expected format.');
      setCustomers(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => {
    if (quickAction === 'create') {
      setModal({ mode: 'create' });
      onQuickActionHandled();
    }
  }, [quickAction, onQuickActionHandled]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => [customer.customer_name, customer.email, customer.phone_number, customer.address].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [customers, search]);

  async function saveCustomer(values) {
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const result = await api.put(`/api/customers/${modal.customer.customer_id}`, values);
        notify(result.message || 'Customer updated successfully.');
      } else {
        const result = await api.post('/api/customers', values);
        notify(result.message || 'Customer added successfully.');
      }
      setModal(null); await loadCustomers();
    } catch (err) { notify(err.message, 'error'); }
    finally { setSaving(false); }
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`Delete ${customer.customer_name}? This cannot be undone.`)) return;
    try {
      const result = await api.delete(`/api/customers/${customer.customer_id}`);
      notify(result.message || 'Customer deleted successfully.'); await loadCustomers();
    } catch (err) { notify(err.message, 'error'); }
  }

  return <div className="section-content">
    <section className="panel list-panel">
      <div className="list-toolbar"><div><span className="section-kicker">GUEST DIRECTORY</span><h2>All customers <span className="count-badge">{loading ? '…' : customers.length}</span></h2><p className="panel-description">A little detail goes a long way.</p></div><button className="primary-button" onClick={() => setModal({ mode: 'create' })}><span>＋</span> Add customer</button></div>
      <div className="table-tools"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" aria-label="Search customers" />{search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}</label><button className="filter-button" onClick={loadCustomers}><span>↻</span> Refresh</button></div>
      {error && <ErrorState message={error} onRetry={loadCustomers} />}
      {!error && loading && <LoadingRows />}
      {!error && !loading && filtered.length === 0 && <EmptyState icon="♙" title={search ? 'No matching guests' : 'Your guest book is ready'} description={search ? 'Try another name, email or phone number.' : 'Add your first customer to start building a thoughtful guest experience.'} action={!search && <button className="secondary-button" onClick={() => setModal({ mode: 'create' })}>Add a customer</button>} />}
      {!error && !loading && filtered.length > 0 && <div className="responsive-table"><table><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>LOCATION</th><th>PARTY SIZE</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.customer_id}><td><div className="person-cell"><span className="person-avatar">{initials(customer.customer_name)}</span><span><strong>{customer.customer_name}</strong><small>Guest #{customer.customer_id}</small></span></div></td><td><div className="contact-cell"><span>{customer.email || 'No email added'}</span><small>{customer.phone_number || 'No phone added'}</small></div></td><td>{customer.address || <span className="muted">Not provided</span>}</td><td>{customer.family_size ? <span className="party-pill">♙ {customer.family_size}</span> : <span className="muted">—</span>}</td><td><div className="row-actions"><button className="row-action" onClick={() => setModal({ mode: 'edit', customer })}>Edit</button><button className="row-action danger-text" onClick={() => deleteCustomer(customer)}>Delete</button></div></td></tr>)}</tbody></table></div>}
      {!error && !loading && filtered.length > 0 && <div className="table-footnote">Showing <strong>{filtered.length}</strong> of <strong>{customers.length}</strong> customers</div>}
    </section>
    {modal && <CustomerModal customer={modal.customer} mode={modal.mode} saving={saving} onClose={() => setModal(null)} onSave={saveCustomer} />}
  </div>;
}

function CustomerModal({ customer, mode, saving, onClose, onSave }) {
  const [form, setForm] = useState({ customer_name: customer?.customer_name || '', email: customer?.email || '', phone_number: customer?.phone_number || '', address: customer?.address || '', family_size: customer?.family_size || '' });
  const [error, setError] = useState('');
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function submit(event) {
    event.preventDefault(); setError('');
    if (!form.customer_name.trim()) return setError('Please enter the customer’s name.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Please enter a valid email address.');
    if (form.family_size && (!/^\d+$/.test(form.family_size) || Number(form.family_size) < 1 || Number(form.family_size) > 32767)) return setError('Family size must be a whole number from 1 to 32767.');
    onSave({ customer_name: form.customer_name.trim(), email: form.email.trim() || null, phone_number: form.phone_number.trim() || null, address: form.address.trim() || null, family_size: form.family_size ? Number(form.family_size) : null });
  }
  return <Modal title={mode === 'edit' ? 'Edit customer' : 'Add a customer'} description={mode === 'edit' ? 'Update this guest’s details.' : 'Add someone new to your guest book.'} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <Field label="Full name" required><input autoFocus value={form.customer_name} onChange={(event) => update('customer_name', event.target.value)} placeholder="e.g. Priya Sharma" maxLength={100} /></Field>
      <div className="form-grid"><Field label="Email address"><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="guest@email.com" maxLength={255} /></Field><Field label="Phone number"><input type="tel" value={form.phone_number} onChange={(event) => update('phone_number', event.target.value)} placeholder="+91 98765 43210" maxLength={20} /></Field></div>
      <div className="form-grid"><Field label="City or address"><input value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Mumbai" /></Field><Field label="Family size"><input type="number" min="1" max="32767" step="1" value={form.family_size} onChange={(event) => update('family_size', event.target.value)} placeholder="Optional" /></Field></div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add customer'}</button></div>
    </form>
  </Modal>;
}

function Reservations({ notify, quickAction, onQuickActionHandled }) {
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [reservationData, customerData, tableData] = await Promise.all([
        api.get('/api/reservations'), api.get('/api/customers'), api.get('/api/tables'),
      ]);
      if (!Array.isArray(reservationData) || !Array.isArray(customerData) || !Array.isArray(tableData)) throw new Error('The server returned reservation data in an unexpected format.');
      setReservations(reservationData); setCustomers(customerData); setTables(tableData); setLookupError('');
    } catch (err) {
      setError(err.message);
      try {
        const [customerData, tableData] = await Promise.all([api.get('/api/customers'), api.get('/api/tables')]);
        setCustomers(Array.isArray(customerData) ? customerData : []); setTables(Array.isArray(tableData) ? tableData : []); setLookupError('');
      } catch (lookupErr) { setLookupError(lookupErr.message); }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPage(); }, [loadPage]);
  useEffect(() => {
    if (quickAction === 'create') {
      setModal({ mode: 'create' });
      onQuickActionHandled();
    }
  }, [quickAction, onQuickActionHandled]);

  const filtered = useMemo(() => reservations.filter((reservation) => {
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [reservation.customer_name, reservation.reservation_id, reservation.table_number].some((value) => String(value || '').toLowerCase().includes(query));
    return matchesStatus && matchesQuery;
  }), [reservations, search, statusFilter]);

  async function saveReservation(values) {
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const result = await api.put(`/api/reservations/${modal.reservation.reservation_id}`, values);
        notify(result.message || 'Reservation updated successfully.');
      } else {
        const result = await api.post('/api/reservations', values);
        notify(result.message || 'Reservation created successfully.');
      }
      setModal(null); await loadPage();
    } catch (err) { notify(err.message, 'error'); }
    finally { setSaving(false); }
  }

  async function cancelReservation(reservation) {
    if (!window.confirm(`Cancel the reservation for ${reservation.customer_name}?`)) return;
    try {
      const result = await api.delete(`/api/reservations/${reservation.reservation_id}`);
      notify(result.message || 'Reservation cancelled.'); await loadPage();
    } catch (err) { notify(err.message, 'error'); }
  }

  return <div className="section-content">
    <div className="reservation-summary"><div className="mini-stat"><span className="mini-stat-icon peach">▦</span><span><small>Reservations</small><strong>{loading ? '…' : reservations.length}</strong></span></div><div className="mini-stat"><span className="mini-stat-icon sage">✓</span><span><small>Confirmed</small><strong>{loading ? '…' : reservations.filter((item) => item.status === 'confirmed').length}</strong></span></div><div className="mini-stat"><span className="mini-stat-icon lavender">◷</span><span><small>Pending</small><strong>{loading ? '…' : reservations.filter((item) => item.status === 'pending').length}</strong></span></div><button className="primary-button reservation-add" onClick={() => setModal({ mode: 'create' })}><span>＋</span> New reservation</button></div>
    <section className="panel list-panel"><div className="list-toolbar"><div><span className="section-kicker">THE BOOKING SHEET</span><h2>Reservations <span className="count-badge">{loading ? '…' : filtered.length}</span></h2><p className="panel-description">A seat saved is a welcome already started.</p></div></div>
      <div className="table-tools"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search guest or table" aria-label="Search reservations" />{search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}</label><label className="select-wrap"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><button className="filter-button" onClick={loadPage}><span>↻</span> Refresh</button></div>
      {lookupError && <div className="inline-error">Customer and table selections may be unavailable: {lookupError}</div>}
      {error && <ErrorState message={error} onRetry={loadPage} />}
      {!error && loading && <LoadingRows />}
      {!error && !loading && filtered.length === 0 && <EmptyState icon="▦" title={search || statusFilter !== 'all' ? 'No reservations found' : 'No reservations yet'} description={search || statusFilter !== 'all' ? 'Try changing your search or status filter.' : 'Create a reservation to start planning your floor.'} action={!search && statusFilter === 'all' && <button className="secondary-button" onClick={() => setModal({ mode: 'create' })}>Create reservation</button>} />}
      {!error && !loading && filtered.length > 0 && <div className="responsive-table"><table><thead><tr><th>GUEST</th><th>DATE & TIME</th><th>TABLE</th><th>PARTY</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((reservation) => <tr key={reservation.reservation_id}><td><div className="person-cell"><span className="person-avatar reservation-avatar">{initials(reservation.customer_name)}</span><span><strong>{reservation.customer_name}</strong><small>Booking #{reservation.reservation_id}</small></span></div></td><td><div className="contact-cell"><span>{formatDate(reservation.reservation_date)}</span><small>{String(reservation.reservation_time || '').slice(0, 5) || '—'}</small></div></td><td><span className="table-number">T{reservation.table_number}</span><small className="table-capacity"> · seats {reservation.table_capacity}</small></td><td><span className="party-pill">♙ {reservation.party_size}</span></td><td><StatusBadge status={reservation.status} /></td><td><div className="row-actions"><button className="row-action" onClick={() => setModal({ mode: 'view', reservation })}>View</button><button className="row-action" onClick={() => setModal({ mode: 'edit', reservation })}>Edit</button>{reservation.status !== 'cancelled' && <button className="row-action danger-text" onClick={() => cancelReservation(reservation)}>Cancel</button>}</div></td></tr>)}</tbody></table></div>}
    </section>
    {modal && <ReservationModal mode={modal.mode} reservation={modal.reservation} customers={customers} tables={tables} lookupError={lookupError} saving={saving} onClose={() => setModal(null)} onSave={saveReservation} />}
  </div>;
}

function ReservationModal({ mode, reservation, customers, tables, lookupError, saving, onClose, onSave }) {
  const [form, setForm] = useState({ customer_id: reservation?.customer_id || '', table_number: reservation?.table_number || '', reservation_date: String(reservation?.reservation_date || '').slice(0, 10), reservation_time: String(reservation?.reservation_time || '').slice(0, 5), party_size: reservation?.party_size || '', status: reservation?.status || 'confirmed' });
  const [error, setError] = useState('');
  const isView = mode === 'view';
  const chosenTable = tables.find((table) => String(table.table_number) === String(form.table_number));
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function submit(event) {
    event.preventDefault(); setError('');
    if (!form.customer_id || !form.table_number || !form.reservation_date || !form.reservation_time || !form.party_size) return setError('Please complete each required reservation field.');
    if (!/^\d+$/.test(String(form.party_size)) || Number(form.party_size) < 1 || Number(form.party_size) > 32767) return setError('Party size must be a positive whole number.');
    if (chosenTable && Number(form.party_size) > Number(chosenTable.capacity)) return setError(`This table seats up to ${chosenTable.capacity} guests.`);
    onSave({ customer_id: String(form.customer_id), table_number: Number(form.table_number), reservation_date: form.reservation_date, reservation_time: form.reservation_time, party_size: Number(form.party_size), status: form.status });
  }
  return <Modal title={mode === 'create' ? 'New reservation' : mode === 'edit' ? 'Edit reservation' : 'Reservation details'} description={isView ? 'A closer look at this booking.' : 'Set up a thoughtful welcome for your guests.'} onClose={onClose}>
    {isView ? <div className="reservation-detail"><div className="detail-status"><StatusBadge status={reservation.status} /><span>Booking #{reservation.reservation_id}</span></div><div className="detail-guest"><span className="person-avatar">{initials(reservation.customer_name)}</span><span><small>GUEST</small><strong>{reservation.customer_name}</strong></span></div><div className="detail-grid"><div><small>DATE</small><strong>{formatDate(reservation.reservation_date)}</strong></div><div><small>TIME</small><strong>{String(reservation.reservation_time || '').slice(0, 5)}</strong></div><div><small>TABLE</small><strong>Table {reservation.table_number}</strong></div><div><small>TABLE CAPACITY</small><strong>{reservation.table_capacity} seats</strong></div><div><small>PARTY SIZE</small><strong>{reservation.party_size} guests</strong></div></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button></div></div> : <form className="form-stack" onSubmit={submit}>
      {lookupError && <div className="form-error">Could not load customer/table choices: {lookupError}</div>}
      <Field label="Customer" required><select autoFocus value={form.customer_id} onChange={(event) => update('customer_id', event.target.value)}><option value="">Choose a guest</option>{customers.map((customer) => <option key={customer.customer_id} value={customer.customer_id}>{customer.customer_name}{customer.phone_number ? ` · ${customer.phone_number}` : ''}</option>)}</select></Field>
      <div className="form-grid"><Field label="Table" required><select value={form.table_number} onChange={(event) => update('table_number', event.target.value)}><option value="">Choose a table</option>{tables.map((table) => <option key={table.table_number} value={table.table_number}>{`Table ${table.table_number} · ${table.capacity} seats${table.status === 'maintenance' ? ' · maintenance' : ''}`}</option>)}</select></Field><Field label="Party size" required><input type="number" min="1" max={chosenTable?.capacity || 32767} step="1" value={form.party_size} onChange={(event) => update('party_size', event.target.value)} placeholder="Number of guests" /></Field></div>
      <div className="form-grid"><Field label="Date" required><input type="date" value={form.reservation_date} onChange={(event) => update('reservation_date', event.target.value)} /></Field><Field label="Time" required><input type="time" value={form.reservation_time} onChange={(event) => update('reservation_time', event.target.value)} /></Field></div>
      <Field label="Status"><select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field>
      {chosenTable && <div className={`capacity-note ${chosenTable.status === 'maintenance' ? 'capacity-warning' : ''}`}><span>{chosenTable.status === 'maintenance' ? '!' : '✳'}</span>{chosenTable.status === 'maintenance' ? 'This table is under maintenance and cannot be reserved.' : `This table seats ${chosenTable.capacity} guests.`}</div>}
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary-button" disabled={saving || customers.length === 0 || tables.length === 0}>{saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create reservation'}</button></div>
    </form>}
  </Modal>;
}

function Modal({ title, description, onClose, children }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-heading"><div><span className="section-kicker">MAISON ROSE</span><h2 id="modal-title">{title}</h2><p>{description}</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog">×</button></header>{children}</section></div>;
}

function Field({ label, required, children }) { return <label className="field"><span>{label}{required && <i> *</i>}</span>{children}</label>; }
function StatusBadge({ status }) { return <span className={`status-badge status-${status}`}><i />{status ? status[0].toUpperCase() + status.slice(1) : 'Unknown'}</span>; }
function ErrorState({ message, onRetry }) { return <div className="error-state"><span className="error-mark">!</span><div><strong>We couldn’t load this just now</strong><p>{message}</p></div><button className="secondary-button" onClick={onRetry}>Try again</button></div>; }
function EmptyState({ icon, title, description, action }) { return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>; }
function LoadingRows() { return <div className="loading-rows" aria-label="Loading"><span /><span /><span /><span /></div>; }
function TablesPage({ notify }) {
  const [tables, setTables] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('all'); const [editing, setEditing] = useState(null); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await api.get('/api/tables'); if (!Array.isArray(data)) throw new Error('The table list response was not in the expected format.'); setTables(data); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = tables.filter((table) => (statusFilter === 'all' || table.status === statusFilter) && String(table.table_number).includes(search.trim()));
  async function save(values) { setSaving(true); try { const result = await api.put(`/api/tables/${editing.table_number}`, values); notify(result.message || 'Table updated.'); setEditing(null); await load(); } catch (err) { notify(err.message, 'error'); } finally { setSaving(false); } }
  return <div className="section-content"><section className="panel list-panel"><div className="list-toolbar"><div><span className="section-kicker">DINING ROOM</span><h2>Restaurant tables <span className="count-badge">{loading ? '…' : tables.length}</span></h2><p className="panel-description">Update seating capacity and floor status.</p></div></div><div className="table-tools"><label className="search-box"><span>⌕</span><input aria-label="Search tables" placeholder="Search table number" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="select-wrap"><span className="sr-only">Filter table status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="available">Available</option><option value="occupied">Occupied</option><option value="maintenance">Maintenance</option></select></label><button className="filter-button" onClick={load}>↻ Refresh</button></div>{error && <ErrorState message={error} onRetry={load} />}{!error && loading && <LoadingRows />}{!error && !loading && filtered.length === 0 && <EmptyState icon="▤" title={tables.length ? 'No tables match' : 'No tables yet'} description={tables.length ? 'Try another number or status.' : 'Tables will appear here when they are added to the dining room.'} />}{!error && !loading && filtered.length > 0 && <div className="responsive-table"><table><thead><tr><th>TABLE</th><th>CAPACITY</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((table) => <tr key={table.table_number}><td><strong className="table-number">Table {table.table_number}</strong></td><td>{table.capacity} seats</td><td><StatusBadge status={table.status} /></td><td><div className="row-actions"><button className="row-action" onClick={() => setEditing(table)}>Edit table</button></div></td></tr>)}</tbody></table></div>}</section>{editing && <TableModal table={editing} saving={saving} onClose={() => setEditing(null)} onSave={save} />}</div>;
}

function TableModal({ table, saving, onClose, onSave }) {
  const [capacity, setCapacity] = useState(String(table.capacity)); const [status, setStatus] = useState(table.status); const [error, setError] = useState('');
  function submit(event) { event.preventDefault(); const value = Number(capacity); if (!Number.isInteger(value) || value < 1 || value > 32767) return setError('Capacity must be a whole number from 1 to 32767.'); if (!['available', 'occupied', 'maintenance'].includes(status)) return setError('Choose a valid table status.'); onSave({ capacity: value, status }); }
  return <Modal title={`Edit table ${table.table_number}`} description="Adjust seating and availability for this table." onClose={onClose}><form className="form-stack" onSubmit={submit}><Field label="Capacity (seats)" required><input autoFocus type="number" min="1" max="32767" step="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field><Field label="Status" required><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="available">Available</option><option value="occupied">Occupied</option><option value="maintenance">Maintenance</option></select></Field>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save table'}</button></div></form></Modal>;
}

function MenuPage({ notify }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [availability, setAvailability] = useState('all'); const [modal, setModal] = useState(null); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await api.get('/api/menu'); if (!Array.isArray(data)) throw new Error('The menu response was not in the expected format.'); setItems(data); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = items.filter((item) => (availability === 'all' || (availability === 'available') === item.is_available) && item.food_name.toLowerCase().includes(search.trim().toLowerCase()));
  async function save(values) { setSaving(true); try { const result = modal.mode === 'edit' ? await api.put(`/api/menu/${modal.item.menu_item_id}`, values) : await api.post('/api/menu', values); notify(result.message || 'Menu item saved.'); setModal(null); await load(); } catch (err) { notify(err.message, 'error'); } finally { setSaving(false); } }
  async function remove(item) { if (!window.confirm(`Delete “${item.food_name}” from the menu?`)) return; try { const result = await api.delete(`/api/menu/${item.menu_item_id}`); notify(result.message || 'Menu item deleted.'); await load(); } catch (err) { notify(err.message, 'error'); } }
  return <div className="section-content"><section className="panel list-panel"><div className="list-toolbar"><div><span className="section-kicker">KITCHEN & BAR</span><h2>Menu items <span className="count-badge">{loading ? '…' : items.length}</span></h2><p className="panel-description">Keep names, pricing and availability current.</p></div><button className="primary-button" onClick={() => setModal({ mode: 'create' })}><span>＋</span> Add item</button></div><div className="table-tools"><label className="search-box"><span>⌕</span><input aria-label="Search menu" placeholder="Search food items" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="select-wrap"><span className="sr-only">Filter availability</span><select value={availability} onChange={(e) => setAvailability(e.target.value)}><option value="all">All items</option><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label><button className="filter-button" onClick={load}>↻ Refresh</button></div>{error && <ErrorState message={error} onRetry={load} />}{!error && loading && <LoadingRows />}{!error && !loading && filtered.length === 0 && <EmptyState icon="◉" title={items.length ? 'No menu items match' : 'The menu is empty'} description={items.length ? 'Try a different search or availability filter.' : 'Add the first dish to your menu.'} action={!items.length && <button className="secondary-button" onClick={() => setModal({ mode: 'create' })}>Add menu item</button>} />}{!error && !loading && filtered.length > 0 && <div className="responsive-table"><table><thead><tr><th>FOOD ITEM</th><th>PRICE</th><th>AVAILABILITY</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.menu_item_id}><td><div className="person-cell"><span className="menu-item-avatar">◉</span><span><strong>{item.food_name}</strong><small>Item #{item.menu_item_id}</small></span></div></td><td className="money-cell">{formatMoney(item.current_price)}</td><td><span className={`status-badge ${item.is_available ? 'status-available' : 'status-unavailable'}`}><i />{item.is_available ? 'Available' : 'Unavailable'}</span></td><td><div className="row-actions"><button className="row-action" onClick={() => setModal({ mode: 'edit', item })}>Edit</button><button className="row-action danger-text" onClick={() => remove(item)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section>{modal && <MenuModal mode={modal.mode} item={modal.item} saving={saving} onClose={() => setModal(null)} onSave={save} />}</div>;
}

function MenuModal({ mode, item, saving, onClose, onSave }) {
  const [name, setName] = useState(item?.food_name || ''); const [price, setPrice] = useState(item?.current_price ?? ''); const [available, setAvailable] = useState(item?.is_available ?? true); const [error, setError] = useState('');
  function submit(event) { event.preventDefault(); const value = Number(price); if (!name.trim() || name.trim().length > 100) return setError('Food name is required and must be at most 100 characters.'); if (!Number.isFinite(value) || value < 0 || !/^\d+(\.\d{1,2})?$/.test(String(price))) return setError('Enter a non-negative price with up to two decimal places.'); onSave({ food_name: name.trim(), current_price: String(price), is_available: available }); }
  return <Modal title={mode === 'edit' ? 'Edit menu item' : 'Add menu item'} description="Keep menu details accurate for service." onClose={onClose}><form className="form-stack" onSubmit={submit}><Field label="Food name" required><input autoFocus maxLength="100" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paneer tikka" /></Field><Field label="Current price (₹)" required><input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></Field><label className="check-field"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /><span>Available to order</span></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add menu item'}</button></div></form></Modal>;
}

function StaffPage({ notify }) {
  const [staff, setStaff] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [activeFilter, setActiveFilter] = useState('all'); const [modal, setModal] = useState(null); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await api.get('/api/staff'); if (!Array.isArray(data)) throw new Error('The staff response was not in the expected format.'); setStaff(data); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = staff.filter((person) => (activeFilter === 'all' || String(person.is_active) === activeFilter) && `${person.staff_name} ${person.role}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function save(values) { setSaving(true); try { const result = modal.mode === 'edit' ? await api.put(`/api/staff/${modal.person.staff_id}`, values) : await api.post('/api/staff', values); notify(result.message || 'Staff record saved.'); setModal(null); await load(); } catch (err) { notify(err.message, 'error'); } finally { setSaving(false); } }
  async function remove(person) { if (!window.confirm(`Delete ${person.staff_name}? Staff linked to orders cannot be deleted.`)) return; try { const result = await api.delete(`/api/staff/${person.staff_id}`); notify(result.message || 'Staff member deleted.'); await load(); } catch (err) { notify(err.message, 'error'); } }
  return <div className="section-content"><section className="panel list-panel"><div className="list-toolbar"><div><span className="section-kicker">YOUR TEAM</span><h2>Staff members <span className="count-badge">{loading ? '…' : staff.length}</span></h2><p className="panel-description">Manage the people who make service happen.</p></div><button className="primary-button" onClick={() => setModal({ mode: 'create' })}><span>＋</span> Add staff</button></div><div className="table-tools"><label className="search-box"><span>⌕</span><input aria-label="Search staff" placeholder="Search name or role" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="select-wrap"><span className="sr-only">Filter staff status</span><select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}><option value="all">Everyone</option><option value="true">Active</option><option value="false">Inactive</option></select></label><button className="filter-button" onClick={load}>↻ Refresh</button></div>{error && <ErrorState message={error} onRetry={load} />}{!error && loading && <LoadingRows />}{!error && !loading && filtered.length === 0 && <EmptyState icon="♧" title={staff.length ? 'No staff match' : 'No staff records'} description={staff.length ? 'Try a different name, role or status.' : 'Add team members to keep your staff directory up to date.'} action={!staff.length && <button className="secondary-button" onClick={() => setModal({ mode: 'create' })}>Add staff</button>} />}{!error && !loading && filtered.length > 0 && <div className="responsive-table"><table><thead><tr><th>STAFF MEMBER</th><th>ROLE</th><th>DATE OF BIRTH</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((person) => <tr key={person.staff_id}><td><div className="person-cell"><span className="person-avatar staff-avatar">{initials(person.staff_name)}</span><span><strong>{person.staff_name}</strong><small>Staff #{person.staff_id}</small></span></div></td><td>{person.role}</td><td>{formatDate(person.date_of_birth)}</td><td><span className={`status-badge ${person.is_active ? 'status-available' : 'status-unavailable'}`}><i />{person.is_active ? 'Active' : 'Inactive'}</span></td><td><div className="row-actions"><button className="row-action" onClick={() => setModal({ mode: 'edit', person })}>Edit</button><button className="row-action danger-text" onClick={() => remove(person)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section>{modal && <StaffModal mode={modal.mode} person={modal.person} saving={saving} onClose={() => setModal(null)} onSave={save} />}</div>;
}

function StaffModal({ mode, person, saving, onClose, onSave }) {
  const [form, setForm] = useState({ staff_name: person?.staff_name || '', role: person?.role || '', date_of_birth: person?.date_of_birth ? String(person.date_of_birth).slice(0, 10) : '', is_active: person?.is_active ?? true }); const [error, setError] = useState('');
  function submit(event) { event.preventDefault(); if (!form.staff_name.trim()) return setError('Staff name is required.'); if (form.staff_name.trim().length > 100) return setError('Name must be at most 100 characters.'); if (!form.role.trim()) return setError('Role is required.'); if (form.role.trim().length > 40) return setError('Role must be at most 40 characters.'); if (form.date_of_birth && Number.isNaN(Date.parse(`${form.date_of_birth}T00:00:00`))) return setError('Enter a valid date of birth.'); onSave({ staff_name: form.staff_name.trim(), role: form.role.trim(), date_of_birth: form.date_of_birth || null, is_active: form.is_active }); }
  return <Modal title={mode === 'edit' ? 'Edit staff member' : 'Add staff member'} description="Keep your team details current." onClose={onClose}><form className="form-stack" onSubmit={submit}><Field label="Full name" required><input autoFocus maxLength="100" value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} placeholder="e.g. Riya Patel" /></Field><Field label="Role" required><input maxLength="40" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Server" /></Field><Field label="Date of birth"><input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field><label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><span>Active staff member</span></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add staff'}</button></div></form></Modal>;
}

function OrdersPage({ notify, quickAction, onQuickActionHandled }) {
  const [orders, setOrders] = useState([]); const [customers, setCustomers] = useState([]); const [tables, setTables] = useState([]); const [staff, setStaff] = useState([]); const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [lookupError, setLookupError] = useState(''); const [search, setSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('all'); const [creating, setCreating] = useState(false); const [saving, setSaving] = useState(false); const [detail, setDetail] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [orderData, customerData, tableData, staffData, menuData] = await Promise.all([api.get('/api/orders'), api.get('/api/customers'), api.get('/api/tables'), api.get('/api/staff'), api.get('/api/menu')]); if (![orderData, customerData, tableData, staffData, menuData].every(Array.isArray)) throw new Error('The order workspace response was not in the expected format.'); setOrders(orderData); setCustomers(customerData); setTables(tableData); setStaff(staffData); setMenu(menuData); setLookupError(''); } catch (err) { setError(err.message); setLookupError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (quickAction === 'create') {
      setCreating(true);
      onQuickActionHandled();
    }
  }, [quickAction, onQuickActionHandled]);
  const filtered = orders.filter((order) => (statusFilter === 'all' || order.status === statusFilter) && `${order.order_id} ${order.customer_name} ${order.table_number}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function createOrder(values) { setSaving(true); try { const result = await api.post('/api/orders', values); notify(`Order #${result.order_id} created. Prices were taken from the menu.`); setCreating(false); await load(); } catch (err) { notify(err.message, 'error'); } finally { setSaving(false); } }
  async function updateStatus(order, status) { try { const result = await api.put(`/api/orders/${order.order_id}`, { status }); notify(result.message || `Order #${order.order_id} updated.`); await load(); } catch (err) { notify(err.message, 'error'); } }
  async function viewOrder(order) { setDetail({ loading: true }); try { setDetail(await api.get(`/api/orders/${order.order_id}`)); } catch (err) { setDetail(null); notify(err.message, 'error'); } }
  return <div className="section-content"><section className="panel list-panel"><div className="list-toolbar"><div><span className="section-kicker">SERVICE FLOW</span><h2>Orders <span className="count-badge">{loading ? '…' : orders.length}</span></h2><p className="panel-description">Items and subtotals come directly from the order API.</p></div><button className="primary-button" onClick={() => setCreating(true)}><span>＋</span> New order</button></div><div className="table-tools"><label className="search-box"><span>⌕</span><input aria-label="Search orders" placeholder="Search order, guest or table" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="select-wrap"><span className="sr-only">Filter order status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{['placed', 'preparing', 'served', 'completed', 'cancelled'].map((status) => <option key={status}>{status}</option>)}</select></label><button className="filter-button" onClick={load}>↻ Refresh</button></div>{lookupError && !error && <div className="inline-error">Some order selections could not load: {lookupError}</div>}{error && <ErrorState message={error} onRetry={load} />}{!error && loading && <LoadingRows />}{!error && !loading && filtered.length === 0 && <EmptyState icon="▣" title={orders.length ? 'No orders match' : 'No orders yet'} description={orders.length ? 'Try another search or status.' : 'Create an order to start tracking service.'} action={!orders.length && <button className="secondary-button" onClick={() => setCreating(true)}>Create order</button>} />}{!error && !loading && filtered.length > 0 && <div className="responsive-table"><table><thead><tr><th>ORDER</th><th>GUEST / TABLE</th><th>STAFF</th><th>SUBTOTAL</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((order) => <tr key={order.order_id}><td><div className="contact-cell"><strong>#{order.order_id}</strong><small>{formatDate(order.created_at?.slice(0, 10))}</small></div></td><td><div className="contact-cell"><span>{order.customer_name}</span><small>Table {order.table_number}</small></div></td><td>{order.staff_name || <span className="muted">Unassigned</span>}</td><td className="money-cell">{formatMoney(order.bill_subtotal)}</td><td><select className="status-select" aria-label={`Update order ${order.order_id} status`} value={order.status} onChange={(e) => updateStatus(order, e.target.value)}>{['placed', 'preparing', 'served', 'completed', 'cancelled'].map((status) => <option key={status}>{status}</option>)}</select></td><td><button className="row-action" onClick={() => viewOrder(order)}>Details</button></td></tr>)}</tbody></table></div>}</section>{creating && <OrderModal customers={customers} tables={tables} staff={staff} menu={menu.filter((item) => item.is_available)} lookupError={lookupError} saving={saving} onClose={() => setCreating(false)} onSave={createOrder} />}{detail && <OrderDetailModal detail={detail} onClose={() => setDetail(null)} />}</div>;
}

function OrderModal({ customers, tables, staff, menu, lookupError, saving, onClose, onSave }) {
  const [customerId, setCustomerId] = useState(''); const [tableNumber, setTableNumber] = useState(''); const [staffId, setStaffId] = useState(''); const [items, setItems] = useState([{ menu_item_id: '', quantity: '1' }]); const [error, setError] = useState('');
  function setItem(index, key, value) { setItems((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  function submit(event) { event.preventDefault(); if (!customerId || !tableNumber) return setError('Choose a customer and table.'); if (!items.length || items.some((item) => !item.menu_item_id || !/^\d+$/.test(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 2147483647)) return setError('Choose a menu item and a positive whole-number quantity for every row.'); onSave({ customer_id: String(customerId), table_number: Number(tableNumber), accepted_by_staff_id: staffId || null, items: items.map((item) => ({ menu_item_id: String(item.menu_item_id), quantity: Number(item.quantity) })) }); }
  return <Modal title="Create an order" description="Choose the guest, table and menu items. The server records current menu prices." onClose={onClose}><form className="form-stack" onSubmit={submit}>{lookupError && <div className="form-error">Lookup data could not be loaded: {lookupError}</div>}<div className="form-grid"><Field label="Customer" required><select autoFocus value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Choose a guest</option>{customers.map((customer) => <option key={customer.customer_id} value={customer.customer_id}>{customer.customer_name}</option>)}</select></Field><Field label="Table" required><select value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}><option value="">Choose a table</option>{tables.map((table) => <option key={table.table_number} value={table.table_number}>Table {table.table_number}</option>)}</select></Field></div><Field label="Accepted by staff"><select value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">Unassigned</option>{staff.filter((person) => person.is_active).map((person) => <option key={person.staff_id} value={person.staff_id}>{person.staff_name} · {person.role}</option>)}</select></Field><div className="form-label-row"><span className="field-title">Order items <i>*</i></span><button type="button" className="row-action" onClick={() => setItems((current) => [...current, { menu_item_id: '', quantity: '1' }])}>＋ Add item</button></div>{items.map((item, index) => <div className="order-item-row" key={index}><select aria-label={`Menu item ${index + 1}`} value={item.menu_item_id} onChange={(e) => setItem(index, 'menu_item_id', e.target.value)}><option value="">Choose menu item</option>{menu.map((menuItem) => <option key={menuItem.menu_item_id} value={menuItem.menu_item_id}>{menuItem.food_name} · {formatMoney(menuItem.current_price)}</option>)}</select><input aria-label={`Quantity ${index + 1}`} type="number" min="1" step="1" value={item.quantity} onChange={(e) => setItem(index, 'quantity', e.target.value)} /><button type="button" className="remove-item" aria-label="Remove item" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>×</button></div>)}<p className="form-help">Prices and subtotal are calculated by the backend; no frontend price is sent.</p>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary-button" disabled={saving || !customers.length || !tables.length || !menu.length}>{saving ? 'Creating…' : 'Create order'}</button></div></form></Modal>;
}

function OrderDetailModal({ detail, onClose }) {
  if (detail.loading) return <Modal title="Order details" description="Loading order and item details…" onClose={onClose}><LoadingRows /></Modal>;
  return <Modal title={`Order #${detail.order_id}`} description={`${detail.customer_name} · Table ${detail.table_number}`} onClose={onClose}><div className="order-detail-top"><StatusBadge status={detail.status} /><strong>{formatMoney(detail.bill_subtotal)}</strong><small>Item subtotal</small></div><div className="responsive-table order-detail-table"><table><thead><tr><th>ITEM</th><th>QTY</th><th>UNIT PRICE</th><th>LINE TOTAL</th></tr></thead><tbody>{detail.items.map((item) => <tr key={item.item_no}><td>{item.food_name}</td><td>{item.quantity}</td><td>{formatMoney(item.unit_price)}</td><td>{formatMoney(Number(item.quantity) * Number(item.unit_price))}</td></tr>)}</tbody></table></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button></div></Modal>;
}

function PaymentsPage({ notify }) {
  const [payments, setPayments] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('all'); const [tab, setTab] = useState('payments'); const [selected, setSelected] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await api.get('/api/payments'); if (!Array.isArray(data)) throw new Error('The payment list response was not in the expected format.'); setPayments(data); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = payments.filter((payment) => (statusFilter === 'all' || payment.payment_status === statusFilter) && `${payment.payment_id} ${payment.order_id} ${payment.customer_name}`.toLowerCase().includes(search.trim().toLowerCase()));
  async function updateStatus(payment, payment_status) { try { const result = await api.put(`/api/payments/${payment.payment_id}/status`, { payment_status }); notify(result.message || 'Payment status updated.'); await load(); } catch (err) { notify(err.message, 'error'); } }
  async function viewPayment(payment) { try { setSelected({ loading: true }); setSelected(await api.get(`/api/payments/${payment.payment_id}`)); } catch (err) { setSelected(null); notify(err.message, 'error'); } }
  return <div className="section-content"><section className="panel list-panel"><div className="list-toolbar"><div><span className="section-kicker">BILLING DESK</span><h2>Payments <span className="count-badge">{loading ? '…' : payments.length}</span></h2><p className="panel-description">Recorded payment details and order bills.</p></div></div><div className="workspace-tabs"><button className={tab === 'payments' ? 'selected' : ''} onClick={() => setTab('payments')}>Payment records</button><button className={tab === 'billing' ? 'selected' : ''} onClick={() => setTab('billing')}>Order billing</button></div>{tab === 'payments' ? <><div className="table-tools"><label className="search-box"><span>⌕</span><input aria-label="Search payments" placeholder="Search payment, order or guest" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="select-wrap"><span className="sr-only">Filter payment status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{['pending', 'paid', 'failed', 'refunded'].map((status) => <option key={status}>{status}</option>)}</select></label><button className="filter-button" onClick={load}>↻ Refresh</button></div>{error && <ErrorState message={error} onRetry={load} />}{!error && loading && <LoadingRows />}{!error && !loading && filtered.length === 0 && <EmptyState icon="＄" title="No payment records found" description={payments.length ? 'Try a different filter or search.' : 'Payments linked to orders will appear here.'} />}{!error && !loading && filtered.length > 0 && <div className="responsive-table"><table><thead><tr><th>PAYMENT</th><th>GUEST / ORDER</th><th>AMOUNT</th><th>METHOD</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((payment) => <tr key={payment.payment_id}><td>#{payment.payment_id}</td><td><div className="contact-cell"><span>{payment.customer_name}</span><small>Order #{payment.order_id}</small></div></td><td className="money-cell">{formatMoney(payment.amount)}</td><td>{payment.payment_method || '—'}</td><td><select className="status-select" aria-label={`Update payment ${payment.payment_id} status`} value={payment.payment_status} onChange={(e) => updateStatus(payment, e.target.value)}>{['pending', 'paid', 'failed', 'refunded'].map((status) => <option key={status}>{status}</option>)}</select></td><td><button className="row-action" onClick={() => viewPayment(payment)}>Details</button></td></tr>)}</tbody></table></div>}</> : <BillingLookup notify={notify} onPaymentCreated={load} />}</section>{selected && <PaymentDetailModal payment={selected} onClose={() => setSelected(null)} />}</div>;
}

function BillingLookup({ notify, onPaymentCreated }) {
  const [orderId, setOrderId] = useState(''); const [bill, setBill] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [discount, setDiscount] = useState('0'); const [method, setMethod] = useState('cash'); const [status, setStatus] = useState('pending'); const [saving, setSaving] = useState(false);
  async function lookup(event) { event?.preventDefault(); setError(''); if (!/^\d+$/.test(orderId) || Number(orderId) < 1) return setError('Enter a valid order ID.'); setLoading(true); try { setBill(await api.get(`/api/billing/orders/${orderId}`)); } catch (err) { setBill(null); setError(err.message); } finally { setLoading(false); } }
  async function createPayment(event) { event.preventDefault(); setError(''); const amount = Number(discount); if (!Number.isFinite(amount) || amount < 0 || !/^\d+(\.\d{1,2})?$/.test(discount)) return setError('Discount must be a non-negative amount with up to two decimal places.'); if (amount > Number(bill.subtotal)) return setError('Discount cannot exceed the order subtotal.'); setSaving(true); try { const result = await api.post(`/api/orders/${bill.order_id}/payment`, { discount_amount: discount, payment_method: method, payment_status: status }); notify(result.message || 'Payment recorded.'); setBill(await api.get(`/api/billing/orders/${bill.order_id}`)); await onPaymentCreated(); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  return <div className="billing-area"><form className="billing-search" onSubmit={lookup}><Field label="Order ID" required><input value={orderId} onChange={(e) => setOrderId(e.target.value)} inputMode="numeric" placeholder="Enter an order number" /></Field><button className="primary-button" disabled={loading}>{loading ? 'Loading…' : 'View bill'}</button></form>{error && <div className="form-error">{error}</div>}{bill && <div className="billing-result"><div className="bill-heading"><div><span className="section-kicker">ORDER BILL</span><h3>Order #{bill.order_id}</h3></div>{bill.payment_status ? <StatusBadge status={bill.payment_status} /> : <span className="status-badge status-unavailable"><i />No payment</span>}</div><div className="bill-lines"><div><span>Item subtotal</span><strong>{formatMoney(bill.subtotal)}</strong></div><div><span>Discount</span><strong>− {formatMoney(bill.discount_amount)}</strong></div><div className="bill-total"><span>Final amount</span><strong>{formatMoney(bill.final_amount)}</strong></div></div><p className="form-help">Subtotal and final amount are returned by the backend billing endpoint.</p>{bill.payment_id ? <div className="inline-success">Payment #{bill.payment_id} is {bill.payment_status}. Method: {bill.payment_method || 'not recorded'}.</div> : <form className="payment-create-form" onSubmit={createPayment}><div className="form-grid"><Field label="Discount (₹)"><input type="number" min="0" max={bill.subtotal} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field><Field label="Payment method"><select value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="UPI">UPI</option><option value="other">Other</option></select></Field></div><Field label="Initial payment status"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></Field><button className="primary-button" disabled={saving || bill.order_status === 'cancelled'}>{saving ? 'Recording…' : 'Record payment'}</button>{bill.order_status === 'cancelled' && <p className="form-error">Payments cannot be created for cancelled orders.</p>}</form>}</div>}</div>;
}

function PaymentDetailModal({ payment, onClose }) { if (payment.loading) return <Modal title="Payment details" description="Loading payment…" onClose={onClose}><LoadingRows /></Modal>; return <Modal title={`Payment #${payment.payment_id}`} description={`Order #${payment.order_id} · ${payment.customer_name}`} onClose={onClose}><div className="detail-grid payment-detail-grid"><div><small>AMOUNT</small><strong>{formatMoney(payment.amount)}</strong></div><div><small>DISCOUNT</small><strong>{formatMoney(payment.discount_amount)}</strong></div><div><small>METHOD</small><strong>{payment.payment_method || 'Not recorded'}</strong></div><div><small>STATUS</small><StatusBadge status={payment.payment_status} /></div><div><small>PAID AT</small><strong>{payment.paid_at ? new Date(payment.paid_at).toLocaleString('en-IN') : 'Not paid'}</strong></div></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button></div></Modal>; }

function ReportsPage() {
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [reservationStatus, setReservationStatus] = useState('');
  const reservationQuery = new URLSearchParams(); if (from) reservationQuery.set('from', from); if (to) reservationQuery.set('to', to); if (reservationStatus) reservationQuery.set('status', reservationStatus);
  const revenueQuery = new URLSearchParams(); if (from) revenueQuery.set('from', from); if (to) revenueQuery.set('to', to);
  return <div className="reports-page"><div className="report-filter-bar"><span className="section-kicker">LIVE REPORTS</span><div className="report-filters"><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><label>Status<select value={reservationStatus} onChange={(e) => setReservationStatus(e.target.value)}><option value="">All reservations</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><button className="filter-button" onClick={() => { setFrom(''); setTo(''); setReservationStatus(''); }}>Clear filters</button></div></div><div className="report-grid"><ReportPanel title="Overview" kicker="AT A GLANCE" path="/api/reports/overview" className="report-overview" render={(data) => <div className="report-kpis">{[['Customers', data.total_customers], ['Reservations', data.total_reservations], ['Orders', data.total_orders], ['Available tables', data.available_tables]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{Number(value || 0).toLocaleString('en-IN')}</strong></div>)}<div className="report-revenue"><small>Successful payment revenue</small><strong>{formatMoney(data.successful_payment_revenue)}</strong></div></div>} />
    <ReportPanel title="Daily revenue" kicker="PAID PAYMENTS" path={`/api/reports/revenue${revenueQuery.size ? `?${revenueQuery}` : ''}`} render={(rows) => <RevenueChart rows={rows} />} />
    <ReportPanel title="Popular menu items" kicker="QUANTITY SOLD & SALES VALUE" path="/api/reports/popular-menu-items" render={(rows) => <PopularItems rows={rows} />} />
    <ReportPanel title="Staff performance" kicker="ORDERS HANDLED" path="/api/reports/staff-performance" render={(rows) => <StaffReport rows={rows} />} />
    <ReportPanel title="Reservations" kicker="GUEST & TABLE DETAILS" path={`/api/reports/reservations${reservationQuery.size ? `?${reservationQuery}` : ''}`} render={(rows) => <ReservationReport rows={rows} />} />
    <ReportPanel title="Order status" kicker="ORDER COUNTS" path="/api/reports/order-status" render={(rows) => <StatusReport rows={rows} labelKey="order_status" countKey="order_count" />} />
    <ReportPanel title="Payment status" kicker="PAYMENT COUNTS & AMOUNTS" path="/api/reports/payment-status" render={(rows) => <StatusReport rows={rows} labelKey="payment_status" countKey="payment_count" amountKey="total_amount" />} />
    </div></div>;
}

function ReportPanel({ title, kicker, path, render, className = '' }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData(await api.get(path)); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [path]);
  useEffect(() => { load(); }, [load]);
  return <section className={`panel report-panel ${className}`}><div className="panel-heading"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div><button className="report-reload" aria-label={`Refresh ${title}`} onClick={load}>↻</button></div>{error ? <div className="report-error"><span>{error}</span><button className="text-button" onClick={load}>Retry</button></div> : loading ? <div className="report-loading"><span /><span /><span /></div> : render(Array.isArray(data) ? data : data || {})}</section>;
}

function RevenueChart({ rows }) { if (!rows.length) return <EmptyState icon="↗" title="No revenue in this range" description="Paid payments with a recorded payment date will appear here." />; const max = Math.max(...rows.map((row) => Number(row.total_revenue || 0)), 1); return <div className="revenue-chart">{rows.slice(0, 8).map((row) => <div className="revenue-bar-row" key={row.revenue_date}><span>{formatDate(row.revenue_date)}</span><div><i style={{ width: `${Math.max(2, Number(row.total_revenue || 0) / max * 100)}%` }} /></div><strong>{formatMoney(row.total_revenue)}</strong><small>{row.successful_payment_count} paid</small></div>)}</div>; }
function PopularItems({ rows }) { if (!rows.length) return <EmptyState icon="◉" title="No popular items yet" description="Items with at least two sales appear in this ranking." />; const max = Math.max(...rows.map((row) => Number(row.quantity_sold || 0)), 1); return <div className="popular-list">{rows.slice(0, 8).map((row, index) => <div className="popular-row" key={row.menu_item_id}><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><div className="popular-info"><div><strong>{row.food_name}</strong><small>{formatMoney(row.sales_value)}</small></div><div className="popular-track"><i style={{ width: `${Math.max(4, Number(row.quantity_sold || 0) / max * 100)}%` }} /></div></div><b>{row.quantity_sold}</b></div>)}</div>; }
function StaffReport({ rows }) { if (!rows.length) return <EmptyState icon="♧" title="No staff records" description="Staff performance will appear after staff records are added." />; return <div className="compact-report-list">{rows.slice(0, 8).map((row) => <div key={row.staff_id}><span className="report-avatar">{initials(row.staff_name)}</span><span className="compact-report-name"><strong>{row.staff_name}</strong><small>{row.role}</small></span><b>{row.orders_handled}</b></div>)}</div>; }
function ReservationReport({ rows }) { if (!rows.length) return <EmptyState icon="▦" title="No reservations in this filter" description="Adjust the date range or reservation status." />; return <div className="responsive-table report-table"><table><thead><tr><th>GUEST</th><th>DATE / TIME</th><th>TABLE</th><th>PARTY</th><th>STATUS</th></tr></thead><tbody>{rows.slice(0, 10).map((row) => <tr key={row.reservation_id}><td>{row.customer_name}</td><td>{formatDate(row.reservation_date)} · {String(row.reservation_time).slice(0, 5)}</td><td>{row.table_number} · {row.table_capacity} seats</td><td>{row.party_size}</td><td><StatusBadge status={row.status} /></td></tr>)}</tbody></table></div>; }
function StatusReport({ rows, labelKey, countKey, amountKey }) { if (!rows.length) return <EmptyState icon="▥" title="Nothing to summarize" description="Status totals will appear as records are added." />; const max = Math.max(...rows.map((row) => Number(row[countKey] || 0)), 1); return <div className="status-report-list">{rows.map((row) => <div key={row[labelKey]}><div><StatusBadge status={row[labelKey]} /><strong>{Number(row[countKey] || 0).toLocaleString('en-IN')}</strong></div><div className="popular-track"><i style={{ width: `${Math.max(3, Number(row[countKey] || 0) / max * 100)}%` }} /></div>{amountKey && <small>{formatMoney(row[amountKey])}</small>}</div>)}</div>; }

export default App;
