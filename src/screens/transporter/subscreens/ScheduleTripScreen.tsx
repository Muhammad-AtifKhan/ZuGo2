// src/screens/transporter/subscreens/ScheduleTripScreen.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  FlatList,
  Platform,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import { Route, Trip } from '../../../types/operations.types';
import { TRIP_STATUS, BUS_STATUS, DRIVER_STATUS, SCHEDULE_STATUS } from '../../../constants/status';

const COLORS = {
  primary: '#1A237E',
  secondary: '#4A90E2',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  warningDark: '#E65100',
  info: '#2196F3',
  infoLight: '#E3F2FD',
  text: '#1A237E',
  textLight: '#666666',
  textLighter: '#999999',
  background: '#F8F9FA',
  white: '#FFFFFF',
  border: '#E0E0E0',
  purple: '#9C27B0',
};

const SIZES = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

type FirebaseBus = {
  id: string;
  busNumber: string;
  capacity: number;
  status: string;
};

type FirebaseDriver = {
  id: string;
  fullName: string;
  status: string;
  contactNumber?: string;
};

type ValidationState = {
  busAvailable: boolean;
  driverAvailable: boolean;
  busMessage?: string;
  driverMessage?: string;
  routeFrequencyValid: boolean;
  routeFrequencyMessage?: string;
  fareValid: boolean;
  fareMessage?: string;
  seatsValid: boolean;
  seatsMessage?: string;
  dateValid: boolean;
  dateMessage?: string;
  durationValid: boolean;
  durationMessage?: string;
  busLocationMatch: boolean;
  driverLocationMatch: boolean;
};

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BUS_TURNAROUND_MINUTES = 30;
const DRIVER_REST_MINUTES = 60;
const MIN_FARE = 1;
const MAX_FARE = 50000;
const MAX_TRIP_DURATION_HOURS = 24;
const MIN_ROUTE_GAP_MINUTES = 30;
const MAX_FUTURE_DAYS = 90;
const MIN_ADVANCE_BOOKING_HOURS = 2;

// ============================================================
// ✅ TIMEZONE FIX — Pakistan Standard Time (UTC+5)
//
// PROBLEM: new Date("2026-04-14") creates UTC midnight
//          In PKT (UTC+5) that equals April 13 at 11:00 PM
//          So date shows as April 13 instead of April 14
//
// SOLUTION: Never use new Date("YYYY-MM-DD") for local display.
//           Always extract year/month/day manually.
// ============================================================

/** Safe local date string: Date object => "YYYY-MM-DD" using LOCAL timezone */
const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Normalize any date value to "YYYY-MM-DD" string safely.
 * Handles: plain string, Firestore Timestamp, JS Date
 * Uses LOCAL timezone — never UTC midnight trap.
 */
const normDateStr = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val.split('T')[0]; // already "YYYY-MM-DD" or ISO
  if (val?.toDate && typeof val.toDate === 'function') {
    // Firestore Timestamp -> JS Date -> local string
    return toLocalDateString(val.toDate());
  }
  if (val instanceof Date) return toLocalDateString(val);
  return '';
};

/**
 * Parse "YYYY-MM-DD" to a local JS Date (noon to avoid DST edge cases).
 * NEVER use new Date("YYYY-MM-DD") — that's UTC and causes off-by-one in PKT.
 */
const parseLocalDate = (str: string): Date => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

const ScheduleTripScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    mode, trip, preSelectedRoute, transporterId: routeTransporterId,
  } = route.params as {
    mode: 'add' | 'edit' | 'view';
    trip?: Trip;
    preSelectedRoute?: string;
    transporterId?: string;
  };

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [isGeneratingTrips, setIsGeneratingTrips] = useState(false);
  const [generatedTripsCount, setGeneratedTripsCount] = useState(0);
  const [generatedTrips, setGeneratedTrips] = useState<any[]>([]);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<FirebaseBus[]>([]);
  const [drivers, setDrivers] = useState<FirebaseDriver[]>([]);

  // ✅ Both state + ref: state for renders, ref for latest value in callbacks
  const [existingTrips, setExistingTrips] = useState<any[]>([]);
  const existingTripsRef = useRef<any[]>([]);
  const busesRef = useRef<FirebaseBus[]>([]);

  const [validation, setValidation] = useState<ValidationState>({
    busAvailable: true, driverAvailable: true,
    routeFrequencyValid: true, fareValid: true, seatsValid: true,
    dateValid: true, durationValid: true,
    busLocationMatch: true, driverLocationMatch: true,
  });

  const [cityCodesCache, setCityCodesCache] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState('');
  const [showBusModal, setShowBusModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [busSearchQuery, setBusSearchQuery] = useState('');
  const [driverSearchQuery, setDriverSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    routeId: '', routeCode: '', routeName: '',
    from: '', to: '', fromCode: '', toCode: '',
    busId: '', busNumber: '', driverId: '', driverName: '',
    departureTime: '08:00', arrivalTime: '',
    selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    startDate: '', endDate: '',
    repeatType: 'weekdays' as 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom',
    fare: '50', totalSeats: '40', distance: '', duration: '',
  });

  // ✅ formDataRef — avoid stale closure in checkAllConflicts
  const formDataRef = useRef(formData);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  const user = auth().currentUser;
  const effectiveTransporterId = routeTransporterId || user?.uid;

  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredBuses = useMemo(() => {
    const av = buses.filter(b => b.status === BUS_STATUS.AVAILABLE);
    if (!busSearchQuery) return av;
    return av.filter(b => b.busNumber.toLowerCase().includes(busSearchQuery.toLowerCase()));
  }, [buses, busSearchQuery]);

  const filteredDrivers = useMemo(() => {
    let av = drivers.filter(d => d.status === DRIVER_STATUS.AVAILABLE);
    if (driverSearchQuery)
      av = av.filter(d => d.fullName.toLowerCase().includes(driverSearchQuery.toLowerCase()));
    return av;
  }, [drivers, driverSearchQuery]);

  // ============================================================
  // Helpers
  // ============================================================
  const parseTimeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const parseDurationToMinutes = (s: string): number => {
    if (!s) return 0;
    const str = s.toLowerCase().trim();
    let total = 0;
    const hm = str.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/);
    if (hm) total += parseFloat(hm[1]) * 60;
    const mm = str.match(/(\d+)\s*m(?:in(?:utes?)?)?/);
    if (mm) total += parseInt(mm[1]);
    if (total === 0 && str.match(/^\d+$/)) total = parseInt(str);
    return Math.round(total);
  };

  const calculateArrivalTime = useCallback((dep: string, dur: string): string => {
    if (!dep || !dur) return '';
    const mins = parseDurationToMinutes(dur);
    if (!mins || mins > 24 * 60) return '';
    const [h, m] = dep.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    d.setMinutes(d.getMinutes() + mins);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  const validateFare = useCallback((fare: string) => {
    const n = Number(fare);
    if (isNaN(n) || n < MIN_FARE) return { valid: false, message: `Fare must be at least PKR ${MIN_FARE}` };
    if (n > MAX_FARE) return { valid: false, message: `Fare cannot exceed PKR ${MAX_FARE}` };
    return { valid: true };
  }, []);

  const validateSeats = useCallback((seats: string, busId: string) => {
    const n = Number(seats);
    if (isNaN(n) || n <= 0) return { valid: false, message: 'Please enter a valid number of seats' };
    const bus = busesRef.current.find(b => b.id === busId);
    if (bus && n > bus.capacity)
      return { valid: false, message: `Seats (${n}) cannot exceed bus capacity (${bus.capacity})` };
    return { valid: true };
  }, []);

  const validateStartDate = useCallback((dateStr: string) => {
    if (!dateStr) return { valid: true };
    // ✅ TIMEZONE FIX: string comparison only
    const todayStr = toLocalDateString(new Date());
    if (dateStr < todayStr) return { valid: false, message: 'Start date cannot be in the past' };
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_FUTURE_DAYS);
    if (dateStr > toLocalDateString(maxDate))
      return { valid: false, message: `Cannot schedule trips more than ${MAX_FUTURE_DAYS} days in advance` };
    return { valid: true };
  }, []);

  const validateDuration = useCallback((dep: string, arr: string) => {
    if (!dep || !arr) return { valid: true };
    let depM = parseTimeToMinutes(dep), arrM = parseTimeToMinutes(arr);
    if (arrM < depM) arrM += 1440;
    if ((arrM - depM) > MAX_TRIP_DURATION_HOURS * 60)
      return { valid: false, message: `Trip duration cannot exceed ${MAX_TRIP_DURATION_HOURS} hours` };
    return { valid: true };
  }, []);

  const validateAdvanceBooking = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return { valid: true };
    // ✅ TIMEZONE FIX: parse date parts manually
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const [h, m] = timeStr.split(':').map(Number);
    const tripDT = new Date(yr, mo - 1, dy, h, m, 0);
    const hoursDiff = (tripDT.getTime() - Date.now()) / 3600000;
    if (hoursDiff < MIN_ADVANCE_BOOKING_HOURS)
      return { valid: false, message: `Trips must be scheduled at least ${MIN_ADVANCE_BOOKING_HOURS} hours in advance` };
    return { valid: true };
  };

  // ============================================================
  // ✅ FULLY FIXED checkAllConflicts
  // KEY FIXES:
  // 1. tripsData param — no stale state dependency
  // 2. formDataRef — always latest formData in callback
  // 3. normDateStr — timezone-safe, string-only date comparison
  // 4. SINGLE-DAY FIX: direct time overlap per-trip (not prev/next logic)
  //    Old: find "previous" and "next" trip, then compare
  //    New: loop every relevant trip, check overlap + gap directly
  //    This catches single-day trips correctly
  // 5. days[] array AND single dayOfWeek string both handled
  // ============================================================
  const checkAllConflicts = useCallback(async (tripsData?: any[]) => {
    const fd = formDataRef.current;
    if (!effectiveTransporterId || !fd.departureTime || !fd.arrivalTime ||
        !fd.busId || !fd.driverId || !fd.routeId || !fd.startDate) return;

    try {
      let trips: any[] = [];
      if (tripsData && tripsData.length > 0) {
        trips = tripsData;
      } else if (existingTripsRef.current.length > 0) {
        trips = existingTripsRef.current;
      } else {
        const snap = await firestore().collection('trips')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', 'in', [TRIP_STATUS.SCHEDULED, TRIP_STATUS.IN_PROGRESS])
          .get();
        trips = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingTrips(trips);
        existingTripsRef.current = trips;
      }

      const v: ValidationState = {
        busAvailable: true, driverAvailable: true, routeFrequencyValid: true,
        fareValid: true, seatsValid: true, dateValid: true, durationValid: true,
        busLocationMatch: true, driverLocationMatch: true,
      };

      // Basic validations
      const fv = validateFare(fd.fare); v.fareValid = fv.valid; v.fareMessage = fv.message;
      const sv = validateSeats(fd.totalSeats, fd.busId); v.seatsValid = sv.valid; v.seatsMessage = sv.message;
      const dv = validateStartDate(fd.startDate); v.dateValid = dv.valid; v.dateMessage = dv.message;
      const av = validateAdvanceBooking(fd.startDate, fd.departureTime);
      if (!av.valid) { v.dateValid = false; v.dateMessage = av.message; setValidation(v); return; }
      if (fd.arrivalTime) {
        const durv = validateDuration(fd.departureTime, fd.arrivalTime);
        v.durationValid = durv.valid; v.durationMessage = durv.message;
      }

      // ✅ TIMEZONE FIX: plain string comparison — never new Date() for date compare
      const newStartStr = fd.startDate;
      const newEndStr = fd.endDate || fd.startDate;

      const newDepMins = parseTimeToMinutes(fd.departureTime);
      const newArrMins = parseTimeToMinutes(fd.arrivalTime);
      // Absolute minutes (overnight: arrival wraps to next day)
      const newArrMinsAbs = newArrMins < newDepMins ? newArrMins + 1440 : newArrMins;

      // ✅ FIXED: Filter relevant trips
      const relevant = trips.filter(t => {
        if (mode === 'edit' && trip?.id && t.id === trip.id) return false;

        // ✅ TIMEZONE FIX: normDateStr — handles string, Timestamp, Date
        const tStart = normDateStr(t.startDate) || normDateStr(t.date);
        const tEnd = normDateStr(t.endDate) || normDateStr(t.date) || tStart;
        if (!tStart) return false;

        // ✅ String comparison — timezone-safe for YYYY-MM-DD
        if (newStartStr > tEnd || newEndStr < tStart) return false;

        // ✅ FIXED: days array OR single dayOfWeek string
        const tDays: string[] = Array.isArray(t.days) && t.days.length > 0
          ? t.days
          : t.dayOfWeek ? [t.dayOfWeek] : [];

        if (tDays.length === 0) return true; // unknown days — include for safety
        return tDays.some((d: string) => fd.selectedDays.includes(d));
      });

      console.log(`🔍 Relevant: ${relevant.length} / ${trips.length} trips`);

      // ============================================================
      // ✅ SINGLE-DAY FIX: Check each relevant trip directly
      //
      // Old approach (BROKEN for single-day):
      //   1. Sort all trips
      //   2. Find "previous" and "next" trip relative to new trip
      //   3. Check gaps
      //   Problem: If existing trip has same date but found as neither
      //   "previous" nor "next" (e.g. same departure time), it was missed.
      //
      // New approach (FIXED):
      //   For every trip on the same date, check:
      //   (a) Direct time overlap
      //   (b) Gap before (existing ends before new starts)
      //   (c) Gap after (new ends before existing starts)
      //   This works for ALL cases: single-day, same-time, multi-day.
      // ============================================================
      for (const t of relevant) {
        const tDateStr = normDateStr(t.startDate) || normDateStr(t.date);

        // Only check trips that share a date with new trip
        // For multi-day schedules, startDate is the anchor for time conflicts
        if (tDateStr !== newStartStr) continue;

        const tDepMins = parseTimeToMinutes(t.departureTime);
        const tArrMins = parseTimeToMinutes(t.arrivalTime);
        const tArrMinsAbs = tArrMins < tDepMins ? tArrMins + 1440 : tArrMins;

        // ── BUS ──────────────────────────────────────────────────
        if (t.busId === fd.busId) {
          // (a) Direct overlap
          const overlaps = newDepMins < tArrMinsAbs && newArrMinsAbs > tDepMins;
          if (overlaps) {
            v.busAvailable = false;
            v.busMessage = `❌ Bus ${fd.busNumber} already has a trip ${t.departureTime}–${t.arrivalTime}`;
          } else {
            // (b) Existing ends, then new starts — check turnaround gap
            if (tArrMinsAbs <= newDepMins && v.busAvailable) {
              const gap = newDepMins - tArrMinsAbs;
              if (gap < BUS_TURNAROUND_MINUTES) {
                v.busAvailable = false;
                v.busMessage = `⚠️ Bus needs ${BUS_TURNAROUND_MINUTES} min turnaround (only ${gap} min gap after trip ending ${t.arrivalTime})`;
              } else if (t.to && fd.from && t.to !== fd.from) {
                v.busAvailable = false;
                v.busLocationMatch = false;
                v.busMessage = `❌ Bus arrives at ${t.to} but new trip departs from ${fd.from}`;
              }
            }
            // (c) New ends, then existing starts — check turnaround gap
            if (newArrMinsAbs <= tDepMins && v.busAvailable) {
              const gap = tDepMins - newArrMinsAbs;
              if (gap < BUS_TURNAROUND_MINUTES) {
                v.busAvailable = false;
                v.busMessage = `⚠️ Bus needs ${BUS_TURNAROUND_MINUTES} min turnaround before trip at ${t.departureTime} (only ${gap} min gap)`;
              } else if (fd.to && t.from && fd.to !== t.from) {
                v.busAvailable = false;
                v.busLocationMatch = false;
                v.busMessage = `❌ Bus arrives at ${fd.to} but next trip departs from ${t.from}`;
              }
            }
          }
        }

        // ── DRIVER ───────────────────────────────────────────────
        if (t.driverId === fd.driverId) {
          const overlaps = newDepMins < tArrMinsAbs && newArrMinsAbs > tDepMins;
          if (overlaps) {
            v.driverAvailable = false;
            v.driverMessage = `❌ Driver ${fd.driverName} already has a trip ${t.departureTime}–${t.arrivalTime}`;
          } else {
            if (tArrMinsAbs <= newDepMins && v.driverAvailable) {
              const gap = newDepMins - tArrMinsAbs;
              if (gap < DRIVER_REST_MINUTES) {
                v.driverAvailable = false;
                v.driverMessage = `⚠️ Driver needs ${DRIVER_REST_MINUTES} min rest (only ${gap} min gap after trip ending ${t.arrivalTime})`;
              } else if (t.to && fd.from && t.to !== fd.from) {
                v.driverAvailable = false;
                v.driverLocationMatch = false;
                v.driverMessage = `❌ Driver arrives at ${t.to} but new trip departs from ${fd.from}`;
              }
            }
            if (newArrMinsAbs <= tDepMins && v.driverAvailable) {
              const gap = tDepMins - newArrMinsAbs;
              if (gap < DRIVER_REST_MINUTES) {
                v.driverAvailable = false;
                v.driverMessage = `⚠️ Driver needs ${DRIVER_REST_MINUTES} min rest before trip at ${t.departureTime} (only ${gap} min gap)`;
              } else if (fd.to && t.from && fd.to !== t.from) {
                v.driverAvailable = false;
                v.driverLocationMatch = false;
                v.driverMessage = `❌ Driver arrives at ${fd.to} but next trip departs from ${t.from}`;
              }
            }
          }
        }

        // ── ROUTE FREQUENCY ──────────────────────────────────────
        if (t.routeId === fd.routeId && v.routeFrequencyValid) {
          const diff = Math.abs(newDepMins - tDepMins);
          if (diff < MIN_ROUTE_GAP_MINUTES) {
            v.routeFrequencyValid = false;
            v.routeFrequencyMessage = `⚠️ Same route trips must be ${MIN_ROUTE_GAP_MINUTES} min apart (existing at ${t.departureTime})`;
          }
        }
      }

      // ── OVERNIGHT: check next day ─────────────────────────────
      const isOvernight = newArrMins < newDepMins;
      if (isOvernight) {
        // ✅ TIMEZONE FIX: use parseLocalDate, then toLocalDateString
        const nextDayDate = parseLocalDate(newStartStr);
        nextDayDate.setDate(nextDayDate.getDate() + 1);
        const nextDayStr = toLocalDateString(nextDayDate);

        for (const t of relevant) {
          const tDateStr = normDateStr(t.startDate) || normDateStr(t.date);
          if (tDateStr !== nextDayStr) continue;
          const tDepMins = parseTimeToMinutes(t.departureTime);
          const gap = tDepMins - newArrMins;
          if (t.busId === fd.busId && gap < BUS_TURNAROUND_MINUTES) {
            v.busAvailable = false;
            v.busMessage = `⚠️ Overnight: Bus needs ${BUS_TURNAROUND_MINUTES} min turnaround before ${t.departureTime} next day`;
          }
          if (t.driverId === fd.driverId && gap < DRIVER_REST_MINUTES) {
            v.driverAvailable = false;
            v.driverMessage = `⚠️ Overnight: Driver needs ${DRIVER_REST_MINUTES} min rest before ${t.departureTime} next day`;
          }
        }
      }

      console.log('✅ Validation result:', JSON.stringify(v, null, 2));
      setValidation(v);
    } catch (err) {
      console.error('checkAllConflicts error:', err);
    }
  }, [effectiveTransporterId, mode, trip, validateFare, validateSeats, validateStartDate, validateDuration]);

  const fetchCityCode = useCallback(async (cityName: string): Promise<string> => {
    if (!cityName) return '';
    if (cityCodesCache[cityName]) return cityCodesCache[cityName];
    try {
      const snap = await firestore().collection('cities').where('name', '==', cityName).limit(1).get();
      if (!snap.empty) {
        const code = snap.docs[0].data().code || '';
        setCityCodesCache(prev => ({ ...prev, [cityName]: code }));
        return code;
      }
    } catch (e) { console.error('fetchCityCode error:', e); }
    return '';
  }, [cityCodesCache]);

  const generateTripSeats = async (tripId: string, totalSeats: number, fare: number) => {
    try {
      const db = firestore();
      const batch = db.batch();
      const seatsRef = db.collection('trips').doc(tripId).collection('seats');

      const rows = Math.ceil(totalSeats / 5);

      // ✅ FIXED: Seat counter track karo
      let seatCount = 0;

      for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= 5; col++) {

          // ✅ FIXED: Exactly totalSeats tak hi seats banao
          if (seatCount >= totalSeats) break;

          const seatNumber = `${row}${String.fromCharCode(64 + col)}`;
          const isWindow = col === 1 || col === 5;
          const isAisle = col === 3;

          batch.set(seatsRef.doc(seatNumber), {
            seatNumber,
            row,
            column: col,
            isBooked: false,
            status: 'available',
            price: row <= 2 ? Math.round(fare * 1.25) : fare,
            type: isWindow ? 'window' : isAisle ? 'aisle' : 'middle',
            isWindow,
            isAisle,
            isMiddle: !isWindow && !isAisle,
            hasExtraLegroom: row === 1,
            isWheelchairAccessible: row === rows && (col === 1 || col === 2),
            reservedBy: null,
            reservedUntil: null,
            bookingId: null,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

          seatCount++; // ✅ Counter badhao
        }
      }

      await batch.commit();
      console.log(`✅ Generated exactly ${seatCount} seats for trip ${tripId}`);
      return true;
    } catch (e) {
      console.error('generateTripSeats error:', e);
      return false;
    }
  };

  // ✅ TIMEZONE FIX: Use parseLocalDate, toLocalDateString throughout
  const generateTripsFromSchedule = useCallback((): any[] => {
    const trips: any[] = [];
    if (!formData.startDate) return trips;

    const current = parseLocalDate(formData.startDate);
    const end = formData.endDate ? parseLocalDate(formData.endDate) : parseLocalDate(formData.startDate);

    while (current <= end) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
      if (formData.selectedDays.includes(dayName)) {
        const totalSeatsNum = Number(formData.totalSeats);
        trips.push({
          scheduleId: null, scheduleTemplateId: null,
          // ✅ TIMEZONE FIX: toLocalDateString — not toISOString().split('T')[0]
          date: toLocalDateString(current),
          dayOfWeek: dayName,
          routeId: formData.routeId, routeCode: formData.routeCode,
          routeName: formData.routeName, from: formData.from, to: formData.to,
          fromCode: formData.fromCode, toCode: formData.toCode,
          distance: formData.distance, duration: formData.duration,
          busId: formData.busId, busNumber: formData.busNumber,
          driverId: formData.driverId, driverName: formData.driverName,
          departureTime: formData.departureTime, arrivalTime: formData.arrivalTime,
          fare: Number(formData.fare), totalSeats: totalSeatsNum,
          availableSeats: totalSeatsNum, heldSeats: 0,
          status: TRIP_STATUS.SCHEDULED,
          transporterId: effectiveTransporterId,
          estimatedRevenue: 0,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return trips;
  }, [formData, effectiveTransporterId]);

  const saveScheduleTemplate = useCallback(async (): Promise<string | null> => {
    try {
      const data = {
        routeId: formData.routeId, routeCode: formData.routeCode,
        routeName: formData.routeName, from: formData.from, to: formData.to,
        fromCode: formData.fromCode, toCode: formData.toCode,
        distance: formData.distance, duration: formData.duration,
        busId: formData.busId, busNumber: formData.busNumber,
        driverId: formData.driverId, driverName: formData.driverName,
        departureTime: formData.departureTime, arrivalTime: formData.arrivalTime,
        selectedDays: formData.selectedDays,
        // ✅ TIMEZONE FIX: noon time avoids DST/TZ boundary issues
        startDate: firestore.Timestamp.fromDate(parseLocalDate(formData.startDate)),
        endDate: formData.endDate ? firestore.Timestamp.fromDate(parseLocalDate(formData.endDate)) : null,
        repeatType: formData.repeatType,
        fare: Number(formData.fare), totalSeats: Number(formData.totalSeats),
        transporterId: effectiveTransporterId,
        status: SCHEDULE_STATUS.PUBLISHED,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      const ref = await firestore().collection('tripSchedules').add(data);
      return ref.id;
    } catch (e) { console.error('saveScheduleTemplate error:', e); return null; }
  }, [formData, effectiveTransporterId]);

  const saveGeneratedTrips = useCallback(async (
    trips: any[], scheduleId: string
  ): Promise<{ success: boolean; saved: number; failed: number }> => {
    let saved = 0, failed = 0;
    for (let i = 0; i < trips.length; i++) {
      try {
        const t = { ...trips[i], scheduleId, scheduleTemplateId: scheduleId };
        const ref = firestore().collection('trips').doc();
        await ref.set({ ...t, createdAt: firestore.FieldValue.serverTimestamp(), updatedAt: firestore.FieldValue.serverTimestamp() });
        await generateTripSeats(ref.id, t.totalSeats, t.fare);
        saved++;
        setGeneratedTripsCount(saved);
      } catch (e) { failed++; console.error(`Error saving trip ${i + 1}:`, e); }
    }
    return { success: failed === 0, saved, failed };
  }, []);

  // ✅ FIXED: fetchData — pass trips directly to checkAllConflicts after fetch
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !effectiveTransporterId) { setFetchingData(false); return; }
      setFetchingData(true);
      try {
        const routesSnap = await firestore().collection('routes')
          .where('transporterId', '==', effectiveTransporterId).get();
        const routesList = routesSnap.docs.map(doc => {
          const d = doc.data();
          return { id: doc.id, code: d.code || '', name: d.name || '', from: d.from || '', to: d.to || '', distance: d.distance || '', duration: d.duration || '', stops: d.stops || 0, fare: d.fare || 0, updatedAt: d.updatedAt } as Route;
        });
        setRoutes(routesList);

        const busesSnap = await firestore().collection('buses')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', '==', BUS_STATUS.AVAILABLE).get();
        const busesList = busesSnap.docs.map(doc => ({
          id: doc.id, busNumber: doc.data().busNumber || '',
          capacity: doc.data().capacity || 40, status: doc.data().status || BUS_STATUS.AVAILABLE,
        })) as FirebaseBus[];
        setBuses(busesList);
        busesRef.current = busesList;

        const driversSnap = await firestore().collection('drivers')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', '==', DRIVER_STATUS.AVAILABLE).get();
        const driversList = driversSnap.docs.map(doc => ({
          id: doc.id, fullName: doc.data().fullName || '',
          status: doc.data().status || DRIVER_STATUS.AVAILABLE,
          contactNumber: doc.data().contactNumber,
        })) as FirebaseDriver[];
        setDrivers(driversList);

        const tripsSnap = await firestore().collection('trips')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', 'in', [TRIP_STATUS.SCHEDULED, TRIP_STATUS.IN_PROGRESS]).get();
        const tripsList = tripsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingTrips(tripsList);
        existingTripsRef.current = tripsList;
        console.log(`✅ Loaded ${tripsList.length} existing trips`);

        if (mode === 'edit' && trip) {
          const fields: [string, any][] = [
            ['routeId', trip.routeId], ['routeCode', trip.routeCode],
            ['routeName', trip.routeName], ['from', trip.from], ['to', trip.to],
            ['fromCode', (trip as any).fromCode || ''], ['toCode', (trip as any).toCode || ''],
            ['busId', trip.busId], ['busNumber', trip.busNumber],
            ['driverId', trip.driverId], ['driverName', trip.driverName],
            ['departureTime', trip.departureTime || '08:00'], ['arrivalTime', trip.arrivalTime || ''],
            ['selectedDays', trip.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']],
            ['startDate', trip.startDate || ''], ['endDate', trip.endDate || ''],
            ['repeatType', (trip.repeatType as any) || 'weekdays'],
            ['fare', trip.fare?.toString() || '50'],
            ['totalSeats', trip.totalSeats?.toString() || '40'],
            ['distance', trip.distance?.toString() || ''], ['duration', trip.duration || ''],
          ];
          fields.forEach(([k, v]) => { if (v !== undefined && v !== null) updateField(k, v); });
        }

        if (preSelectedRoute && routesList.length > 0) {
          const sel = routesList.find(r => r.code === preSelectedRoute);
          if (sel) {
            const [fromCode, toCode] = await Promise.all([
              fetchCityCode(sel.from || ''), fetchCityCode(sel.to || ''),
            ]);
            setFormData(prev => ({
              ...prev,
              routeId: sel.id, routeCode: sel.code, routeName: sel.name,
              from: sel.from || '', to: sel.to || '', fromCode, toCode,
              fare: sel.fare?.toString() || '50',
              distance: sel.distance || '', duration: sel.duration || '',
            }));
          }
        }

        // ✅ After fetch: run conflict check with fresh trips directly
        setTimeout(() => {
          const fd = formDataRef.current;
          if (fd.departureTime && fd.arrivalTime && fd.busId && fd.driverId) {
            checkAllConflicts(tripsList);
          }
        }, 150);

      } catch (e) {
        console.error('fetchData error:', e);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setFetchingData(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, effectiveTransporterId]);

  useEffect(() => {
    if (formData.routeId && formData.departureTime && formData.duration) {
      const arr = calculateArrivalTime(formData.departureTime, formData.duration);
      if (arr && arr !== formData.arrivalTime) updateField('arrivalTime', arr);
    }
  }, [formData.routeId, formData.departureTime, formData.duration]);

  useEffect(() => {
    if (formData.repeatType === 'custom') return;
    const map: Record<string, string[]> = {
      daily: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      weekends: ['Sat', 'Sun'],
      weekly: formData.selectedDays.length > 0 ? [formData.selectedDays[0]] : ['Mon'],
    };
    const nd = map[formData.repeatType] || formData.selectedDays;
    if (JSON.stringify(nd) !== JSON.stringify(formData.selectedDays)) updateField('selectedDays', nd);
  }, [formData.repeatType]);

  // ✅ FIXED: Debounced conflict check — ref gives latest trips, no stale state
  useEffect(() => {
    const id = setTimeout(() => {
      if (formData.departureTime && formData.arrivalTime) {
        checkAllConflicts(existingTripsRef.current.length > 0 ? existingTripsRef.current : undefined);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [
    formData.busId, formData.driverId, formData.routeId,
    formData.departureTime, formData.arrivalTime, formData.selectedDays,
    formData.startDate, formData.endDate, formData.fare, formData.totalSeats,
    checkAllConflicts,
  ]);

  // Date/Time picker handlers
  const handleDatePress = (field: string) => {
    setCurrentDateField(field);
    const val = formData[field as keyof typeof formData];
    // ✅ TIMEZONE FIX: parse date parts manually
    if (val && typeof val === 'string' && val.length === 10) {
      setSelectedDate(parseLocalDate(val));
    } else {
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      // ✅ TIMEZONE FIX
      updateField(currentDateField, toLocalDateString(date));
    }
  };

  const handleAndroidDateConfirm = () => {
    updateField(currentDateField, toLocalDateString(selectedDate));
    setShowDatePicker(false);
  };

  const handleTimePress = (field: string) => {
    setCurrentTimeField(field);
    const val = formData[field as keyof typeof formData];
    if (val && typeof val === 'string' && val.includes(':')) {
      const [h, m] = val.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0); setSelectedDate(d);
    } else setSelectedDate(new Date());
    setShowTimePicker(true);
  };

  const fmtTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const handleTimeChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) {
      setSelectedDate(date);
      const t = fmtTime(date);
      if (currentTimeField === 'departureTime') {
        updateField('departureTime', t);
        if (formData.duration) { const a = calculateArrivalTime(t, formData.duration); if (a) updateField('arrivalTime', a); }
      } else updateField('arrivalTime', t);
    }
  };

  const handleAndroidTimeConfirm = () => {
    const t = fmtTime(selectedDate);
    if (currentTimeField === 'departureTime') {
      updateField('departureTime', t);
      if (formData.duration) { const a = calculateArrivalTime(t, formData.duration); if (a) updateField('arrivalTime', a); }
    } else updateField('arrivalTime', t);
    setShowTimePicker(false);
  };

  const handleBusSelect = (bus: FirebaseBus) => {
    updateField('busId', bus.id);
    updateField('busNumber', bus.busNumber);
    updateField('totalSeats', Math.min(bus.capacity, 40).toString());
    setShowBusModal(false);
  };

  const handleDriverSelect = (driver: FirebaseDriver) => {
    updateField('driverId', driver.id);
    updateField('driverName', driver.fullName);
    setShowDriverModal(false);
  };

  const validateTimes = (): boolean => {
    if (!formData.departureTime) { Alert.alert('Error', 'Please select departure time'); return false; }
    if (!formData.arrivalTime) { Alert.alert('Error', 'Arrival time is required'); return false; }
    let dep = parseTimeToMinutes(formData.departureTime), arr = parseTimeToMinutes(formData.arrivalTime);
    if (arr < dep) arr += 1440;
    if (arr <= dep) { Alert.alert('Error', 'Arrival time must be after departure time'); return false; }
    return true;
  };

  const validateDates = (): boolean => {
    if (formData.startDate) {
      const r = validateStartDate(formData.startDate);
      if (!r.valid) { Alert.alert('Error', r.message); return false; }
    }
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      Alert.alert('Error', 'End date must be after start date'); return false;
    }
    return true;
  };

  const validateDays = (): boolean => {
    if (!formData.selectedDays.length) { Alert.alert('Error', 'Please select at least one day'); return false; }
    return true;
  };

  const executeTripGeneration = useCallback(async (trips: any[]) => {
    setIsGeneratingTrips(true); setGeneratedTrips(trips); setGeneratedTripsCount(0); setLoading(true);
    try {
      const scheduleId = await saveScheduleTemplate();
      if (!scheduleId) throw new Error('Failed to save schedule template');
      const result = await saveGeneratedTrips(trips, scheduleId);
      if (result.success) {
        Alert.alert('Success', `✅ Schedule created!\n\n📋 ID: ${scheduleId}\n🚌 ${result.saved} trips scheduled`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Partial Success', `⚠️ Some trips failed.\n✅ Saved: ${result.saved}\n❌ Failed: ${result.failed}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e: any) {
      Alert.alert('Error', `Failed to create schedule: ${e.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingTrips(false); setLoading(false); setGeneratedTripsCount(0);
    }
  }, [saveScheduleTemplate, saveGeneratedTrips, navigation]);

  const handleSubmit = async () => {
    if (loading || isGeneratingTrips) return;
    if (!user || !effectiveTransporterId) { Alert.alert('Error', 'You must be logged in'); return; }
    if (!formData.arrivalTime) { Alert.alert('Error', 'Arrival time is required'); return; }
    if (!validateTimes() || !validateDates() || !validateDays()) return;
    if (!validation.fareValid) { Alert.alert('Invalid Fare', validation.fareMessage); return; }
    if (!validation.seatsValid) { Alert.alert('Invalid Seats', validation.seatsMessage); return; }
    if (!validation.durationValid) { Alert.alert('Invalid Duration', validation.durationMessage); return; }
    if (!validation.routeFrequencyValid) { Alert.alert('Route Conflict', validation.routeFrequencyMessage); return; }
    if (!validation.busLocationMatch) { Alert.alert('Bus Location Conflict', validation.busMessage); return; }
    if (!validation.driverLocationMatch) { Alert.alert('Driver Location Conflict', validation.driverMessage); return; }
    if (!validation.busAvailable) { Alert.alert('Bus Unavailable', validation.busMessage); return; }
    if (!validation.driverAvailable) { Alert.alert('Driver Unavailable', validation.driverMessage); return; }

    const trips = generateTripsFromSchedule();
    if (!trips.length) { Alert.alert('Error', 'No trips to schedule. Check your date range and selected days.'); return; }

    Alert.alert('Confirm Schedule',
      `📅 This will create ${trips.length} trip${trips.length > 1 ? 's' : ''}.\n\n` +
      `🗓️ Date: ${formData.endDate ? `${formData.startDate} to ${formData.endDate}` : formData.startDate}\n` +
      `📆 Days: ${formData.selectedDays.join(', ')}\n⏰ Departure: ${formData.departureTime}\n` +
      `🚌 Bus: ${formData.busNumber}\n👤 Driver: ${formData.driverName}\n\n` +
      `💰 Fare: PKR ${formData.fare}\n💺 Seats: ${formData.totalSeats}\n\nContinue?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => executeTripGeneration(trips) }]
    );
  };

  const estimatedRevenue = useMemo(
    () => Math.floor(Number(formData.totalSeats) * 0.8) * Number(formData.fare),
    [formData.fare, formData.totalSeats]
  );
  const tripsToGenerate = useMemo(() => generateTripsFromSchedule(), [generateTripsFromSchedule]);

  const handleNextStep = async () => {
    if (step === 1 && !formData.routeId) { Alert.alert('Error', 'Please select a route'); return; }
    if (step === 2) {
      if (!validateTimes() || !validateDates() || !validateDays()) return;
      if (!validation.fareValid) { Alert.alert('Warning', validation.fareMessage); return; }
      if (!validation.durationValid && formData.arrivalTime) { Alert.alert('Warning', validation.durationMessage); return; }
    }
    if (step === 3) {
      if (!formData.busId || !formData.driverId) { Alert.alert('Error', 'Please select both bus and driver'); return; }
      if (!validation.busAvailable) { Alert.alert('Bus Unavailable', validation.busMessage); return; }
      if (!validation.driverAvailable) { Alert.alert('Driver Unavailable', validation.driverMessage); return; }
      if (!validation.busLocationMatch) { Alert.alert('Bus Location Conflict', validation.busMessage); return; }
      if (!validation.driverLocationMatch) { Alert.alert('Driver Location Conflict', validation.driverMessage); return; }
      if (!validation.routeFrequencyValid) { Alert.alert('Route Conflict', validation.routeFrequencyMessage); return; }
    }
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1); else navigation.goBack();
  };

  // ============================================================
  // Render Steps
  // ============================================================
  const renderRouteItem = useCallback(({ item }: { item: Route }) => (
    <TouchableOpacity
      style={[styles.routeCard, formData.routeId === item.id && styles.selectedCard]}
      onPress={() => {
        updateField('routeId', item.id); updateField('routeCode', item.code || '');
        updateField('routeName', item.name || ''); updateField('from', item.from || '');
        updateField('to', item.to || ''); updateField('fare', item.fare?.toString() || '50');
        updateField('distance', item.distance || ''); updateField('duration', item.duration || '');
        fetchCityCode(item.from || '').then(c => updateField('fromCode', c));
        fetchCityCode(item.to || '').then(c => updateField('toCode', c));
      }}
    >
      <View style={styles.routeHeader}>
        <Text style={styles.routeCode}>{item.code}</Text>
        <Text style={styles.routeFare}>PKR {item.fare}</Text>
      </View>
      <Text style={styles.routeName}>{item.name}</Text>
      {item.from && item.to && <Text style={styles.routePath}>{item.from} → {item.to}</Text>}
      <View style={styles.routeDetails}>
        <Text style={styles.routeDetail}>📏 {item.distance}</Text>
        <Text style={styles.routeDetail}>⏱️ {item.duration}</Text>
      </View>
    </TouchableOpacity>
  ), [formData.routeId, updateField, fetchCityCode]);

  const renderStep1 = () => (
    <View style={{ flex: 1 }}>
      <Text style={styles.stepTitle}>Select Route</Text>
      {routes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🛣️</Text>
          <Text style={styles.emptyStateText}>No routes available</Text>
          <TouchableOpacity style={styles.emptyStateButton}
            onPress={() => navigation.navigate('OperationsMain' as never, { openCreateRoute: true } as never)}>
            <Text style={styles.emptyStateButtonText}>Create Route</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={routes} keyExtractor={i => i.id} renderItem={renderRouteItem} showsVerticalScrollIndicator={false} />
      )}
    </View>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Schedule Details</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Departure Time *</Text>
        <TouchableOpacity style={styles.dateInput} onPress={() => handleTimePress('departureTime')}>
          <Text style={formData.departureTime ? styles.dateSelectedText : styles.datePlaceholderText}>
            {formData.departureTime || 'Select time'}
          </Text>
          <Text style={styles.calendarIcon}>⏰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Arrival Time *</Text>
        <TouchableOpacity style={[styles.dateInput, !formData.arrivalTime && styles.requiredField]}
          onPress={() => handleTimePress('arrivalTime')}>
          <Text style={formData.arrivalTime ? styles.dateSelectedText : styles.datePlaceholderText}>
            {formData.arrivalTime || 'Auto-calculated from route duration'}
          </Text>
          <Text style={styles.calendarIcon}>⏰</Text>
        </TouchableOpacity>
        {!validation.durationValid && validation.durationMessage && (
          <Text style={styles.errorText}>{validation.durationMessage}</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Repeat Pattern</Text>
        <View style={styles.repeatOptions}>
          {[{ id: 'daily', label: 'Daily' }, { id: 'weekdays', label: 'Weekdays' },
            { id: 'weekends', label: 'Weekends' }, { id: 'weekly', label: 'Weekly' },
            { id: 'custom', label: 'Custom' }].map(type => (
            <TouchableOpacity key={type.id}
              style={[styles.repeatButton, formData.repeatType === type.id && styles.repeatButtonSelected]}
              onPress={() => updateField('repeatType', type.id)}>
              <Text style={[styles.repeatText, formData.repeatType === type.id && styles.repeatTextSelected]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {formData.repeatType === 'custom' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Days *</Text>
          <View style={styles.daysContainer}>
            {daysOfWeek.map(day => (
              <TouchableOpacity key={day}
                style={[styles.dayButton, formData.selectedDays.includes(day) && styles.dayButtonSelected]}
                onPress={() => {
                  if (formData.selectedDays.includes(day))
                    updateField('selectedDays', formData.selectedDays.filter(d => d !== day));
                  else updateField('selectedDays', [...formData.selectedDays, day]);
                }}>
                <Text style={[styles.dayButtonText, formData.selectedDays.includes(day) && styles.dayButtonTextSelected]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {formData.selectedDays.length === 0 && <Text style={styles.errorText}>Please select at least one day</Text>}
        </View>
      )}

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Start Date *</Text>
          <TouchableOpacity style={[styles.dateInput, !validation.dateValid && styles.invalidInput]}
            onPress={() => handleDatePress('startDate')}>
            <Text style={formData.startDate ? styles.dateSelectedText : styles.datePlaceholderText}>
              {formData.startDate || 'Select date'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
          {!validation.dateValid && validation.dateMessage && (
            <Text style={styles.errorText}>{validation.dateMessage}</Text>
          )}
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => handleDatePress('endDate')}>
            <Text style={formData.endDate ? styles.dateSelectedText : styles.datePlaceholderText}>
              {formData.endDate || 'Optional'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fare per Passenger (PKR) *</Text>
        <TextInput style={[styles.input, !validation.fareValid && styles.invalidInput]}
          placeholder="50" value={formData.fare}
          onChangeText={t => updateField('fare', t)} keyboardType="numeric" />
        {!validation.fareValid && validation.fareMessage && <Text style={styles.errorText}>{validation.fareMessage}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Seats *</Text>
        <TextInput style={[styles.input, !validation.seatsValid && styles.invalidInput]}
          placeholder="40" value={formData.totalSeats}
          onChangeText={t => updateField('totalSeats', t)} keyboardType="numeric" />
        {!validation.seatsValid && validation.seatsMessage && <Text style={styles.errorText}>{validation.seatsMessage}</Text>}
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Assign Resources</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Bus *</Text>
        <TouchableOpacity style={styles.selectionCard} onPress={() => setShowBusModal(true)}>
          <View style={styles.selectionCardContent}>
            <Text style={styles.selectionIcon}>🚌</Text>
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionLabel}>Tap to select bus</Text>
              {formData.busId
                ? <Text style={styles.selectionValue}>{formData.busNumber} ({formData.totalSeats} seats)</Text>
                : <Text style={styles.selectionPlaceholder}>No bus selected</Text>}
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
        {!validation.busAvailable && validation.busMessage && (
          <View style={styles.warningBox}><Text style={styles.warningText}>{validation.busMessage}</Text></View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Driver *</Text>
        <TouchableOpacity style={styles.selectionCard} onPress={() => setShowDriverModal(true)}>
          <View style={styles.selectionCardContent}>
            <Text style={styles.selectionIcon}>👤</Text>
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionLabel}>Tap to select driver</Text>
              {formData.driverId
                ? <Text style={styles.selectionValue}>{formData.driverName}</Text>
                : <Text style={styles.selectionPlaceholder}>No driver selected</Text>}
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
        {!validation.driverAvailable && validation.driverMessage && (
          <View style={styles.warningBox}><Text style={styles.warningText}>{validation.driverMessage}</Text></View>
        )}
      </View>

      {!validation.routeFrequencyValid && validation.routeFrequencyMessage && (
        <View style={styles.warningBox}><Text style={styles.warningText}>{validation.routeFrequencyMessage}</Text></View>
      )}
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Confirmation</Text>
      <View style={styles.confirmationCard}>
        <Text style={styles.confirmationTitle}>Trip Details</Text>
        {[
          { label: 'Route:', value: formData.routeName },
          formData.from && formData.to ? { label: 'From/To:', value: `${formData.from} → ${formData.to}` } : null,
          { label: 'Bus:', value: formData.busNumber },
          { label: 'Driver:', value: formData.driverName },
          { label: 'Departure:', value: formData.departureTime },
          { label: 'Arrival:', value: formData.arrivalTime || 'Not set' },
          { label: 'Days:', value: formData.selectedDays.join(', ') },
          { label: 'Start Date:', value: formData.startDate || 'Not set' },
          { label: 'End Date:', value: formData.endDate || 'Not set' },
          { label: 'Fare:', value: `PKR ${formData.fare}` },
          { label: 'Total Seats:', value: formData.totalSeats },
        ].filter(Boolean).map((item: any, i) => (
          <View key={i} style={styles.confirmationDetail}>
            <Text style={styles.confirmationLabel}>{item.label}</Text>
            <Text style={styles.confirmationValue}>{item.value}</Text>
          </View>
        ))}
        <View style={styles.tripCountCard}>
          <Text style={styles.tripCountTitle}>📅 Schedule Summary</Text>
          <Text style={styles.tripCountValue}>
            {tripsToGenerate.length} trip{tripsToGenerate.length !== 1 ? 's' : ''} will be created
          </Text>
        </View>
        <View style={styles.revenueEstimate}>
          <Text style={styles.revenueTitle}>Estimated Daily Revenue</Text>
          <Text style={styles.revenueValue}>PKR {estimatedRevenue.toLocaleString()}</Text>
        </View>
      </View>
    </ScrollView>
  );

  if (fetchingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevStep}>
          <Text style={styles.backButton}>{step === 1 ? '←' : '← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {mode === 'add' ? 'Schedule Trip' : mode === 'edit' ? 'Edit Trip' : 'Trip Details'}
        </Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step {step}/4</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </KeyboardAvoidingView>

      {showDatePicker && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={selectedDate} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange} />
              {Platform.OS === 'android' && (
                <View style={styles.androidButtons}>
                  <TouchableOpacity style={styles.androidButtonCancel} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.androidButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.androidButtonConfirm} onPress={handleAndroidDateConfirm}>
                    <Text style={[styles.androidButtonText, styles.confirmButtonText]}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {showTimePicker && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setShowTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={selectedDate} mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange} />
              {Platform.OS === 'android' && (
                <View style={styles.androidButtons}>
                  <TouchableOpacity style={styles.androidButtonCancel} onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.androidButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.androidButtonConfirm} onPress={handleAndroidTimeConfirm}>
                    <Text style={[styles.androidButtonText, styles.confirmButtonText]}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {showBusModal && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setShowBusModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentFull}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Bus</Text>
                <TouchableOpacity onPress={() => setShowBusModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalSearch}>
                <TextInput style={styles.modalSearchInput} placeholder="🔍 Search bus..."
                  placeholderTextColor={COLORS.textLighter} value={busSearchQuery} onChangeText={setBusSearchQuery} />
              </View>
              <FlatList data={filteredBuses} keyExtractor={i => i.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, formData.busId === item.id && styles.modalItemSelected]}
                    onPress={() => handleBusSelect(item)}>
                    <View style={styles.modalItemContent}>
                      <Text style={styles.modalItemIcon}>🚌</Text>
                      <View style={styles.modalItemInfo}>
                        <Text style={styles.modalItemTitle}>{item.busNumber}</Text>
                        <Text style={styles.modalItemSubtitle}>Capacity: {item.capacity} seats</Text>
                      </View>
                      {formData.busId === item.id && <Text style={styles.modalItemCheck}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<View style={styles.modalEmpty}><Text style={styles.modalEmptyIcon}>🚌</Text><Text style={styles.modalEmptyText}>No available buses</Text></View>}
              />
            </View>
          </View>
        </Modal>
      )}

      {showDriverModal && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setShowDriverModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentFull}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Driver</Text>
                <TouchableOpacity onPress={() => setShowDriverModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalSearch}>
                <TextInput style={styles.modalSearchInput} placeholder="🔍 Search driver..."
                  placeholderTextColor={COLORS.textLighter} value={driverSearchQuery} onChangeText={setDriverSearchQuery} />
              </View>
              <FlatList data={filteredDrivers} keyExtractor={i => i.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, formData.driverId === item.id && styles.modalItemSelected]}
                    onPress={() => handleDriverSelect(item)}>
                    <View style={styles.modalItemContent}>
                      <Text style={styles.modalItemIcon}>👤</Text>
                      <View style={styles.modalItemInfo}>
                        <Text style={styles.modalItemTitle}>{item.fullName}</Text>
                        <Text style={styles.modalItemSubtitle}>Available</Text>
                      </View>
                      {formData.driverId === item.id && <Text style={styles.modalItemCheck}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<View style={styles.modalEmpty}><Text style={styles.modalEmptyIcon}>👤</Text><Text style={styles.modalEmptyText}>No available drivers</Text></View>}
              />
            </View>
          </View>
        </Modal>
      )}

      {isGeneratingTrips && (
        <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
          <View style={styles.progressModalOverlay}>
            <View style={styles.progressModalContainer}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
              <Text style={styles.progressModalTitle}>Creating Trips...</Text>
              <Text style={styles.progressModalText}>Generating {generatedTrips.length} trip{generatedTrips.length !== 1 ? 's' : ''}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, {
                  width: `${generatedTrips.length > 0 ? (generatedTripsCount / generatedTrips.length) * 100 : 0}%`
                }]} />
              </View>
              <Text style={styles.progressModalCount}>{generatedTripsCount} / {generatedTrips.length} completed</Text>
            </View>
          </View>
        </Modal>
      )}

      {mode !== 'view' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.nextButton]} onPress={handleNextStep} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.nextButtonText}>{step === 4 ? 'Confirm Schedule' : 'Next'}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: SIZES.sm, fontSize: 16, color: COLORS.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.md, paddingVertical: SIZES.lg, backgroundColor: COLORS.primary },
  backButton: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  stepIndicator: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: 20 },
  stepText: { fontSize: 12, color: COLORS.white, fontWeight: '600' },
  progressBar: { height: 4, backgroundColor: COLORS.border },
  progressFill: { height: '100%', backgroundColor: COLORS.success },
  contentContainer: { flex: 1, padding: SIZES.md },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginBottom: SIZES.lg },
  emptyState: { alignItems: 'center', padding: SIZES.xxxl },
  emptyStateIcon: { fontSize: 48, marginBottom: SIZES.md },
  emptyStateText: { fontSize: 16, color: COLORS.textLight, marginBottom: SIZES.lg },
  emptyStateButton: { backgroundColor: COLORS.secondary, paddingHorizontal: SIZES.xl, paddingVertical: SIZES.sm, borderRadius: SIZES.xs },
  emptyStateButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  routeCard: { backgroundColor: COLORS.white, borderRadius: SIZES.md, padding: SIZES.md, marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  selectedCard: { backgroundColor: COLORS.infoLight, borderColor: COLORS.secondary },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.xs },
  routeCode: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  routeFare: { fontSize: 16, fontWeight: '700', color: COLORS.success },
  routeName: { fontSize: 16, color: COLORS.text, marginBottom: 4 },
  routePath: { fontSize: 14, color: COLORS.textLight, marginBottom: SIZES.sm },
  routeDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  routeDetail: { fontSize: 12, color: COLORS.textLight },
  inputGroup: { marginBottom: SIZES.lg },
  label: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SIZES.xs },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.xs, padding: SIZES.sm, fontSize: 16, backgroundColor: COLORS.white, color: COLORS.text },
  invalidInput: { borderColor: COLORS.danger, borderWidth: 2 },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
  dateInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.xs, padding: SIZES.sm, backgroundColor: COLORS.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requiredField: { borderColor: COLORS.secondary, borderWidth: 2 },
  dateSelectedText: { fontSize: 16, color: COLORS.text },
  datePlaceholderText: { fontSize: 16, color: COLORS.textLighter },
  calendarIcon: { fontSize: 20, color: COLORS.secondary },
  repeatOptions: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  repeatButton: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.xs, margin: 4, backgroundColor: COLORS.white },
  repeatButtonSelected: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  repeatText: { fontSize: 14, color: COLORS.text },
  repeatTextSelected: { color: COLORS.white, fontWeight: '600' },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayButton: { width: '14%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.xs, marginBottom: SIZES.xs, backgroundColor: COLORS.white },
  dayButtonSelected: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  dayButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  dayButtonTextSelected: { color: COLORS.white },
  row: { flexDirection: 'row' },
  selectionCard: { backgroundColor: COLORS.white, borderRadius: SIZES.md, borderWidth: 1, borderColor: COLORS.border, padding: SIZES.md },
  selectionCardContent: { flexDirection: 'row', alignItems: 'center' },
  selectionIcon: { fontSize: 32, marginRight: SIZES.md },
  selectionInfo: { flex: 1 },
  selectionLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  selectionValue: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  selectionPlaceholder: { fontSize: 14, color: COLORS.textLighter, fontStyle: 'italic' },
  chevron: { fontSize: 28, color: COLORS.textLight, fontWeight: '300' },
  warningBox: { marginTop: SIZES.sm, backgroundColor: '#FFF3E0', borderRadius: SIZES.xs, padding: SIZES.sm, borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  warningText: { fontSize: 13, color: COLORS.warningDark },
  confirmationCard: { backgroundColor: COLORS.white, borderRadius: SIZES.md, padding: SIZES.lg, borderWidth: 1, borderColor: COLORS.border },
  confirmationTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginBottom: SIZES.lg, textAlign: 'center' },
  confirmationDetail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SIZES.sm, paddingBottom: SIZES.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  confirmationLabel: { fontSize: 16, color: COLORS.textLight },
  confirmationValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  tripCountCard: { backgroundColor: '#E8F0FE', borderRadius: SIZES.md, padding: SIZES.md, marginTop: SIZES.md, alignItems: 'center' },
  tripCountTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: SIZES.xs },
  tripCountValue: { fontSize: 28, fontWeight: '700', color: COLORS.secondary, marginBottom: 4 },
  revenueEstimate: { backgroundColor: '#E8F5E8', borderRadius: SIZES.md, padding: SIZES.md, marginTop: SIZES.lg, alignItems: 'center' },
  revenueTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: SIZES.xs },
  revenueValue: { fontSize: 24, fontWeight: '700', color: COLORS.success, marginBottom: 4 },
  actionButtons: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.lg, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionButton: { paddingVertical: SIZES.md, borderRadius: SIZES.xs, alignItems: 'center' },
  nextButton: { backgroundColor: COLORS.secondary },
  nextButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: SIZES.lg, borderTopRightRadius: SIZES.lg, paddingBottom: SIZES.lg },
  modalContentFull: { flex: 1, backgroundColor: COLORS.white, marginTop: 60, borderTopLeftRadius: SIZES.lg, borderTopRightRadius: SIZES.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  modalClose: { fontSize: 24, color: COLORS.textLight, padding: 4 },
  modalSearch: { padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalSearchInput: { backgroundColor: COLORS.background, borderRadius: SIZES.xs, padding: SIZES.sm, fontSize: 16, color: COLORS.text },
  modalItem: { paddingVertical: SIZES.md, paddingHorizontal: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemSelected: { backgroundColor: COLORS.infoLight },
  modalItemContent: { flexDirection: 'row', alignItems: 'center' },
  modalItemIcon: { fontSize: 28, marginRight: SIZES.md },
  modalItemInfo: { flex: 1 },
  modalItemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  modalItemSubtitle: { fontSize: 12, color: COLORS.textLight },
  modalItemCheck: { fontSize: 20, color: COLORS.success, fontWeight: 'bold' },
  modalEmpty: { alignItems: 'center', padding: SIZES.xxxl },
  modalEmptyIcon: { fontSize: 48, marginBottom: SIZES.md },
  modalEmptyText: { fontSize: 16, color: COLORS.textLight },
  androidButtons: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: SIZES.md, paddingTop: SIZES.sm },
  androidButtonCancel: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, marginRight: SIZES.sm },
  androidButtonConfirm: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, backgroundColor: COLORS.secondary, borderRadius: SIZES.xs },
  androidButtonText: { fontSize: 16, color: COLORS.text },
  confirmButtonText: { color: COLORS.white, fontWeight: '600' },
  progressModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  progressModalContainer: { backgroundColor: COLORS.white, borderRadius: SIZES.lg, padding: SIZES.xl, width: '80%', alignItems: 'center' },
  progressModalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginTop: SIZES.md, marginBottom: SIZES.sm },
  progressModalText: { fontSize: 14, color: COLORS.textLight, marginBottom: SIZES.lg },
  progressBarContainer: { width: '100%', height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: SIZES.md },
  progressBarFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 4 },
  progressModalCount: { fontSize: 12, color: COLORS.textLight },
});

export default ScheduleTripScreen;