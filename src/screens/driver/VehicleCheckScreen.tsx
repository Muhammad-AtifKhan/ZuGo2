// src/screens/driver/VehicleCheckScreen.tsx - STANDARDIZED STATUSES
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// ✅ Import standardized status constants
import {
  BUS_STATUS,
  BUS_STATUS_CONFIG,
  DRIVER_STATUS,
  DRIVER_STATUS_CONFIG,
  TRIP_STATUS,
  TRIP_STATUS_CONFIG,
} from '../../constants/status';

type VehicleCheckScreenProps = {
  navigation: StackNavigationProp<any>;
  route?: any;
};

// ✅ Issue severity (can keep local or move to constants)
const ISSUE_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Checklist items with fixed IDs
const CHECKLIST_ITEMS = [
  { id: 'fuel', title: 'Fuel Level', category: 'mechanical', description: 'Check fuel gauge - should be at least half tank' },
  { id: 'tyres', title: 'Tire Pressure', category: 'exterior', description: 'Check all tires for proper inflation' },
  { id: 'lights', title: 'Lights', category: 'exterior', description: 'Headlights, brake lights, indicators, interior lights' },
  { id: 'brakes', title: 'Brakes', category: 'mechanical', description: 'Test brake pedal response and emergency brake' },
  { id: 'engineOil', title: 'Engine Oil', category: 'mechanical', description: 'Check oil level using dipstick' },
  { id: 'firstAid', title: 'First Aid Kit', category: 'safety', description: 'Verify kit is present and fully stocked' },
  { id: 'fireExtinguisher', title: 'Fire Extinguisher', category: 'safety', description: 'Check pressure gauge and expiry date' },
  { id: 'emergencyTools', title: 'Emergency Tools', category: 'safety', description: 'Triangle, spare tire, jack, tools' },
  { id: 'cleanliness', title: 'Cleanliness', category: 'interior', description: 'Interior and exterior cleanliness' },
  { id: 'documents', title: 'Documents', category: 'documents', description: 'Registration, insurance, permits, license' },
];

interface ChecklistItem {
  id: string;
  title: string;
  checked: boolean;
  description?: string;
  category: string;
}

interface VehicleCheck {
  id: string;
  driverId: string;
  driverName: string;
  tripId?: string;
  busId: string;
  busNumber: string;
  checkDate: any;
  checkType: 'pre-trip' | 'post-trip' | 'weekly' | 'incident';
  items: ChecklistItem[];
  passed: boolean;
  issues?: any[];
  odometerReading?: number;
  fuelLevel?: number;
  notes?: string;
  completedAt: any;
}

const VehicleCheckScreen: React.FC<VehicleCheckScreenProps> = ({ navigation, route }) => {
  const user = auth().currentUser;
  const dutyId = route?.params?.dutyId;
  const tripId = route?.params?.tripId;
  const dutyDetails = route?.params?.dutyDetails;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverUid, setDriverUid] = useState<string>('');
  const [busInfo, setBusInfo] = useState<{ id: string; number: string; model?: string } | null>(null);
  const [tripData, setTripData] = useState<any>(null);
  const [tripBusInfo, setTripBusInfo] = useState<{ id: string; number: string } | null>(null);

  const isStartDutyFlow = !!dutyId || !!tripId;
  const [tripValidated, setTripValidated] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [odometerReading, setOdometerReading] = useState('');
  const [odometerError, setOdometerError] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [fuelError, setFuelError] = useState('');
  const [notes, setNotes] = useState('');

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recentChecks, setRecentChecks] = useState<VehicleCheck[]>([]);

  // Derive allChecked from checklist
  const allChecked = checklist.length > 0 && checklist.every(item => item.checked);
  const checkedCount = checklist.filter(item => item.checked).length;
  const totalCount = checklist.length;

  // Initialize checklist with unchecked items
  useEffect(() => {
    setChecklist(CHECKLIST_ITEMS.map(item => ({ ...item, checked: false })));
  }, []);

  // Validate odometer reading
  const validateOdometer = (value: string): boolean => {
    if (!value) return true;
    const num = parseInt(value);
    if (isNaN(num)) {
      setOdometerError('Please enter a valid number');
      return false;
    }
    if (num < 0) {
      setOdometerError('Odometer cannot be negative');
      return false;
    }
    setOdometerError('');
    return true;
  };

  // Validate fuel level
  const validateFuel = (value: string): boolean => {
    if (!value) return true;
    const num = parseInt(value);
    if (isNaN(num)) {
      setFuelError('Please enter a valid number');
      return false;
    }
    if (num < 0 || num > 100) {
      setFuelError('Fuel level must be between 0 and 100');
      return false;
    }
    setFuelError('');
    return true;
  };

  // Get correct driver UID
  const getDriverUid = useCallback(async (authUid: string) => {
    try {
      const driverDoc = await firestore().collection('drivers').doc(authUid).get();
      if (driverDoc.exists) {
        setDriverUid(authUid);
        return authUid;
      } else {
        const userDoc = await firestore().collection('users').doc(authUid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const driverQuery = await firestore()
            .collection('drivers')
            .where('email', '==', userData?.email)
            .limit(1)
            .get();
          if (!driverQuery.empty) {
            const driverId = driverQuery.docs[0].id;
            setDriverUid(driverId);
            return driverId;
          }
        }
        setDriverUid(authUid);
        return authUid;
      }
    } catch (error) {
      console.error('Error getting driver UID:', error);
      return authUid;
    }
  }, []);

  // ✅ Fetch bus info from trip
  const fetchBusInfoFromTrip = useCallback(async (tripIdParam: string) => {
    try {
      const tripDoc = await firestore().collection('trips').doc(tripIdParam).get();
      if (tripDoc.exists) {
        const trip = tripDoc.data();
        if (trip?.busId && trip?.busNumber) {
          console.log('✅ Found bus info in trip:', trip.busNumber);
          return {
            id: trip.busId,
            number: trip.busNumber,
            model: trip.busModel,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching bus from trip:', error);
      return null;
    }
  }, []);

  // ✅ Fetch bus info from bus collection directly
  const fetchBusInfoById = useCallback(async (busId: string) => {
    try {
      const busDoc = await firestore().collection('buses').doc(busId).get();
      if (busDoc.exists) {
        const bus = busDoc.data();
        console.log('✅ Found bus info from buses collection:', bus?.busNumber);
        return {
          id: busId,
          number: bus?.busNumber || bus?.registrationNumber || 'Unknown',
          model: bus?.model,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching bus by ID:', error);
      return null;
    }
  }, []);

  // Fetch driver, bus, and trip info
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const actualDriverId = await getDriverUid(user.uid);

        // Driver info
        const driverDoc = await firestore().collection('drivers').doc(actualDriverId).get();
        let driverData: any = null;
        if (driverDoc.exists) {
          driverData = driverDoc.data();
          setDriverName(driverData?.fullName || 'Driver');
        }

        // Try to get bus info in order of priority:
        let finalBusInfo = null;

        // 1. First try from dutyDetails (passed from previous screen)
        if (dutyDetails?.busNumber) {
          console.log('📌 Got bus info from dutyDetails:', dutyDetails.busNumber);
          finalBusInfo = {
            id: dutyDetails.busId || '',
            number: dutyDetails.busNumber,
            model: dutyDetails.busModel,
          };
        }

        // 2. If not, try from trip data
        if (!finalBusInfo && tripId) {
          const tripBus = await fetchBusInfoFromTrip(tripId);
          if (tripBus) {
            console.log('📌 Got bus info from trip:', tripBus.number);
            finalBusInfo = tripBus;
            setTripBusInfo(tripBus);
          }
        }

        // 3. If still not, try from driver's assigned bus
        if (!finalBusInfo && driverData?.vehicleAssignedBusId) {
          const assignedBus = await fetchBusInfoById(driverData.vehicleAssignedBusId);
          if (assignedBus) {
            console.log('📌 Got bus info from driver assignment:', assignedBus.number);
            finalBusInfo = assignedBus;
          }
        }

        // 4. Last resort - use placeholder
        if (!finalBusInfo) {
          console.log('⚠️ No bus info found, using placeholder');
          finalBusInfo = {
            id: 'unknown',
            number: 'Unknown Bus',
          };
        }

        setBusInfo(finalBusInfo);
        console.log('✅ Final bus info set:', finalBusInfo);

        // Validate trip if provided
        if (tripId) {
          const tripDoc = await firestore().collection('trips').doc(tripId).get();
          if (tripDoc.exists) {
            const trip = tripDoc.data();
            setTripData(trip);

            // Check driver ownership
            if (trip.driverId !== actualDriverId) {
              Alert.alert(
                'Unauthorized',
                'This trip is not assigned to you.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
              setTripValidated(false);
              return;
            }

            // ✅ Allow scheduled status only
            if (trip.status !== TRIP_STATUS.SCHEDULED) {
              Alert.alert(
                'Invalid Trip State',
                `This trip is already ${trip.status}. Cannot proceed with vehicle check.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
              setTripValidated(false);
              return;
            }

            setTripValidated(true);
          } else {
            Alert.alert('Error', 'Trip not found');
            setTripValidated(false);
          }
        }

        // Fetch recent checks (optional)
        const checksSnapshot = await firestore()
          .collection('vehicle_checks')
          .where('driverId', '==', actualDriverId)
          .orderBy('checkDate', 'desc')
          .limit(5)
          .get();

        const checks: VehicleCheck[] = [];
        checksSnapshot.forEach(doc => {
          const data = doc.data();
          checks.push({
            id: doc.id,
            driverId: data.driverId,
            driverName: data.driverName,
            tripId: data.tripId,
            busId: data.busId,
            busNumber: data.busNumber,
            checkDate: data.checkDate,
            checkType: data.checkType,
            items: data.items,
            passed: data.passed,
            issues: data.issues,
            completedAt: data.completedAt,
          });
        });
        setRecentChecks(checks);

        setLoading(false);
        setRefreshing(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
  }, [user, dutyDetails, tripId, getDriverUid, fetchBusInfoFromTrip, fetchBusInfoById]);

  // Block back navigation during active duty flow
  useEffect(() => {
    if (!isStartDutyFlow) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!saving && !allChecked) {
        e.preventDefault();
        Alert.alert(
          'Vehicle Check Incomplete',
          'Please complete the vehicle check before leaving. If you need to cancel, report an issue or contact dispatcher.',
          [{ text: 'OK' }]
        );
      }
    });

    return unsubscribe;
  }, [navigation, isStartDutyFlow, saving, allChecked]);

  // Toggle checklist item
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  // ✅ Main handler for vehicle OK - UPDATED with standardized statuses
  const handleVehicleOK = async () => {
    if (!allChecked) {
      Alert.alert('Incomplete Checklist', 'Please check all items before marking vehicle as OK.');
      return;
    }

    // Validate inputs
    const odometerValue = odometerReading ? parseInt(odometerReading) : null;
    if (odometerReading && !validateOdometer(odometerReading)) {
      Alert.alert('Invalid Odometer', odometerError);
      return;
    }

    const fuelValue = fuelLevel ? parseInt(fuelLevel) : null;
    if (fuelLevel && !validateFuel(fuelLevel)) {
      Alert.alert('Invalid Fuel Level', fuelError);
      return;
    }

    if (!busInfo) {
      Alert.alert('Error', 'No bus information available. Please contact dispatcher.');
      return;
    }

    if (isStartDutyFlow && (!tripData || !tripValidated)) {
      Alert.alert('Error', 'Invalid trip. Please try again.');
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      // Prepare checklist data with IDs
      const checklistData = Object.fromEntries(
        checklist.map(item => [item.id, item.checked])
      );

      const checkData = {
        driverId: driverUid || user?.uid,
        driverName,
        tripId: tripId || null,
        busId: busInfo.id,
        busNumber: busInfo.number,
        checkDate: firestore.FieldValue.serverTimestamp(),
        checkType: isStartDutyFlow ? 'pre-trip' : 'weekly',
        items: checklist,
        checklist: checklistData,
        passed: true,
        odometerReading: odometerValue,
        fuelLevel: fuelValue,
        notes: notes || null,
        completedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (isStartDutyFlow && tripId) {
        // Atomic update using transaction
        await firestore().runTransaction(async (transaction) => {
          const checkRef = firestore().collection('vehicle_checks').doc();
          transaction.set(checkRef, checkData);

          // ✅ Trip status remains SCHEDULED (boarding is next step, not a separate status)
          const tripRef = firestore().collection('trips').doc(tripId);
          transaction.update(tripRef, {
            vehicleChecked: true,
            vehicleCheckedAt: firestore.FieldValue.serverTimestamp(),
            vehicleCheckId: checkRef.id,
          });

          // ✅ Driver: already ON_TRIP from dashboard, no change needed
          // ❌ REMOVED: onDuty field update

          // ✅ Bus: already ON_TRIP from dashboard, update last check info only
          if (busInfo.id && busInfo.id !== 'unknown') {
            const busRef = firestore().collection('buses').doc(busInfo.id);
            transaction.update(busRef, {
              lastCheck: firestore.FieldValue.serverTimestamp(),
              lastCheckId: checkRef.id,
            });
          }
        });

        setSaving(false);
        Alert.alert(
          'Vehicle Check Complete',
          'Vehicle check passed. Proceed to boarding.',
          [
            {
              text: 'Go to Boarding',
              onPress: () => {
                // ✅ FIXED: Use navigation.navigate with nested navigator structure
                // Since Boarding is inside Main Tab Navigator
                navigation.navigate('Main', {
                  screen: 'Boarding',
                  params: {
                    tripId,
                    dutyDetails: {
                      ...dutyDetails,
                      busId: busInfo.id,
                      busNumber: busInfo.number,
                    },
                  },
                });
              },
            },
          ]
        );
      } else {
        // Regular vehicle check (not starting duty)
        const checkRef = await firestore().collection('vehicle_checks').add(checkData);
        if (busInfo.id && busInfo.id !== 'unknown') {
          await firestore().collection('buses').doc(busInfo.id).update({
            lastCheck: firestore.FieldValue.serverTimestamp(),
            lastCheckId: checkRef.id,
          });
        }
        setSaving(false);
        Alert.alert('Success', 'Vehicle check report submitted successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error saving vehicle check:', error);
      Alert.alert('Error', 'Failed to save vehicle check');
      setSaving(false);
    }
  };

  // ✅ Issue reporting with atomic updates - UPDATED with standardized statuses
  const handleSubmitIssue = async () => {
    if (!selectedIssueType) {
      Alert.alert('Error', 'Please select an issue type.');
      return;
    }
    if (!issueDescription.trim()) {
      Alert.alert('Error', 'Please describe the issue.');
      return;
    }
    if (!busInfo) {
      Alert.alert('Error', 'No bus information available');
      return;
    }

    setIsSubmitting(true);

    try {
      const issueTypeLabel = issueTypes.find(type => type.value === selectedIssueType)?.label;

      // Prepare checklist data
      const checklistData = Object.fromEntries(
        checklist.map(item => [item.id, item.checked])
      );

      const odometerValue = odometerReading ? parseInt(odometerReading) : null;
      const fuelValue = fuelLevel ? parseInt(fuelLevel) : null;

      await firestore().runTransaction(async (transaction) => {
        // Create vehicle check record with passed: false
        const checkRef = firestore().collection('vehicle_checks').doc();
        transaction.set(checkRef, {
          driverId: driverUid || user?.uid,
          driverName,
          tripId: tripId || null,
          busId: busInfo.id,
          busNumber: busInfo.number,
          checkDate: firestore.FieldValue.serverTimestamp(),
          checkType: isStartDutyFlow ? 'pre-trip' : 'weekly',
          items: checklist,
          checklist: checklistData,
          passed: false,
          issues: [{
            type: selectedIssueType,
            typeLabel: issueTypeLabel,
            description: issueDescription,
            severity: issueSeverity,
            reportedAt: firestore.FieldValue.serverTimestamp(),
          }],
          odometerReading: odometerValue,
          fuelLevel: fuelValue,
          notes: notes || `Issue reported: ${issueDescription}`,
          completedAt: firestore.FieldValue.serverTimestamp(),
        });

        // Create issue record
        const issueRef = firestore().collection('vehicle_issues').doc();
        const issueData = {
          busId: busInfo.id,
          busNumber: busInfo.number,
          driverId: driverUid || user?.uid,
          driverName,
          tripId: tripId || null,
          vehicleCheckId: checkRef.id,
          type: selectedIssueType,
          description: issueDescription,
          severity: issueSeverity,
          status: 'reported',
          reportedAt: firestore.FieldValue.serverTimestamp(),
        };
        transaction.set(issueRef, issueData);

        // ✅ Update bus status based on severity
        if (busInfo.id && busInfo.id !== 'unknown') {
          const busRef = firestore().collection('buses').doc(busInfo.id);
          if (issueSeverity === ISSUE_SEVERITY.CRITICAL || issueSeverity === ISSUE_SEVERITY.HIGH) {
            transaction.update(busRef, {
              status: BUS_STATUS.MAINTENANCE, // ✅ Standardized
              currentIssueId: issueRef.id,
              lastIssueReported: firestore.FieldValue.serverTimestamp(),
            });
          } else {
            transaction.update(busRef, {
              lastIssueReported: firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        // If this is a start duty flow, update trip to delayed
        if (isStartDutyFlow && tripId) {
          const tripRef = firestore().collection('trips').doc(tripId);
          transaction.update(tripRef, {
            status: TRIP_STATUS.DELAYED, // ✅ Standardized
            delayReason: `Vehicle issue: ${issueTypeLabel}`,
            delayReportedAt: firestore.FieldValue.serverTimestamp(),
            vehicleCheckId: checkRef.id,
          });

          // ✅ Reset driver: set to AVAILABLE and clear currentTripId
          const driverRef = firestore().collection('drivers').doc(driverUid || user?.uid);
          transaction.update(driverRef, {
            status: DRIVER_STATUS.AVAILABLE, // ✅ Standardized
            currentTripId: firestore.FieldValue.delete(),
          });

          // ✅ Reset bus: set to AVAILABLE (can't go on trip with issues)
          if (busInfo.id && busInfo.id !== 'unknown' &&
              (issueSeverity !== ISSUE_SEVERITY.CRITICAL && issueSeverity !== ISSUE_SEVERITY.HIGH)) {
            const busRef = firestore().collection('buses').doc(busInfo.id);
            transaction.update(busRef, {
              status: BUS_STATUS.AVAILABLE,
              currentTripId: firestore.FieldValue.delete(),
            });
          }
        }

        // Create notification for maintenance team
        const notificationRef = firestore().collection('notifications').doc();
        transaction.set(notificationRef, {
          type: 'maintenance',
          title: 'Vehicle Issue Reported',
          message: `${issueTypeLabel} issue reported for bus ${busInfo.number} by ${driverName}`,
          busId: busInfo.id,
          busNumber: busInfo.number,
          issueId: issueRef.id,
          vehicleCheckId: checkRef.id,
          severity: issueSeverity,
          timestamp: firestore.FieldValue.serverTimestamp(),
          read: false,
          actionable: true,
          target: 'transporter',
        });
      });

      setIsSubmitting(false);
      setShowIssueForm(false);
      setSelectedIssueType('');
      setIssueDescription('');
      setIssueSeverity('medium');

      Alert.alert(
        'Issue Reported',
        `Your ${issueTypeLabel} issue has been reported to the maintenance team.${
          issueSeverity === ISSUE_SEVERITY.CRITICAL
            ? '\n\n⚠️ CRITICAL ISSUE: Emergency team notified.'
            : ''
        }\n\nVehicle check record has been saved with the issue.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (isStartDutyFlow) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error reporting issue:', error);
      Alert.alert('Error', 'Failed to report issue');
      setIsSubmitting(false);
    }
  };

  const issueTypes = [
    { id: '1', label: 'Fuel Issue', value: 'fuel', category: 'mechanical' },
    { id: '2', label: 'Tire Problem', value: 'tire', category: 'exterior' },
    { id: '3', label: 'Brake Problem', value: 'brake', category: 'mechanical' },
    { id: '4', label: 'Engine Issue', value: 'engine', category: 'mechanical' },
    { id: '5', label: 'Electrical Problem', value: 'electrical', category: 'mechanical' },
    { id: '6', label: 'Other Mechanical', value: 'mechanical', category: 'mechanical' },
    { id: '7', label: 'Safety Equipment', value: 'safety', category: 'safety' },
    { id: '8', label: 'Cleanliness', value: 'cleanliness', category: 'interior' },
    { id: '9', label: 'Document Issue', value: 'document', category: 'documents' },
    { id: '10', label: 'Other', value: 'other', category: 'other' },
  ];

  const renderChecklistItem = (item: ChecklistItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.checklistItem}
      onPress={() => toggleChecklistItem(item.id)}
    >
      <View style={styles.checkboxContainer}>
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>

      <View style={styles.checklistContent}>
        <Text style={[styles.checklistTitle, item.checked && styles.checkedText]}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.checklistDescription}>{item.description}</Text>
        )}
      </View>

      <Text style={styles.statusIndicator}>{item.checked ? '✅' : '🔘'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading vehicle check...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 VEHICLE CHECK</Text>
        {busInfo && (
          <Text style={styles.busInfo}>
            🚌 {busInfo.number} • Driver: {driverName}
          </Text>
        )}
        {!busInfo && (
          <Text style={styles.busInfoWarning}>
            ⚠️ Bus information not available - please contact dispatcher
          </Text>
        )}
        {isStartDutyFlow && (
          <>
            <Text style={styles.headerSubtitle}>Required before starting duty</Text>
            {tripData && (
              <Text style={styles.tripInfo}>
                🗺️ {tripData.routeName} • {tripData.departureTime}
              </Text>
            )}
          </>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
      >
        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Pre-Trip Inspection</Text>
            <Text style={styles.progressCount}>
              {checkedCount}/{totalCount} completed
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(checkedCount / totalCount) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressNote}>
            Complete all checks before proceeding to boarding
          </Text>
        </View>

        {/* Additional Readings with Validation */}
        <View style={styles.readingsSection}>
          <View style={styles.readingInput}>
            <Text style={styles.readingLabel}>Odometer (km)</Text>
            <TextInput
              style={[styles.readingField, odometerError ? styles.inputError : null]}
              value={odometerReading}
              onChangeText={(text) => {
                setOdometerReading(text);
                validateOdometer(text);
              }}
              keyboardType="numeric"
              placeholder="12345"
              placeholderTextColor="#999"
            />
            {odometerError ? <Text style={styles.errorText}>{odometerError}</Text> : null}
          </View>
          <View style={styles.readingInput}>
            <Text style={styles.readingLabel}>Fuel Level (%)</Text>
            <TextInput
              style={[styles.readingField, fuelError ? styles.inputError : null]}
              value={fuelLevel}
              onChangeText={(text) => {
                setFuelLevel(text);
                validateFuel(text);
              }}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor="#999"
            />
            {fuelError ? <Text style={styles.errorText}>{fuelError}</Text> : null}
          </View>
        </View>

        {/* Checklist Section */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>CHECKLIST</Text>
          <View style={styles.checklistContainer}>{checklist.map(renderChecklistItem)}</View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>ADDITIONAL NOTES</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional observations or comments..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.okButton,
              (!allChecked || saving || (isStartDutyFlow && !tripValidated)) && styles.disabledButton,
            ]}
            onPress={handleVehicleOK}
            disabled={!allChecked || saving || (isStartDutyFlow && !tripValidated)}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.okButtonText}>
                {isStartDutyFlow ? '✅ PROCEED TO BOARDING' : '✅ SUBMIT CHECK'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.issueButton]}
            onPress={() => setShowIssueForm(true)}
            disabled={saving}
          >
            <Text style={styles.issueButtonText}>⚠️ REPORT ISSUE</Text>
          </TouchableOpacity>
        </View>

        {/* Info for duty flow */}
        {isStartDutyFlow && (
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>📋 Next Steps:</Text>
            <Text style={styles.infoStep}>1. ✓ Complete vehicle check</Text>
            <Text style={styles.infoStep}>2. → Proceed to passenger boarding</Text>
            <Text style={styles.infoStep}>3. → Start route after boarding complete</Text>
          </View>
        )}

        {/* Recent Checks */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>RECENT CHECKS</Text>
          <View style={styles.recentCard}>
            {recentChecks.length > 0 ? (
              recentChecks.map(check => (
                <View key={check.id} style={styles.recentItem}>
                  <Text style={styles.recentDate}>
                    {check.checkDate?.toDate?.().toLocaleString() || 'Unknown'}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      check.passed ? styles.statusBadgeSuccess : styles.statusBadgeWarning,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {check.passed ? 'PASSED' : 'ISSUES'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noRecentText}>No recent checks found</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Issue Report Modal */}
      <Modal
        visible={showIssueForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowIssueForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚠️ REPORT VEHICLE ISSUE</Text>
              <TouchableOpacity onPress={() => setShowIssueForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Issue Type */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Issue Type *</Text>
                <View style={styles.issueTypeGrid}>
                  {issueTypes.map(type => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.issueTypeButton,
                        selectedIssueType === type.value && styles.issueTypeSelected,
                      ]}
                      onPress={() => setSelectedIssueType(type.value)}
                    >
                      <Text
                        style={[
                          styles.issueTypeText,
                          selectedIssueType === type.value && styles.issueTypeTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Severity */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Severity *</Text>
                <View style={styles.severityGrid}>
                  {Object.values(ISSUE_SEVERITY).map(sev => (
                    <TouchableOpacity
                      key={sev}
                      style={[
                        styles.severityButton,
                        issueSeverity === sev &&
                          (sev === 'low'
                            ? styles.severityLowSelected
                            : sev === 'medium'
                            ? styles.severityMediumSelected
                            : sev === 'high'
                            ? styles.severityHighSelected
                            : styles.severityCriticalSelected),
                      ]}
                      onPress={() => setIssueSeverity(sev as any)}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          issueSeverity === sev && styles.severityTextSelected,
                        ]}
                      >
                        {sev.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe the issue in detail..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={issueDescription}
                  onChangeText={setIssueDescription}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{issueDescription.length}/500 characters</Text>
              </View>

              {/* Additional Info */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Additional Information</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>• Your location will be shared with maintenance team</Text>
                  <Text style={styles.infoText}>• Expected response time: 30-60 minutes</Text>
                  <Text style={styles.infoText}>• Emergency contact: +92 300 1234567</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowIssueForm(false)}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitIssue}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4A90E2' },
  header: { backgroundColor: '#1A237E', paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  busInfo: { fontSize: 14, color: '#E3F2FD', marginBottom: 4 },
  busInfoWarning: { fontSize: 14, color: '#FFD700', marginBottom: 4, textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: '#E3F2FD', marginBottom: 4 },
  tripInfo: { fontSize: 12, color: '#FFD700', marginTop: 4 },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  progressSection: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A237E' },
  progressCount: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  progressNote: { fontSize: 12, color: '#666666', textAlign: 'center', marginTop: 8 },
  readingsSection: { flexDirection: 'row', gap: 12, marginTop: 20 },
  readingInput: { flex: 1 },
  readingLabel: { fontSize: 12, color: '#666666', marginBottom: 4 },
  readingField: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, fontSize: 14, color: '#1A237E', borderWidth: 1, borderColor: '#E0E0E0' },
  inputError: { borderColor: '#F44336', borderWidth: 1 },
  errorText: { fontSize: 10, color: '#F44336', marginTop: 4 },
  checklistSection: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginBottom: 12 },
  checklistContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  checkboxContainer: { marginRight: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  checklistContent: { flex: 1 },
  checklistTitle: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginBottom: 4 },
  checkedText: { color: '#666666', textDecorationLine: 'line-through' },
  checklistDescription: { fontSize: 12, color: '#666666', lineHeight: 16 },
  statusIndicator: { fontSize: 20, marginLeft: 8 },
  notesSection: { marginTop: 20 },
  notesInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 14, color: '#1A237E', borderWidth: 1, borderColor: '#E0E0E0', minHeight: 80 },
  actionSection: { marginTop: 24, gap: 12 },
  actionButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  okButton: { backgroundColor: '#4CAF50' },
  issueButton: { backgroundColor: '#FF9800' },
  disabledButton: { backgroundColor: '#E0E0E0' },
  okButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  issueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  infoSection: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginTop: 16 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A237E', marginBottom: 8 },
  infoStep: { fontSize: 13, color: '#1A237E', marginBottom: 4, paddingLeft: 8 },
  recentSection: { marginTop: 24, marginBottom: 32 },
  recentCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  recentDate: { fontSize: 14, color: '#1A237E' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeSuccess: { backgroundColor: '#E8F5E9' },
  statusBadgeWarning: { backgroundColor: '#FFF3E0' },
  statusBadgeText: { fontSize: 12, fontWeight: '600', color: '#666666' },
  noRecentText: { textAlign: 'center', color: '#666666', padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A237E' },
  modalClose: { fontSize: 24, color: '#666666', padding: 4 },
  modalScroll: { paddingHorizontal: 20 },
  formSection: { marginTop: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#1A237E', marginBottom: 8 },
  issueTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  issueTypeButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F8F9FA', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  issueTypeSelected: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  issueTypeText: { fontSize: 12, color: '#666666', fontWeight: '500' },
  issueTypeTextSelected: { color: '#FFFFFF' },
  severityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  severityButton: { flex: 1, paddingVertical: 10, backgroundColor: '#F8F9FA', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', minWidth: '22%' },
  severityLowSelected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  severityMediumSelected: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  severityHighSelected: { backgroundColor: '#F44336', borderColor: '#F44336' },
  severityCriticalSelected: { backgroundColor: '#9C27B0', borderColor: '#9C27B0' },
  severityText: { fontSize: 11, color: '#666666', fontWeight: '600' },
  severityTextSelected: { color: '#FFFFFF' },
  descriptionInput: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, fontSize: 14, color: '#1A237E', borderWidth: 1, borderColor: '#E0E0E0', minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 4 },
  infoCard: { backgroundColor: '#F0F8FF', borderRadius: 8, padding: 12 },
  infoText: { fontSize: 12, color: '#1A237E', marginBottom: 4, lineHeight: 16 },
  modalActions: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0' },
  submitButton: { backgroundColor: '#FF9800' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#666666' },
  submitButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});

export default VehicleCheckScreen;