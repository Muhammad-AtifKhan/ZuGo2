import { useEffect, useState } from 'react';
import './Dashboard.css';
import { Users, Bus, Map, CircleDollarSign } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis
} from 'recharts';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B'];

const DashboardPage = () => {
  const [totalUsers, setTotalUsers] = useState<number | string>('...');
  const [totalBuses, setTotalBuses] = useState<number | string>('...');
  const [totalTrips, setTotalTrips] = useState<number | string>('...');
  const [totalRevenue, setTotalRevenue] = useState<number | string>('...');

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [routeData, setRouteData] = useState<any[]>([]);
  const [utilizationData, setUtilizationData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch counts from Firestore
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const busesSnapshot = await getDocs(collection(db, 'buses'));
        const tripsSnapshot = await getDocs(collection(db, 'trips'));

        setTotalUsers(usersSnapshot.size);
        setTotalBuses(busesSnapshot.size);
        setTotalTrips(tripsSnapshot.size);

        // Calculate total revenue from trips
        let totalRev = 0;
        tripsSnapshot.forEach(doc => {
          const data = doc.data();
          totalRev += data.revenue || 0;
        });
        setTotalRevenue(totalRev.toLocaleString());

        // Sample chart data (replace with actual data from Firestore)
        setRevenueData([
          { name: 'Mon', revenue: 45000, commission: 9000 },
          { name: 'Tue', revenue: 52000, commission: 10400 },
          { name: 'Wed', revenue: 48000, commission: 9600 },
          { name: 'Thu', revenue: 61000, commission: 12200 },
          { name: 'Fri', revenue: 78000, commission: 15600 },
          { name: 'Sat', revenue: 65000, commission: 13000 },
          { name: 'Sun', revenue: 43000, commission: 8600 },
        ]);

        setRouteData([
          { route: 'Lahore-Multan', bookings: 245 },
          { route: 'Islamabad-Lahore', bookings: 320 },
          { route: 'Karachi-Hyderabad', bookings: 189 },
          { route: 'Rawalpindi-Peshawar', bookings: 278 },
          { route: 'Faisalabad-Lahore', bookings: 210 },
        ]);

        setUtilizationData([
          { name: 'Active', value: 65 },
          { name: 'Maintenance', value: 15 },
          { name: 'Inactive', value: 20 },
        ]);

        setPerformanceData([
          { rating: 4.5, trips: 120, rev: 45000 },
          { rating: 4.2, trips: 95, rev: 32000 },
          { rating: 4.8, trips: 150, rev: 58000 },
          { rating: 3.9, trips: 70, rev: 21000 },
          { rating: 4.6, trips: 110, rev: 39000 },
        ]);

        setPeakHoursData([
          { hour: 6, volume: 45 },
          { hour: 7, volume: 89 },
          { hour: 8, volume: 156 },
          { hour: 9, volume: 234 },
          { hour: 10, volume: 198 },
          { hour: 11, volume: 167 },
          { hour: 12, volume: 145 },
          { hour: 13, volume: 123 },
          { hour: 14, volume: 98 },
          { hour: 15, volume: 87 },
          { hour: 16, volume: 112 },
          { hour: 17, volume: 234 },
          { hour: 18, volume: 345 },
          { hour: 19, volume: 278 },
          { hour: 20, volume: 189 },
        ]);

      } catch (err) {
        console.error("Failed to load dashboard metrics", err);
        setTotalUsers('Error');
        setTotalBuses('Error');
        setTotalTrips('Error');
        setTotalRevenue('Error');
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-header">
        <h1 className="page-title">Platform Overview</h1>
        <p className="page-subtitle">Welcome back, Super Admin. Here is your live platform status.</p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card flex items-center">
          <div className="stat-icon-wrapper blue">
            <Users size={24} />
          </div>
          <div className="flex-col">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{totalUsers}</span>
          </div>
        </div>

        <div className="card stat-card flex items-center">
          <div className="stat-icon-wrapper green">
            <Bus size={24} />
          </div>
          <div className="flex-col">
            <span className="stat-label">Fleet Size (Buses)</span>
            <span className="stat-value">{totalBuses}</span>
          </div>
        </div>

        <div className="card stat-card flex items-center">
          <div className="stat-icon-wrapper purple">
            <Map size={24} />
          </div>
          <div className="flex-col">
            <span className="stat-label">Total Routes/Trips</span>
            <span className="stat-value">{totalTrips}</span>
          </div>
        </div>

        <div className="card stat-card flex items-center">
          <div className="stat-icon-wrapper orange">
            <CircleDollarSign size={24} />
          </div>
          <div className="flex-col">
            <span className="stat-label">Verified Revenue (Rs)</span>
            <span className="stat-value">Rs {totalRevenue}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Chart sections remain same */}
        <div className="grid-2 mt-4">
          <div className="card h-full chart-container">
            <h3>Revenue & Commission Trends</h3>
            <p className="text-secondary text-sm mb-4">Last 7 Days</p>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} tickFormatter={(value) => `Rs${value/1000}k`} />
                  <Tooltip wrapperStyle={{ backgroundColor: '#1E1E2D', border: 'none', borderRadius: '8px' }} contentStyle={{ backgroundColor: '#1E1E2D', border: 'none', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" name="Gross Rev" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="commission" name="Platform Cut" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card h-full chart-container">
            <h3>Demand by Bus</h3>
            <p className="text-secondary text-sm mb-4">Top 5 Buses by Ticket Volume</p>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#888" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="route" type="category" stroke="#888" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1E1E2D', border: 'none', color: '#fff' }} />
                  <Bar dataKey="bookings" name="Booked Tickets" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid-3 mt-4">
          <div className="card h-full chart-container">
            <h3>Peak Booking Hours</h3>
            <p className="text-secondary text-sm mb-4">Daily Volume Distribution</p>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="hour" type="number" name="Hour" unit="h" stroke="#888" domain={[0, 24]} tickCount={7} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="volume" type="number" name="Tickets" stroke="#888" tick={{ fontSize: 12 }} />
                  <ZAxis range={[50, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1E1E2D', border: 'none', color: '#fff' }} />
                  <Scatter name="Volume" data={peakHoursData} fill="#F59E0B" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card h-full chart-container">
            <h3>Transporter Performance Matrix</h3>
            <p className="text-secondary text-sm mb-4">Trips vs Rating</p>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="rating" type="number" name="Rating" domain={[3, 5]} stroke="#888" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="trips" type="number" name="Total Trips" stroke="#888" tick={{ fontSize: 12 }} />
                  <ZAxis dataKey="rev" range={[100, 600]} name="Revenue" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1E1E2D', border: 'none', color: '#fff' }} />
                  <Scatter name="Drivers" data={performanceData} fill="#EC4899" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card h-full chart-container">
            <h3>Fleet Utilization</h3>
            <p className="text-secondary text-sm mb-4">Current Status Ratio</p>
            <div className="chart-wrapper pie-chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={utilizationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {utilizationData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1E1E2D', border: 'none', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="utilization-label text-center mb-2">
              <span className="text-2xl font-bold" style={{ color: COLORS[0] }}>65%</span>
              <p className="text-xs text-secondary mt-1">Active on Route</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;