import { useState, useEffect } from 'react';
import './Finance.css';
import { Download, Search, Filter } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface BookingRecord {
  id: string;
  bookingCode: string;
  passengerName: string;
  busNumber: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

export default function FinancePage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchFinanceData = async () => {
      setLoading(true);
      try {
        // Fetch bookings from Firestore
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);

        const bookingsList: BookingRecord[] = [];
        let revenue = 0;

        querySnapshot.forEach(doc => {
          const data = doc.data();
          const amount = data.totalAmount || 0;
          revenue += amount;

          bookingsList.push({
            id: doc.id,
            bookingCode: data.bookingCode || data.id || doc.id.slice(-8),
            passengerName: data.passengerName || data.userName || 'Unknown',
            busNumber: data.busNumber || data.busName || 'N/A',
            totalAmount: amount,
            paymentMethod: data.paymentMethod || 'card',
            paymentStatus: data.paymentStatus || 'completed',
            createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
          });
        });

        setBookings(bookingsList);
        setTotalRevenue(revenue);

      } catch (error) {
        console.error("Error fetching finance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  const filteredBookings = bookings.filter(booking =>
    booking.bookingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.passengerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (filteredBookings.length === 0) {
      alert("No data available to export");
      return;
    }

    const headers = ['Booking Code', 'Passenger', 'Bus/Route', 'Date', 'Method', 'Status', 'Amount'];

    const csvRows = filteredBookings.map(b => {
      const values = [
        b.bookingCode,
        b.passengerName,
        b.busNumber,
        b.createdAt,
        b.paymentMethod,
        b.paymentStatus,
        b.totalAmount.toString()
      ];
      return values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `zugo_financial_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="finance-page animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Financial Ledger</h1>
          <p className="page-subtitle">Track payments, bookings, and live gross revenue.</p>
        </div>
        <button onClick={exportToCSV} className="btn-primary flex items-center gap-2">
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="financial-stats">
        <div className="finance-card">
          <span className="finance-label">Verified Gross Revenue</span>
          <span className="finance-val revenue">Rs {totalRevenue.toLocaleString()}</span>
        </div>
        <div className="finance-card">
          <span className="finance-label">Processed Bookings</span>
          <span className="finance-val text-blue-400">{filteredBookings.length}</span>
        </div>
        <div className="finance-card">
          <span className="finance-label">Platform Fees (Est. 10%)</span>
          <span className="finance-val text-purple-400">Rs {(totalRevenue * 0.1).toLocaleString()}</span>
        </div>
      </div>

      <div className="card users-container">
        <div className="users-toolbar flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Recent Transactions</h2>
          <div className="list-actions flex gap-3">
            <div className="search-bar flex items-center">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search Booking Code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="icon-btn"><Filter size={18} /></button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Booking Code</th>
                <th>Passenger</th>
                <th>Bus/Route</th>
                <th>Date</th>
                <th>Method</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-secondary">Fetching Live Transactions...</td>
                </tr>
              ) : filteredBookings.length > 0 ? (
                filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs">{b.bookingCode}</td>
                    <td className="font-medium">{b.passengerName}</td>
                    <td>{b.busNumber}</td>
                    <td className="text-secondary text-sm">{b.createdAt}</td>
                    <td className="capitalize text-secondary">{b.paymentMethod}</td>
                    <td>
                      <span className={`status-badge ${b.paymentStatus.toLowerCase()}`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="font-bold">Rs {b.totalAmount.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-secondary">No recent confirmed bookings found.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}