import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

type PaymentScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<PassengerStackParamList, 'Payment'>;

// Payment method types
type PaymentMethod = 'online_card' | 'jazzcash' | 'easypaisa' | 'cash_counter' | 'bank_transfer';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  processingTime: 'instant' | '24h' | '2-4h';
}

const PaymentScreen = () => {
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const route = useRoute<PaymentScreenRouteProp>();
  const params = route.params ?? {};
  const tripId = params.tripId ?? '';
  const busId = params.busId ?? '';
  const seatIds = params.seatIds ?? [];
  const totalAmount = params.totalAmount ?? 0;
  const from = params.from ?? '';
  const to = params.to ?? '';
  const date = params.date ?? '';
  const time = params.time ?? '';
  const busNumber = params.busNumber ?? 'N/A';

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('online_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [bookingCode, setBookingCode] = useState<string | null>(null);

  // Card payment states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [saveCard, setSaveCard] = useState(false);

  // Bank transfer states
  const [accountNumber, setAccountNumber] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [bankName, setBankName] = useState('');
  const [transferSlip, setTransferSlip] = useState<string | null>(null);

  const serviceFee = 1;
  const finalAmount = totalAmount + serviceFee - discountAmount;

  // Payment methods configuration
  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'online_card',
      name: 'Credit / Debit Card',
      icon: 'credit-card',
      description: 'Instant payment with card',
      processingTime: 'instant',
    },
    {
      id: 'jazzcash',
      name: 'JazzCash',
      icon: 'phone-android',
      description: 'Pay with JazzCash app',
      processingTime: 'instant',
    },
    {
      id: 'easypaisa',
      name: 'Easypaisa',
      icon: 'phone-android',
      description: 'Pay with Easypaisa app',
      processingTime: 'instant',
    },
    {
      id: 'cash_counter',
      name: 'Cash at Counter',
      icon: 'store',
      description: 'Pay cash at our nearest counter',
      processingTime: '24h',
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: 'account-balance',
      description: 'Transfer to our bank account',
      processingTime: '2-4h',
    },
  ];

  // Mock saved cards
  const savedCards = [
    {
      id: 'card-1',
      type: 'visa',
      lastFour: '1234',
      expiry: '06/25',
      name: 'Visa Classic',
    },
    {
      id: 'card-2',
      type: 'mastercard',
      lastFour: '5678',
      expiry: '03/24',
      name: 'Mastercard Gold',
    },
  ];

  useEffect(() => {
    // Auto-format card number
    if (cardNumber.length > 0) {
      const formatted = cardNumber.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      if (formatted !== cardNumber) {
        setCardNumber(formatted);
      }
    }

    // Auto-format expiry date
    if (cardExpiry.length === 2 && !cardExpiry.includes('/')) {
      setCardExpiry(cardExpiry + '/');
    }
  }, [cardNumber, cardExpiry]);

  // Generate unique booking code
  const generateBookingCode = (): string => {
    const prefix = 'ZUG';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) {
      Alert.alert('Invalid Code', 'Please enter a discount code');
      return;
    }

    // Mock discount validation
    if (discountCode.toUpperCase() === 'SAVE10') {
      const discount = (totalAmount * 0.1); // 10% discount
      setDiscountAmount(discount);
      setDiscountApplied(true);
      Alert.alert('Discount Applied', '10% discount has been applied!');
    } else if (discountCode.toUpperCase() === 'SAVE5') {
      const discount = (totalAmount * 0.05); // 5% discount
      setDiscountAmount(discount);
      setDiscountApplied(true);
      Alert.alert('Discount Applied', '5% discount has been applied!');
    } else {
      Alert.alert('Invalid Code', 'The discount code is invalid or expired');
    }
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setBookingCode(null); // Reset booking code when method changes
  };

  const validateCardDetails = () => {
    if (!cardNumber.trim() || cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number');
      return false;
    }

    if (!cardExpiry.trim() || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      Alert.alert('Invalid Expiry', 'Please enter expiry in MM/YY format');
      return false;
    }

    if (!cardCVV.trim() || cardCVV.length !== 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid 3-digit CVV');
      return false;
    }

    if (!cardholderName.trim()) {
      Alert.alert('Invalid Name', 'Please enter cardholder name');
      return false;
    }

    return true;
  };

  const validateBankTransferDetails = () => {
    if (!accountNumber.trim() || accountNumber.length < 8) {
      Alert.alert('Invalid Account', 'Please enter a valid account number');
      return false;
    }

    if (!accountTitle.trim()) {
      Alert.alert('Invalid Title', 'Please enter account title');
      return false;
    }

    if (!bankName.trim()) {
      Alert.alert('Invalid Bank', 'Please enter bank name');
      return false;
    }

    return true;
  };

  const handleConfirmPayment = () => {
    // Validate based on payment method
    if (selectedPaymentMethod === 'online_card') {
      if (!validateCardDetails()) {
        return;
      }
    } else if (selectedPaymentMethod === 'bank_transfer') {
      if (!validateBankTransferDetails()) {
        return;
      }
    }

    if (selectedPaymentMethod === 'cash_counter') {
      // For cash payment, show confirmation dialog
      Alert.alert(
        'Cash Payment',
        `Your booking code will be generated. Please pay PKR ${finalAmount.toLocaleString()} at our counter within 24 hours.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: processBooking },
        ]
      );
    } else {
      // For online payments, process directly
      processBooking();
    }
  };

  const processBooking = async () => {
    if (!tripId || !busId || seatIds.length === 0) {
      Alert.alert('Error', 'Invalid booking data. Please go back and try again.');
      return;
    }

    const user = auth().currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to complete the booking.');
      return;
    }

    setIsProcessing(true);

    try {
      // Check if payment method is instant or pending
      const isInstantPayment = ['online_card', 'jazzcash', 'easypaisa'].includes(selectedPaymentMethod);

      // Get user data
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      const passengerName = userData?.fullName ?? user.displayName ?? user.email ?? 'Passenger';
      const passengerEmail = user.email ?? '';
      const passengerPhone = userData?.phoneNumber ?? '';

      // Check trip availability
      const tripDoc = await firestore().collection('trips').doc(tripId).get();
      if (!tripDoc.exists) {
        throw new Error('Trip no longer available');
      }

      const tripData = tripDoc.data() ?? {};
      const availableSeats = tripData.availableSeats ?? 0;

      if (availableSeats < seatIds.length) {
        throw new Error('Not enough seats available. Please go back and select again.');
      }

      // Extract seat numbers (remove 'seat-' prefix)
      const seatNumbers = seatIds.map(id => id.replace('seat-', ''));

      // Generate booking code for non-instant payments
      const newBookingCode = !isInstantPayment ? generateBookingCode() : null;

      // Calculate deadline for cash/transfer payments (24 hours)
      const paymentDeadline = !isInstantPayment ?
        firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) : null;

      // Create booking in Firestore
      const bookingRef = firestore().collection('bookings').doc();

      const bookingData: any = {
        id: bookingRef.id,
        userId: user.uid,
        tripId,
        busId,
        seatNumbers,
        seatCount: seatIds.length,
        from,
        to,
        fromCode: tripData.fromCode || '',
        toCode: tripData.toCode || '',
        travelDate: date ? firestore.Timestamp.fromDate(new Date(date)) : firestore.FieldValue.serverTimestamp(),
        departureTime: time,
        baseFare: totalAmount,
        serviceFee,
        discountAmount,
        totalAmount: finalAmount,
        passengerName,
        passengerEmail,
        passengerPhone,
        busNumber: busNumber || tripData.busNumber || '',

        // Payment related
        paymentMethod: selectedPaymentMethod,
        paymentStatus: isInstantPayment ? 'paid' : 'pending',

        // Booking status
        status: isInstantPayment ? 'confirmed' : 'pending_payment',

        // For cash/transfer payments
        bookingCode: newBookingCode,
        paymentDeadline,

        // Timestamps
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        confirmedAt: isInstantPayment ? firestore.FieldValue.serverTimestamp() : null,
      };

      // Add bank transfer details if applicable
      if (selectedPaymentMethod === 'bank_transfer') {
        bookingData.bankDetails = {
          accountNumber,
          accountTitle,
          bankName,
        };
      }

      await bookingRef.set(bookingData);

      // Update seats in trip subcollection
      for (const seatNum of seatNumbers) {
        const seatRef = firestore().collection('trips').doc(tripId)
          .collection('seats').doc(seatNum);

        if (isInstantPayment) {
          // Instant payment → book permanently
          await seatRef.set({
            seatNumber: seatNum,
            isBooked: true,
            status: 'booked',
            bookedBy: user.uid,
            bookingId: bookingRef.id,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        } else {
          // Cash/Transfer → hold for 24 hours
          await seatRef.set({
            seatNumber: seatNum,
            isBooked: false,
            status: 'reserved',
            reservedBy: user.uid,
            bookingId: bookingRef.id,
            reservedUntil: paymentDeadline,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }

      // Update trip's available seats ONLY for instant payments
      if (isInstantPayment) {
        await firestore().collection('trips').doc(tripId).update({
          availableSeats: firestore.FieldValue.increment(-seatIds.length),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // Show appropriate success message
      if (isInstantPayment) {
        Alert.alert(
          'Payment Successful!',
          'Your booking has been confirmed.',
          [
            {
              text: 'View Ticket',
              onPress: () => {
                navigation.navigate('BookingConfirmation', {
                  bookingId: bookingRef.id,
                });
              },
            },
          ]
        );
      } else {
        // For cash/transfer, show instructions and booking code
        Alert.alert(
          'Booking Created!',
          `Your booking code is: ${newBookingCode}\n\nPlease complete payment within 24 hours to confirm your seats.`,
          [
            {
              text: 'View Details',
              onPress: () => {
                navigation.navigate('BookingConfirmation', {
                  bookingId: bookingRef.id,
                });
              },
            },
          ]
        );
      }

    } catch (error: any) {
      console.error('Booking error:', error);
      Alert.alert(
        'Booking Failed',
        error?.message ?? 'Could not complete booking. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentMethodDetails = () => {
    switch (selectedPaymentMethod) {
      case 'online_card':
        return (
          <View style={styles.cardDetailsContainer}>
            {/* Saved Cards */}
            <Text style={styles.sectionTitle}>SAVED CARDS</Text>
            {savedCards.map(card => (
              <TouchableOpacity
                key={card.id}
                style={styles.savedCard}
                onPress={() => {
                  setCardNumber('**** **** **** ' + card.lastFour);
                  setCardExpiry(card.expiry);
                  setCardholderName('Card Holder');
                }}
              >
                <View style={styles.cardIconContainer}>
                  <Icon
                    name={card.type === 'visa' ? 'credit-card' : 'card-membership'}
                    size={24}
                    color="#4A90E2"
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardDetails}>
                    **** **** **** {card.lastFour} • Expires {card.expiry}
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>
            ))}

            {/* Card Number */}
            <Text style={styles.inputLabel}>CARD NUMBER</Text>
            <View style={styles.inputContainer}>
              <Icon name="credit-card" size={24} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#999"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
                maxLength={19}
              />
              <Icon name="payment" size={24} color="#999" />
            </View>

            {/* Expiry & CVV Row */}
            <View style={styles.row}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.inputLabel}>EXPIRY DATE</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.halfInput}
                    placeholder="MM/YY"
                    placeholderTextColor="#999"
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={styles.halfInputContainer}>
                <Text style={styles.inputLabel}>CVV</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.halfInput}
                    placeholder="123"
                    placeholderTextColor="#999"
                    value={cardCVV}
                    onChangeText={setCardCVV}
                    keyboardType="numeric"
                    maxLength={3}
                    secureTextEntry
                  />
                  <Icon name="lock" size={20} color="#999" />
                </View>
              </View>
            </View>

            {/* Cardholder Name */}
            <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
            <View style={styles.inputContainer}>
              <Icon name="person" size={24} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#999"
                value={cardholderName}
                onChangeText={setCardholderName}
              />
            </View>

            {/* Save Card Option */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setSaveCard(!saveCard)}
            >
              <View style={[styles.checkbox, saveCard && styles.checkboxChecked]}>
                {saveCard && <Icon name="check" size={16} color="#FFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Save card for future payments</Text>
            </TouchableOpacity>
          </View>
        );

      case 'jazzcash':
      case 'easypaisa':
        return (
          <View style={styles.walletContainer}>
            <Icon
              name={selectedPaymentMethod === 'jazzcash' ? 'phone-android' : 'payment'}
              size={60}
              color="#4A90E2"
            />
            <Text style={styles.walletTitle}>
              {selectedPaymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} Payment
            </Text>

            <View style={styles.walletInstructions}>
              <Text style={styles.instructionTitle}>How to pay:</Text>
              <View style={styles.instructionItem}>
                <Icon name="looks-one" size={20} color="#4A90E2" />
                <Text style={styles.instructionText}>
                  Open {selectedPaymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} app
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="looks-two" size={20} color="#4A90E2" />
                <Text style={styles.instructionText}>
                  Go to "Pay Merchant" or "Scan QR"
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="looks-3" size={20} color="#4A90E2" />
                <Text style={styles.instructionText}>
                  Enter Merchant ID: ZUGO123
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="looks-4" size={20} color="#4A90E2" />
                <Text style={styles.instructionText}>
                  Amount: PKR {finalAmount.toLocaleString()}
                </Text>
              </View>
            </View>

            <Text style={styles.walletNote}>
              After payment, you will be redirected back to confirm your booking.
            </Text>
          </View>
        );

      case 'cash_counter':
        return (
          <View style={styles.cashContainer}>
            <Icon name="store" size={60} color="#4CAF50" />
            <Text style={styles.cashTitle}>Cash at Counter</Text>
            <Text style={styles.cashDescription}>
              Pay at any of our customer service counters
            </Text>

            <View style={styles.cashInstructions}>
              <Text style={styles.instructionTitle}>Instructions:</Text>
              <View style={styles.instructionItem}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.instructionText}>
                  You'll receive a unique booking code
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.instructionText}>
                  Visit any ZUGO counter within 24 hours
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.instructionText}>
                  Show your booking code and pay PKR {finalAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="check-circle" size={20} color="#FF9800" />
                <Text style={styles.instructionText}>
                  Seats will be held for 24 hours only
                </Text>
              </View>
            </View>
          </View>
        );

      case 'bank_transfer':
        return (
          <View style={styles.bankContainer}>
            <Icon name="account-balance" size={60} color="#4A90E2" />
            <Text style={styles.bankTitle}>Bank Transfer</Text>

            <View style={styles.bankDetailsCard}>
              <Text style={styles.bankDetailLabel}>Bank Name:</Text>
              <Text style={styles.bankDetailValue}>HBL - Habib Bank Limited</Text>

              <Text style={styles.bankDetailLabel}>Account Title:</Text>
              <Text style={styles.bankDetailValue}>ZUGO TRANSPORT SERVICES</Text>

              <Text style={styles.bankDetailLabel}>Account Number:</Text>
              <Text style={styles.bankDetailValue}>1234 5678 9012 3456</Text>

              <Text style={styles.bankDetailLabel}>IBAN:</Text>
              <Text style={styles.bankDetailValue}>PK36 HABB 1234 5678 9012 3456</Text>
            </View>

            {/* Transfer Details Form */}
            <Text style={styles.inputLabel}>ACCOUNT NUMBER (for verification)</Text>
            <View style={styles.inputContainer}>
              <Icon name="account-balance" size={24} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your account number"
                placeholderTextColor="#999"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.inputLabel}>ACCOUNT TITLE</Text>
            <View style={styles.inputContainer}>
              <Icon name="person" size={24} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your account title"
                placeholderTextColor="#999"
                value={accountTitle}
                onChangeText={setAccountTitle}
              />
            </View>

            <Text style={styles.inputLabel}>BANK NAME</Text>
            <View style={styles.inputContainer}>
              <Icon name="business" size={24} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your bank name"
                placeholderTextColor="#999"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>

            <Text style={styles.walletNote}>
              After transfer, your booking will be pending until we verify the payment (2-4 hours).
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PAYMENT</Text>
        </View>

        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>BOOKING SUMMARY</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bus:</Text>
            <Text style={styles.summaryValue}>Bus {busNumber}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Seats:</Text>
            <Text style={styles.summaryValue}>{seatIds.length} seat(s)</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base Fare:</Text>
            <Text style={styles.summaryValue}>PKR {totalAmount.toLocaleString()}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee:</Text>
            <Text style={styles.summaryValue}>PKR {serviceFee}</Text>
          </View>

          {/* Discount Row */}
          <View style={styles.discountRow}>
            <View style={styles.discountInputContainer}>
              <TextInput
                style={styles.discountInput}
                placeholder="Discount Code"
                placeholderTextColor="#999"
                value={discountCode}
                onChangeText={setDiscountCode}
              />
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  discountApplied && styles.applyButtonApplied,
                ]}
                onPress={handleApplyDiscount}
                disabled={discountApplied}
              >
                <Text style={styles.applyButtonText}>
                  {discountApplied ? 'APPLIED' : 'APPLY'}
                </Text>
              </TouchableOpacity>
            </View>

            {discountApplied && (
              <View style={styles.discountAppliedRow}>
                <Icon name="local-offer" size={16} color="#4CAF50" />
                <Text style={styles.discountText}>
                  Discount: -PKR {discountAmount.toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => {
                  setDiscountCode('');
                  setDiscountApplied(false);
                  setDiscountAmount(0);
                }}>
                  <Icon name="close" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Total */}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL AMOUNT:</Text>
            <Text style={styles.totalAmount}>PKR {finalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsCard}>
          <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>

          <View style={styles.paymentMethods}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === method.id && styles.paymentMethodSelected,
                ]}
                onPress={() => handlePaymentMethodSelect(method.id)}
              >
                <View style={styles.methodIconContainer}>
                  <Icon name={method.icon as any} size={24} color="#4A90E2" />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
                {selectedPaymentMethod === method.id && (
                  <Icon name="check-circle" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Payment Method Details */}
        <View style={styles.paymentDetailsCard}>
          <Text style={styles.sectionTitle}>
            {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name} DETAILS
          </Text>
          {renderPaymentMethodDetails()}
        </View>

        {/* Processing Time Note */}
        <View style={styles.processingNote}>
          <Icon
            name={paymentMethods.find(m => m.id === selectedPaymentMethod)?.processingTime === 'instant' ? 'flash-on' : 'hourglass-empty'}
            size={20}
            color={paymentMethods.find(m => m.id === selectedPaymentMethod)?.processingTime === 'instant' ? '#4CAF50' : '#FF9800'}
          />
          <Text style={[
            styles.processingText,
            paymentMethods.find(m => m.id === selectedPaymentMethod)?.processingTime === 'instant'
              ? styles.instantText : styles.pendingText
          ]}>
            {paymentMethods.find(m => m.id === selectedPaymentMethod)?.processingTime === 'instant'
              ? 'Instant confirmation'
              : `Processing time: ${paymentMethods.find(m => m.id === selectedPaymentMethod)?.processingTime}`}
          </Text>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Icon name="security" size={20} color="#4CAF50" />
          <Text style={styles.securityText}>
            Your payment information is secure and encrypted
          </Text>
        </View>

        {/* Confirm Payment Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            isProcessing && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmPayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.confirmButtonText}>PROCESSING...</Text>
            </>
          ) : (
            <>
              <Text style={styles.confirmButtonText}>
                CONFIRM PAYMENT - PKR {finalAmount.toFixed(2)}
              </Text>
              <Icon name="lock" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  discountRow: {
    marginTop: 12,
    marginBottom: 12,
  },
  discountInputContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  discountInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginRight: 12,
  },
  applyButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  applyButtonApplied: {
    backgroundColor: '#4CAF50',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  discountAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  discountText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 12,
    flex: 1,
  },
  paymentMethodsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  paymentMethods: {
    marginBottom: 10,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginBottom: 12,
  },
  paymentMethodSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
  },
  paymentDetailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardDetailsContainer: {
    marginTop: 10,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginBottom: 20,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardDetails: {
    fontSize: 14,
    color: '#666',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInputContainer: {
    flex: 1,
    marginRight: 12,
  },
  halfInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    height: '100%',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4A90E2',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#666',
  },
  walletContainer: {
    alignItems: 'center',
    padding: 10,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
    marginBottom: 20,
  },
  walletInstructions: {
    width: '100%',
    marginBottom: 20,
  },
  cashContainer: {
    alignItems: 'center',
    padding: 10,
  },
  cashTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
    marginBottom: 8,
  },
  cashDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  cashInstructions: {
    width: '100%',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  bankContainer: {
    padding: 10,
  },
  bankTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  bankDetailsCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  bankDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  bankDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  walletNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  processingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
  },
  processingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  instantText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  pendingText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 8,
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
    shadowColor: '#999',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default PaymentScreen;