import { useState, useEffect } from 'react';
import './Fleet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Clock, User, Bus, RefreshCw } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import L from 'leaflet';

// Fix standard React-Leaflet icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create a custom bus icon
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

export default function FleetPage() {
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Center on Pakistan/Lahore by default
  const centerPosition: [number, number] = [31.5204, 74.3587];

  const fetchActiveTrips = async () => {
    try {
      const tripsRef = collection(db, 'trips');
      const q = query(tripsRef, where('status', '==', 'in-progress'));
      const querySnapshot = await getDocs(q);

      const trips: any[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        trips.push({
          id: doc.id,
          routeName: data.routeName || 'Active Trip',
          busNumber: data.busNumber || 'N/A',
          driverName: data.driverName || 'Unknown',
          departureTime: data.departureTime || '--:--',
          latitude: data.currentLatitude || 31.5204,
          longitude: data.currentLongitude || 74.3587,
          speed: data.speed || 0,
        });
      });

      setActiveTrips(trips);
    } catch (error) {
      console.error("Error fetching active trips:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveTrips();

    // Set up real-time listener for trips
    const tripsRef = collection(db, 'trips');
    const q = query(tripsRef, where('status', '==', 'in-progress'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        trips.push({
          id: doc.id,
          routeName: data.routeName || 'Active Trip',
          busNumber: data.busNumber || 'N/A',
          driverName: data.driverName || 'Unknown',
          departureTime: data.departureTime || '--:--',
          latitude: data.currentLatitude || 31.5204,
          longitude: data.currentLongitude || 74.3587,
          speed: data.speed || 0,
        });
      });
      setActiveTrips(trips);
    }, (error) => {
      console.error("Error in real-time listener:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActiveTrips();
  };

  return (
    <div className="fleet-page animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Real-Time Fleet Tracking</h1>
          <p className="page-subtitle">Monitor {activeTrips.length} active routes simultaneously.</p>
        </div>
        <button onClick={handleRefresh} className="btn-primary flex items-center gap-2" disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="fleet-grid">
        {/* Tracking Map Context */}
        <div className="map-container card">
          <MapContainer
            center={centerPosition}
            zoom={12}
            style={{ height: '100%', width: '100%', borderRadius: '8px' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap & ZuGo2'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
            />
            {activeTrips.map(trip => {
              if (!trip.latitude) return null;

              return (
                <Marker
                  key={trip.id}
                  position={[trip.latitude, trip.longitude]}
                  icon={busIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong className="block mb-1">{trip.routeName || 'Unknown Route'}</strong>
                      <div>Bus: {trip.busNumber || 'N/A'}</div>
                      <div>Driver: {trip.driverName || 'N/A'}</div>
                      <div>Speed: {trip.speed ? Math.round(trip.speed * 3.6) + ' km/h' : '0 km/h'}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Live Trip Cards Sidebar */}
        <div className="ops-sidebar">
          <h2 className="text-lg font-semibold mb-4">Live Operations</h2>
          <div className="ops-list">
            {loading ? (
              <p className="text-secondary text-sm">Scanning networks...</p>
            ) : activeTrips.length > 0 ? (
              activeTrips.map(trip => {
                return (
                  <div key={trip.id} className="trip-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium truncate pr-2 flex-1" title={trip.routeName}>{trip.routeName || 'Active Trip'}</span>
                      <span className="status-badge live flex items-center gap-1">
                        <span className="live-dot"></span> Live
                      </span>
                    </div>

                    <div className="text-sm text-secondary space-y-2 mt-3">
                      <div className="flex items-center gap-2">
                        <Bus size={14} className="text-blue-400" />
                        <span>Bus: {trip.busNumber || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-purple-400" />
                        <span>{trip.driverName || 'Driver'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation size={14} className="text-green-400" />
                        <span>{trip.speed ? Math.round(trip.speed * 3.6) : 0} km/h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-orange-400" />
                        <span>Dep: {trip.departureTime || '--:--'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <p className="text-secondary text-sm text-center">No buses are currently on active trips.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}