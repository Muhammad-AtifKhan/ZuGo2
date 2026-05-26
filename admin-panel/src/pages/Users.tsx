import { useState, useEffect } from 'react';
import './Users.css';
import { Search, Filter, ShieldAlert, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
}

const UsersPage = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'passenger' | 'driver' | 'transporter'>('all');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let usersRef = collection(db, 'users');
      let q = usersRef;

      if (activeTab !== 'all') {
        q = query(usersRef, where('userType', '==', activeTab));
      }

      const querySnapshot = await getDocs(q);
      const usersList: UserRecord[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        usersList.push({
          id: doc.id,
          name: data.fullName || data.companyName || data.name || 'N/A',
          email: data.email || '',
          role: data.userType || data.role || 'user',
          status: data.status === 'suspended' ? 'suspended' : 'active',
          joined: data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
        });
      });

      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleToggleSuspend = async (userId: string, currentStatus: string) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === 'suspended' ? 'RESTORE' : 'SUSPEND'} this account?`)) return;

    try {
      const userRef = doc(db, 'users', userId);
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';

      await updateDoc(userRef, {
        status: newStatus,
        isActive: newStatus === 'active',
        updatedAt: new Date()
      });

      setUsers(users.map(user => {
        if (user.id === userId) {
          return { ...user, status: newStatus };
        }
        return user;
      }));

    } catch(err) {
      console.error("Failed to alter user state:", err);
      alert("Error: Action failed.");
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="users-page animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Verify, suspend, and manage all platform accounts.</p>
        </div>
        <button onClick={handleRefresh} className="btn-primary flex items-center gap-2" disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="card users-container">
        <div className="users-toolbar flex justify-between items-center">
          <div className="tabs flex gap-2">
            {['all', 'passenger', 'driver', 'transporter'].map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}s
              </button>
            ))}
          </div>

          <div className="list-actions flex gap-3">
            <div className="search-bar flex items-center">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </div>
            <button className="icon-btn"><Filter size={18} /></button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-secondary py-8">Loading users...</td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="text-secondary" title={user.id}>
                      ...{user.id.slice(-6)}
                    </td>
                    <td className="font-medium">{user.name}</td>
                    <td className="text-secondary text-sm">{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.status}`}>{user.status}</span>
                    </td>
                    <td className="text-secondary">{user.joined}</td>
                    <td>
                      <div className="flex gap-2">
                        {user.status === 'suspended' ? (
                          <button onClick={() => handleToggleSuspend(user.id, user.status)} className="icon-btn tooltip-trigger" title="Restore User">
                            <CheckCircle size={18} className="text-green-500" />
                          </button>
                        ) : (
                          <button onClick={() => handleToggleSuspend(user.id, user.status)} className="icon-btn tooltip-trigger" title="Suspend User">
                            <Ban size={18} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-secondary py-8">No matching records found in the database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;