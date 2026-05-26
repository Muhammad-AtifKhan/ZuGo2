import { useState, useEffect } from 'react';
import './Settings.css';
import { Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    commissionFeePercentage: 10,
    baseFareMinimum: 500,
    allowDriverRegistration: true,
    maintenanceBufferDays: 7
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch from Firestore
        const settingsRef = doc(db, 'system_settings', 'global');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSettings({
            commissionFeePercentage: data.commissionFeePercentage || 10,
            baseFareMinimum: data.baseFareMinimum || 500,
            allowDriverRegistration: data.allowDriverRegistration !== false,
            maintenanceBufferDays: data.maintenanceBufferDays || 7
          });
        } else {
          // Create default settings
          await setDoc(settingsRef, settings);
        }
      } catch (err) {
        console.error("Failed to load global config:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsRef = doc(db, 'system_settings', 'global');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: new Date(),
        updatedBy: 'admin'
      });
      alert("Settings Successfully Synced to Global Platform!");
    } catch (err) {
      console.error("Failed to update config", err);
      alert("Error: Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Global Configuration</h1>
        <p className="page-subtitle">Changes here will instantly affect mobile app business logic.</p>
      </div>

      <div className="settings-grid">
        <div className="card settings-group">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            Financial Policies
          </h2>

          <div className="form-group">
            <label>Platform Commission Fee (%)</label>
            <input
              type="number"
              name="commissionFeePercentage"
              value={settings.commissionFeePercentage}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Base Fare Minimum (Rs)</label>
            <input
              type="number"
              name="baseFareMinimum"
              value={settings.baseFareMinimum}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            />
          </div>
        </div>

        <div className="card settings-group">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            Operations Logic
          </h2>

          <div className="form-group">
            <label>Maintenance Buffer Notice (Days)</label>
            <input
              type="number"
              name="maintenanceBufferDays"
              value={settings.maintenanceBufferDays}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <input
              type="checkbox"
              name="allowDriverRegistration"
              checked={settings.allowDriverRegistration}
              onChange={handleChange}
              style={{ width: '20px', height: '20px' }}
              disabled={loading}
            />
            <label style={{ fontSize: '1.1rem', color: 'white' }}>Allow Open Driver Registrations</label>
          </div>

          <div className="bg-red-900/30 p-4 rounded-lg mt-4 flex items-start gap-3 border border-red-500/50">
            <AlertTriangle className="text-red-400 shrink-0 mt-1" size={20} />
            <p className="text-sm text-red-200 leading-relaxed">
              Modifying financial configurations applies selectively to all newly generated bookings. Past receipts and scheduled trips won't inherit logic adjustments.
            </p>
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="btn-primary flex items-center gap-2"
          style={{ minWidth: '150px', justifyContent: 'center' }}
        >
          {saving ? <><RefreshCw size={18} className="animate-spin" /> Syncing...</> : <><Save size={18} /> Save & Deploy</>}
        </button>
      </div>
    </div>
  );
}