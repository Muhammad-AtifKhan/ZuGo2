import { useState, useEffect } from 'react';
import './Approvals.css';
import { CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { ensureAdminFirestoreRecord } from '../contexts/AuthContext';

const isPendingAccount = (data: Record<string, unknown>): boolean => {
  if (data.isVerified === true || data.verified === true) {
    return false;
  }
  if (data.isVerified === false || data.verified === false) {
    return true;
  }
  const status = String(data.status || '').toLowerCase();
  return (
    status.includes('pending') ||
    status === 'pending_admin_verification' ||
    status === 'pending_verification'
  );
};

interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  joined: string;
  isVerified: boolean;
  companyName?: string;
}

interface PendingRoute {
  id: string;
  code: string;
  name: string;
  from: string;
  to: string;
  transporterId: string;
  transporterName?: string;
  status: string;
}

const ApprovalsPage = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'routes'>('accounts');
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [pendingRoutes, setPendingRoutes] = useState<PendingRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminAuth = async () => {
      const user = auth.currentUser;
      if (!user) {
        window.location.href = '/login';
        return;
      }

      let adminDoc = await getDoc(doc(db, 'admins', user.uid));
      const normalizedEmail = user.email?.toLowerCase() || '';
      const isSuperAdmin =
        normalizedEmail === 'atifkhanniazi181@gmail.com' ||
        normalizedEmail === 'atifkhanniazi186@gmail.com';
      if (!adminDoc.exists() && isSuperAdmin) {
        await ensureAdminFirestoreRecord(user.uid, user.email);
        adminDoc = await getDoc(doc(db, 'admins', user.uid));
      }
      // #region agent log
      fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'Approvals.tsx:checkAdminAuth',message:'admin auth check',data:{uidPrefix:user.uid?.slice(0,8),adminDocExists:adminDoc.exists(),hasEmailBypass:user.email==='atifkhanniazi181@gmail.com'},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
      // #endregion
      if (!adminDoc.exists() && !isSuperAdmin) {
        window.location.href = '/login';
        return;
      }

      setIsAuthorized(true);
      fetchApprovals();
    };

    checkAdminAuth();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const transportersRef = collection(db, 'transporters');
      const driversRef = collection(db, 'drivers');
      const pendingUsers: PendingUser[] = [];

      let allTransportersCount = -1;
      let pendingTransporterCount = 0;
      try {
        const allTransportersSnap = await getDocs(transportersRef);
        allTransportersCount = allTransportersSnap.size;

        for (const docSnap of allTransportersSnap.docs) {
          const data = docSnap.data() as Record<string, unknown>;
          if (!isPendingAccount(data)) {
            continue;
          }
          pendingTransporterCount += 1;
          pendingUsers.push({
            id: docSnap.id,
            name: String(data.companyName || data.fullName || 'N/A'),
            email: String(data.email || ''),
            phone: String(data.phone || ''),
            role: 'transporter',
            status: String(data.status || 'pending_verification'),
            joined:
              (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleDateString() ||
              new Date().toLocaleDateString(),
            isVerified: data.isVerified === true || data.verified === true,
            companyName: data.companyName as string | undefined,
          });
        }
      } catch (allErr: unknown) {
        const e = allErr as { code?: string; message?: string };
        // #region agent log
        fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'Approvals.tsx:fetchAllTransporters',message:'all transporters read failed',data:{code:e?.code,errMsg:e?.message?.slice(0,120)},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
        // #endregion
      }

      let pendingDriverCount = 0;
      try {
        const allDriversSnap = await getDocs(driversRef);
        for (const docSnap of allDriversSnap.docs) {
          const data = docSnap.data() as Record<string, unknown>;
          if (!isPendingAccount(data)) {
            continue;
          }
          pendingDriverCount += 1;
          pendingUsers.push({
            id: docSnap.id,
            name: String(data.fullName || data.name || 'N/A'),
            email: String(data.email || ''),
            phone: String(data.phone || data.contactNumber || ''),
            role: 'driver',
            status: String(data.status || 'pending_verification'),
            joined:
              (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleDateString() ||
              new Date().toLocaleDateString(),
            isVerified: data.isVerified === true || data.verified === true,
          });
        }
      } catch (driverErr: unknown) {
        const e = driverErr as { code?: string; message?: string };
        // #region agent log
        fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'Approvals.tsx:fetchAllDrivers',message:'all drivers read failed',data:{code:e?.code,errMsg:e?.message?.slice(0,120)},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
        // #endregion
      }

      // #region agent log
      fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'Approvals.tsx:fetchPendingTransporters',message:'pending accounts after filter',data:{allTransportersCount,pendingTransporterCount,pendingDriverCount,totalPending:pendingUsers.length},timestamp:Date.now(),hypothesisId:'H3',runId:'post-fix'})}).catch(()=>{});
      // #endregion

      setUsers(pendingUsers);

      // ✅ Fetch pending routes
      const routesRef = collection(db, 'routes');
      const routesQuery = query(routesRef, where('status', '==', 'pending'));
      const routesSnapshot = await getDocs(routesQuery);

      const pendingRoutesList: PendingRoute[] = [];
      for (const docSnap of routesSnapshot.docs) {
        const data = docSnap.data();

        let transporterName = 'Unknown';
        if (data.transporterId) {
          const transporterDoc = await getDoc(doc(db, 'transporters', data.transporterId));
          if (transporterDoc.exists()) {
            transporterName = transporterDoc.data()?.companyName || 'Unknown';
          }
        }

        pendingRoutesList.push({
          id: docSnap.id,
          code: data.code || data.routeCode || 'N/A',
          name: data.name || data.routeName || 'N/A',
          from: data.from || data.origin || 'N/A',
          to: data.to || data.destination || 'N/A',
          transporterId: data.transporterId || '',
          transporterName: transporterName,
          status: data.status || 'pending',
        });
      }

      setPendingRoutes(pendingRoutesList);

    } catch (error: unknown) {
      const e = error as { code?: string; message?: string };
      console.error("Error fetching approvals:", error);
      // #region agent log
      fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'Approvals.tsx:fetchApprovals:catch',message:'fetchApprovals error',data:{code:e?.code,errMsg:e?.message?.slice(0,160)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string, userRole: string) => {
    if (!window.confirm('Are you sure you want to approve this account?')) return;

    setApprovingId(userId);
    try {
      if (userRole === 'transporter') {
        const transporterRef = doc(db, 'transporters', userId);
        await updateDoc(transporterRef, {
          isVerified: true,
          isActive: true,
          status: 'active',
          verifiedAt: new Date(),
          updatedAt: new Date(),
        });

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          status: 'active',
          isActive: true,
          updatedAt: new Date(),
        });

      } else if (userRole === 'driver') {
        const driverRef = doc(db, 'drivers', userId);
        await updateDoc(driverRef, {
          isVerified: true,
          isActive: true,
          status: 'active',
          verifiedAt: new Date(),
          updatedAt: new Date(),
        });

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          status: 'active',
          isActive: true,
          updatedAt: new Date(),
        });
      }

      setUsers(users.filter(u => u.id !== userId));
      alert('Account approved successfully!');

    } catch (err) {
      console.error("Failed to approve user:", err);
      alert("Error: Could not approve user.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectUser = async (userId: string, userRole: string) => {
    if (!window.confirm('Are you sure you want to reject this account?')) return;

    setApprovingId(userId);
    try {
      if (userRole === 'transporter') {
        const transporterRef = doc(db, 'transporters', userId);
        await updateDoc(transporterRef, {
          status: 'rejected',
          isActive: false,
          rejectedAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (userRole === 'driver') {
        const driverRef = doc(db, 'drivers', userId);
        await updateDoc(driverRef, {
          status: 'rejected',
          isActive: false,
          rejectedAt: new Date(),
          updatedAt: new Date(),
        });
      }

      setUsers(users.filter(u => u.id !== userId));
      alert('Account rejected.');

    } catch (err) {
      console.error("Failed to reject user:", err);
      alert("Error: Could not reject user.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveRoute = async (routeId: string) => {
    if (!window.confirm('Are you sure you want to approve this route?')) return;

    setApprovingId(routeId);
    try {
      const routeRef = doc(db, 'routes', routeId);
      await updateDoc(routeRef, {
        status: 'approved',
        isActive: true,
        approvedAt: new Date(),
        updatedAt: new Date(),
      });

      setPendingRoutes(pendingRoutes.filter(r => r.id !== routeId));
      alert('Route approved successfully!');

    } catch (err) {
      console.error("Failed to approve route:", err);
      alert("Error: Could not approve route.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectRoute = async (routeId: string) => {
    if (!window.confirm('Are you sure you want to reject this route?')) return;

    setApprovingId(routeId);
    try {
      const routeRef = doc(db, 'routes', routeId);
      await updateDoc(routeRef, {
        status: 'rejected',
        isActive: false,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      });

      setPendingRoutes(pendingRoutes.filter(r => r.id !== routeId));
      alert('Route rejected.');

    } catch (err) {
      console.error("Failed to reject route:", err);
      alert("Error: Could not reject route.");
    } finally {
      setApprovingId(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="approvals-page animate-fade-in">
      {/* Rest of the JSX remains same */}
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="page-subtitle">Review and verify new accounts and routes before they go live.</p>
        </div>
        <div className="btn-primary flex items-center gap-2 cursor-default bg-yellow-600/20 text-yellow-500 border border-yellow-600/50 hover:bg-yellow-600/20">
          <Clock size={18} />
          {users.length + pendingRoutes.length} Pending Items
        </div>
      </div>

      <div className="card approvals-container">
        <div className="approvals-toolbar flex justify-between items-center">
          <div className="tabs flex gap-2">
            <button
              className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              Account Approvals ({users.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
              onClick={() => setActiveTab('routes')}
            >
              Route Approvals ({pendingRoutes.length})
            </button>
          </div>
          <button onClick={fetchApprovals} className="refresh-btn" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Table JSX same as before */}
        <div className="table-wrapper">
          {activeTab === 'accounts' && (
            <table className="approvals-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Date Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-secondary">Loading...</td></tr>
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="font-medium">{user.name}</div>
                        <div className="detail-text">{user.email}</div>
                        {user.phone && <div className="detail-text text-xs text-blue-500 font-medium">📞 {user.phone}</div>}
                        {user.companyName && <div className="detail-text text-xs text-green-500">🏢 {user.companyName}</div>}
                        <div className="detail-text text-xs opacity-50">ID: ...{user.id.slice(-6)}</div>
                      </td>
                      <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                      <td className="text-secondary">{user.joined}</td>
                      <td><span className="status-badge pending_verification">Pending</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleApproveUser(user.id, user.role)} className="approve-btn" disabled={approvingId === user.id}>
                            <CheckCircle size={16} /> Approve
                          </button>
                          <button onClick={() => handleRejectUser(user.id, user.role)} className="reject-btn" disabled={approvingId === user.id}>
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="text-center py-8 text-secondary">No pending accounts found.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'routes' && (
            <table className="approvals-table">
              <thead>
                <tr>
                  <th>Route Information</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Transporter</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-secondary">Loading...</td></tr>
                ) : pendingRoutes.length > 0 ? (
                  pendingRoutes.map((routeData) => (
                    <tr key={routeData.id}>
                      <td>
                        <div className="font-medium">{routeData.name}</div>
                        <div className="detail-text">{routeData.code}</div>
                      </td>
                      <td><div className="font-medium">{routeData.from}</div></td>
                      <td><div className="font-medium">{routeData.to}</div></td>
                      <td>
                        <div className="detail-text">{routeData.transporterName}</div>
                        <div className="detail-text text-xs opacity-50">ID: ...{routeData.transporterId.slice(-6)}</div>
                      </td>
                      <td><span className="status-badge unverified">Pending</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleApproveRoute(routeData.id)} className="approve-btn" disabled={approvingId === routeData.id}>
                            <CheckCircle size={16} /> Approve
                          </button>
                          <button onClick={() => handleRejectRoute(routeData.id)} className="reject-btn" disabled={approvingId === routeData.id}>
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="text-center py-8 text-secondary">No pending routes found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalsPage;