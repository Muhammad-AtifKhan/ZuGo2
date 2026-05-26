import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Bus, DollarSign, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  return (
    <div className="layout-container flex">
      {/* Sidebar */}
      <aside className="sidebar flex flex-col">
        <div className="sidebar-header flex items-center">
          <div className="logo-circle">
            <span className="logo-text">Z</span>
          </div>
          <h2>ZuGo Admin</h2>
        </div>
        
        <nav className="sidebar-nav flex-col flex">
          <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/users" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Users size={20} />
            <span>User Management</span>
          </NavLink>
          <NavLink to="/fleet" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Bus size={20} />
            <span>Fleet & Trips</span>
          </NavLink>
          <NavLink to="/finance" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <DollarSign size={20} />
            <span>Financials</span>
          </NavLink>
          <NavLink to="/settings" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
          <NavLink to="/approvals" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <ShieldCheck size={20} />
            <span>Approvals</span>
          </NavLink>
        </nav>
        
        <div className="sidebar-footer">
          <button className="nav-item logout-btn w-full" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content flex-col flex">
        <header className="top-header flex justify-between items-center">
          <div className="header-search">
            <input type="text" placeholder="Search trips, users, etc..." />
          </div>
          <div className="header-profile flex items-center">
            <div className="notification-bell"></div>
            <div className="profile-avatar">S</div>
            <span className="profile-name">{user?.email || 'Super Admin'}</span>
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;