import React, { useState, useEffect } from 'react';
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
} from 'react-native';

interface Passenger {
  id: string;
  name: string;
  seat: string;
  fromStop: string;
  toStop: string;
  status: 'BOARDED' | 'PENDING' | 'MISSED';
  ticketNumber: string;
}

const BoardingScreen: React.FC = () => {
  const [currentStop] = useState('Stop 3: University');
  const [nextStop] = useState('Stop 4: Hospital');
  const [nextStopETA] = useState('15 min');
  const [showScanModal, setShowScanModal] = useState(false);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'BOARDED' | 'PENDING'>('ALL');
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // FIXED: Initialize passengers with proper array
  const [passengers, setPassengers] = useState<Passenger[]>([
    { id: '1', name: 'Ali Ahmed', seat: '12A', fromStop: 'Stop 3', toStop: 'Stop 8', status: 'BOARDED', ticketNumber: 'TKT-2024-001' },
    { id: '2', name: 'Sara Khan', seat: '14B', fromStop: 'Stop 3', toStop: 'Stop 5', status: 'PENDING', ticketNumber: 'TKT-2024-002' },
    { id: '3', name: 'Usman Ali', seat: '16C', fromStop: 'Stop 3', toStop: 'Stop 7', status: 'PENDING', ticketNumber: 'TKT-2024-003' },
    { id: '4', name: 'Fatima Khan', seat: '18D', fromStop: 'Stop 3', toStop: 'Stop 6', status: 'BOARDED', ticketNumber: 'TKT-2024-004' },
    { id: '5', name: 'Ahmed Raza', seat: '20E', fromStop: 'Stop 3', toStop: 'Stop 9', status: 'MISSED', ticketNumber: 'TKT-2024-005' },
    { id: '6', name: 'Zainab Malik', seat: '22F', fromStop: 'Stop 3', toStop: 'Stop 4', status: 'PENDING', ticketNumber: 'TKT-2024-006' },
    { id: '7', name: 'Bilal Ahmed', seat: '24G', fromStop: 'Stop 3', toStop: 'Stop 10', status: 'BOARDED', ticketNumber: 'TKT-2024-007' },
    { id: '8', name: 'Hina Shah', seat: '26H', fromStop: 'Stop 3', toStop: 'Stop 5', status: 'PENDING', ticketNumber: 'TKT-2024-008' },
  ]);

  // FIXED: Safe calculations with optional chaining
  const pendingCount = passengers?.filter(p => p.status === 'PENDING').length || 0;
  const boardedCountValue = passengers?.filter(p => p.status === 'BOARDED').length || 0;
  const missedCount = passengers?.filter(p => p.status === 'MISSED').length || 0;

  const handleScanQR = () => {
    setShowScanModal(true);
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setScanResult('success');
      setIsScanning(false);

      setTimeout(() => {
        if (passengers && passengers.length > 0) {
          const pendingPassengers = passengers.filter(p => p.status === 'PENDING');
          if (pendingPassengers.length > 0) {
            const randomIndex = Math.floor(Math.random() * pendingPassengers.length);
            setSelectedPassenger(pendingPassengers[randomIndex]);
            setShowScanModal(false);
            setShowPassengerModal(true);
            setScanResult(null);
          } else {
            Alert.alert('No Pending Passengers', 'All passengers have been processed.');
            setShowScanModal(false);
          }
        }
      }, 1000);
    }, 2000);
  };

  const handleManualBoarding = () => {
    Alert.alert(
      'Manual Boarding',
      'Enter passenger details:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select Passenger',
          onPress: () => {
            if (passengers && passengers.length > 0) {
              const pendingPassengers = passengers.filter(p => p.status === 'PENDING');
              if (pendingPassengers.length > 0) {
                const passengerOptions = pendingPassengers.map(p => ({
                  text: `${p.name} (${p.ticketNumber})`,
                  onPress: () => {
                    setSelectedPassenger(p);
                    setShowPassengerModal(true);
                  }
                }));

                Alert.alert(
                  'Select Passenger',
                  'Choose a passenger to board:',
                  [
                    ...passengerOptions,
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              } else {
                Alert.alert('No Pending Passengers', 'All passengers have been processed.');
              }
            }
          }
        }
      ]
    );
  };

  const handleAnnounce = () => {
    Alert.alert(
      'Make Announcement',
      'Select announcement type:',
      [
        {
          text: 'Next Stop Announcement',
          onPress: () => Alert.alert('Announcement Made', 'Next stop announcement has been made.')
        },
        {
          text: 'Welcome Announcement',
          onPress: () => Alert.alert('Announcement Made', 'Welcome announcement has been made.')
        },
        {
          text: 'Safety Announcement',
          onPress: () => Alert.alert('Announcement Made', 'Safety announcement has been made.')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleCloseDoors = () => {
    Alert.alert(
      'Close Doors',
      'Are you sure you want to close the doors?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Doors',
          onPress: () => {
            setPassengers(prev =>
              prev?.map(p =>
                p.status === 'PENDING' ? { ...p, status: 'MISSED' } : p
              ) || []
            );
            Alert.alert('Doors Closed', 'All pending passengers marked as missed.');
          }
        }
      ]
    );
  };

  const handleReportDelay = () => {
    Alert.alert(
      'Report Delay',
      'Select delay reason:',
      [
        {
          text: 'Traffic Delay (5-10 min)',
          onPress: () => Alert.alert('Delay Reported', 'Traffic delay reported to dispatch.')
        },
        {
          text: 'Passenger Delay (2-3 min)',
          onPress: () => Alert.alert('Delay Reported', 'Passenger delay reported.')
        },
        {
          text: 'Mechanical Issue',
          onPress: () => Alert.alert('Delay Reported', 'Mechanical issue reported to maintenance.')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleConfirmBoarding = () => {
    if (selectedPassenger) {
      setPassengers(prev =>
        prev?.map(p =>
          p.id === selectedPassenger.id ? { ...p, status: 'BOARDED' } : p
        ) || []
      );
      Alert.alert(
        'Boarding Confirmed',
        `${selectedPassenger.name} has been boarded successfully.\nSeat: ${selectedPassenger.seat}\nTicket: ${selectedPassenger.ticketNumber}`
      );
      setShowPassengerModal(false);
      setSelectedPassenger(null);
    }
  };

  const handleMarkMissed = (passengerId: string) => {
    Alert.alert(
      'Mark as Missed',
      'Are you sure you want to mark this passenger as missed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Missed',
          onPress: () => {
            setPassengers(prev =>
              prev?.map(p =>
                p.id === passengerId ? { ...p, status: 'MISSED' } : p
              ) || []
            );
            Alert.alert('Marked as Missed', 'Passenger has been marked as missed.');
            if (selectedPassenger?.id === passengerId) {
              setShowPassengerModal(false);
              setSelectedPassenger(null);
            }
          }
        }
      ]
    );
  };

  const handleViewPassenger = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setShowPassengerModal(true);
  };

  const getStatusColor = (status: Passenger['status']) => {
    switch (status) {
      case 'BOARDED': return '#4CAF50';
      case 'PENDING': return '#FF9800';
      case 'MISSED': return '#F44336';
      default: return '#666666';
    }
  };

  const getStatusEmoji = (status: Passenger['status']) => {
    switch (status) {
      case 'BOARDED': return '✅';
      case 'PENDING': return '⏳';
      case 'MISSED': return '❌';
      default: return '🔘';
    }
  };

  // FIXED: Safe filtering
  const filteredPassengers = passengers?.filter(passenger => {
    if (!passenger) return false;
    if (filter === 'ALL') return true;
    if (filter === 'BOARDED') return passenger.status === 'BOARDED';
    if (filter === 'PENDING') return passenger.status === 'PENDING';
    return true;
  }) || [];

  useEffect(() => {
    if (showScanModal && !isScanning && scanResult === null) {
      const timer = setTimeout(() => {
        setShowScanModal(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showScanModal, isScanning, scanResult]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      {/* Top Info Bar */}
      <View style={styles.topBar}>
        <View style={styles.stopInfo}>
          <Text style={styles.currentStop}>📍 {currentStop}</Text>
          <Text style={styles.nextStop}>Next: {nextStop} • ETA: {nextStopETA}</Text>
        </View>
        <View style={styles.passengerCount}>
          <Text style={styles.countText}>
            👥 {boardedCountValue}/{passengers?.length || 0}
          </Text>
          <Text style={styles.countLabel}>Boarded</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* QR Scan Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SCAN QR CODE</Text>
          <TouchableOpacity style={styles.scanButton} onPress={handleScanQR}>
            <Text style={styles.scanButtonEmoji}>📱</Text>
            <Text style={styles.scanButtonText}>TAP TO SCAN QR CODE</Text>
            <Text style={styles.scanButtonSubtext}>Position QR code within frame</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.manualButton} onPress={handleManualBoarding}>
            <Text style={styles.manualButtonText}>📝 MANUAL BOARDING</Text>
          </TouchableOpacity>
        </View>

        {/* Boarding Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BOARDING STATUS</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{boardedCountValue}</Text>
              <Text style={styles.statusLabel}>✅ Boarded</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{pendingCount}</Text>
              <Text style={styles.statusLabel}>🔴 Pending</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{missedCount}</Text>
              <Text style={styles.statusLabel}>❌ Missed</Text>
            </View>
          </View>

          <Text style={styles.currentStopInfo}>
            Current Stop: {currentStop}
          </Text>
        </View>

        {/* Passenger List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PASSENGER LIST</Text>
            <Text style={styles.passengerCountText}>
              {filteredPassengers.length} passengers
            </Text>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
              onPress={() => setFilter('ALL')}
            >
              <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
                ALL
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'BOARDED' && styles.filterTabActive]}
              onPress={() => setFilter('BOARDED')}
            >
              <Text style={[styles.filterTabText, filter === 'BOARDED' && styles.filterTabTextActive]}>
                BOARDED
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'PENDING' && styles.filterTabActive]}
              onPress={() => setFilter('PENDING')}
            >
              <Text style={[styles.filterTabText, filter === 'PENDING' && styles.filterTabTextActive]}>
                PENDING
              </Text>
            </TouchableOpacity>
          </View>

          {/* Passenger Cards */}
          <View style={styles.passengerList}>
            {filteredPassengers.map(passenger => (
              <TouchableOpacity
                key={passenger.id}
                style={styles.passengerCard}
                onPress={() => handleViewPassenger(passenger)}
              >
                <View style={styles.passengerHeader}>
                  <Text style={styles.passengerName}>{passenger.name}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(passenger.status) + '20' }
                  ]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(passenger.status) }]}>
                      {getStatusEmoji(passenger.status)} {passenger.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.passengerDetails}>
                  <Text style={styles.passengerSeat}>Seat: {passenger.seat}</Text>
                  <Text style={styles.passengerRoute}>
                    From: {passenger.fromStop} → To: {passenger.toStop}
                  </Text>
                </View>

                <Text style={styles.passengerTicket}>
                  Ticket: {passenger.ticketNumber}
                </Text>

                {passenger.status === 'PENDING' && (
                  <View style={styles.passengerActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewPassenger(passenger)}
                    >
                      <Text style={styles.actionButtonText}>VIEW</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.missedButton]}
                      onPress={() => handleMarkMissed(passenger.id)}
                    >
                      <Text style={styles.missedButtonText}>MARK MISSED</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleAnnounce}>
            <Text style={styles.quickActionEmoji}>📢</Text>
            <Text style={styles.quickActionText}>Announce</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleCloseDoors}>
            <Text style={styles.quickActionEmoji}>🚪</Text>
            <Text style={styles.quickActionText}>Close Doors</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleReportDelay}>
            <Text style={styles.quickActionEmoji}>⏰</Text>
            <Text style={styles.quickActionText}>Delay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Scan Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsScanning(false);
          setShowScanModal(false);
          setScanResult(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scanModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📱 SCAN QR CODE</Text>
              <TouchableOpacity onPress={() => {
                setIsScanning(false);
                setShowScanModal(false);
                setScanResult(null);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.scanFrame}>
              {scanResult === 'success' ? (
                <View style={styles.scanSuccess}>
                  <Text style={styles.scanSuccessEmoji}>✅</Text>
                  <Text style={styles.scanSuccessText}>QR Code Scanned Successfully!</Text>
                  <Text style={styles.scanSuccessSubtext}>Processing passenger details...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.qrFrame} />
                  <Text style={styles.scanInstruction}>
                    Position QR code within frame
                  </Text>
                  {isScanning && (
                    <Text style={styles.scanningText}>
                      Scanning... {scanResult === null ? 'Looking for QR code' : ''}
                    </Text>
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsScanning(false);
                setShowScanModal(false);
                setScanResult(null);
              }}
            >
              <Text style={styles.cancelButtonText}>CANCEL SCAN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Passenger Details Modal */}
      <Modal
        visible={showPassengerModal && selectedPassenger !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPassengerModal(false);
          setSelectedPassenger(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passengerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 PASSENGER DETAILS</Text>
              <TouchableOpacity onPress={() => {
                setShowPassengerModal(false);
                setSelectedPassenger(null);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedPassenger && (
              <>
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerNameLarge}>{selectedPassenger.name}</Text>
                  <Text style={styles.passengerTicketLarge}>
                    Ticket: {selectedPassenger.ticketNumber}
                  </Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Seat Number:</Text>
                    <Text style={styles.detailValue}>{selectedPassenger.seat}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From Stop:</Text>
                    <Text style={styles.detailValue}>{selectedPassenger.fromStop}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To Stop:</Text>
                    <Text style={styles.detailValue}>{selectedPassenger.toStop}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor(selectedPassenger.status) }]}>
                      {getStatusEmoji(selectedPassenger.status)} {selectedPassenger.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  {selectedPassenger.status === 'PENDING' && (
                    <>
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleConfirmBoarding}
                      >
                        <Text style={styles.confirmButtonText}>✅ CONFIRM BOARDING</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.missedModalButton}
                        onPress={() => handleMarkMissed(selectedPassenger.id)}
                      >
                        <Text style={styles.missedModalButtonText}>MARK AS MISSED</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {(selectedPassenger.status === 'BOARDED' || selectedPassenger.status === 'MISSED') && (
                    <TouchableOpacity
                      style={[styles.confirmButton, { backgroundColor: '#666666' }]}
                      onPress={() => {
                        setShowPassengerModal(false);
                        setSelectedPassenger(null);
                      }}
                    >
                      <Text style={styles.confirmButtonText}>
                        {selectedPassenger.status === 'BOARDED' ? '✅ ALREADY BOARDED' : '❌ MISSED'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setShowPassengerModal(false);
                      setSelectedPassenger(null);
                    }}
                  >
                    <Text style={styles.closeButtonText}>CLOSE</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Rest of the styles remain the same...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topBar: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopInfo: {
    flex: 1,
  },
  currentStop: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nextStop: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  passengerCount: {
    alignItems: 'center',
  },
  countText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  countLabel: {
    fontSize: 12,
    color: '#E3F2FD',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanButtonEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scanButtonSubtext: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  manualButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666666',
  },
  currentStopInfo: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  passengerCountText: {
    fontSize: 14,
    color: '#666666',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#4A90E2',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  passengerList: {
    gap: 12,
  },
  passengerCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  passengerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  passengerSeat: {
    fontSize: 14,
    color: '#666666',
  },
  passengerRoute: {
    fontSize: 14,
    color: '#666666',
  },
  passengerTicket: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  passengerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  missedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  missedButtonText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 32,
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#1A237E',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  scanModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  passengerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  modalClose: {
    fontSize: 24,
    color: '#666666',
    padding: 4,
  },
  scanFrame: {
    alignItems: 'center',
    padding: 40,
  },
  qrFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 20,
  },
  scanInstruction: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  scanningText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  scanSuccess: {
    alignItems: 'center',
  },
  scanSuccessEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  scanSuccessText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  passengerInfo: {
    padding: 20,
  },
  passengerNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  passengerTicketLarge: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
  },
  modalActions: {
    padding: 20,
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  missedModalButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  missedModalButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BoardingScreen;