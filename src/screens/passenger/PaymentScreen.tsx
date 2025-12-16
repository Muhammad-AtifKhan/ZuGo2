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
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type PaymentScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<PassengerStackParamList, 'Payment'>;

const PaymentScreen = () => {
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const route = useRoute<PaymentScreenRouteProp>();
  const { busId, seatIds, totalAmount } = route.params;

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);

  const serviceFee = 1;
  const finalAmount = totalAmount + serviceFee - discountAmount;

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

  // Mock wallet options
  const walletOptions = [
    { id: 'jazzcash', name: 'JazzCash', icon: 'smartphone' },
    { id: 'easypaisa', name: 'EasyPaisa', icon: 'smartphone' },
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

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);

    // Reset card details if switching from card
    if (method !== 'card') {
      setCardNumber('');
      setCardExpiry('');
      setCardCVV('');
      setCardholderName('');
    }
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

  const handleConfirmPayment = () => {
    if (selectedPaymentMethod === 'card') {
      if (!validateCardDetails()) {
        return;
      }
    }

    if (selectedPaymentMethod === 'cash') {
      Alert.alert(
        'Cash Payment',
        'Please pay the driver in cash when boarding. Amount: $' + finalAmount,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Confirm',
            onPress: processPayment,
          },
        ]
      );
      return;
    }

    processPayment();
  };

  const processPayment = () => {
    setIsProcessing(true);

    // Mock payment processing
    setTimeout(() => {
      setIsProcessing(false);

      // Mock successful payment
      const bookingId = 'TKT-' + Date.now().toString().slice(-6);

      Alert.alert(
        'Payment Successful!',
        'Your booking has been confirmed.',
        [
          {
            text: 'View Ticket',
            onPress: () => {
              navigation.navigate('BookingConfirmation', {
                bookingId,
              });
            },
          },
        ]
      );
    }, 2000);
  };

  const renderPaymentMethod = () => {
    switch (selectedPaymentMethod) {
      case 'card':
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

      case 'wallet':
        return (
          <View style={styles.walletContainer}>
            <Text style={styles.sectionTitle}>SELECT WALLET</Text>
            {walletOptions.map(wallet => (
              <TouchableOpacity
                key={wallet.id}
                style={styles.walletOption}
                onPress={() => Alert.alert('Wallet Selected', `Redirecting to ${wallet.name}`)}
              >
                <View style={styles.walletIconContainer}>
                  <Icon name={wallet.icon as any} size={28} color="#4A90E2" />
                </View>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletName}>{wallet.name}</Text>
                  <Text style={styles.walletStatus}>Connected</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>
            ))}

            <Text style={styles.walletNote}>
              You will be redirected to the selected wallet app to complete payment
            </Text>
          </View>
        );

      case 'cash':
        return (
          <View style={styles.cashContainer}>
            <Icon name="attach-money" size={60} color="#4CAF50" />
            <Text style={styles.cashTitle}>Cash Payment</Text>
            <Text style={styles.cashDescription}>
              Pay the driver in cash when boarding the bus. Please have exact change ready.
            </Text>

            <View style={styles.cashInstructions}>
              <Text style={styles.instructionTitle}>Instructions:</Text>
              <View style={styles.instructionItem}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.instructionText}>Show your ticket QR code to driver</Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.instructionText}>Pay exact amount: ${finalAmount}</Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.instructionText}>Get receipt from driver</Text>
              </View>
            </View>
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
            <Text style={styles.summaryValue}>Bus {busId}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Seats:</Text>
            <Text style={styles.summaryValue}>{seatIds.length} seat(s)</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base Fare:</Text>
            <Text style={styles.summaryValue}>${totalAmount}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee:</Text>
            <Text style={styles.summaryValue}>${serviceFee}</Text>
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
                  Discount: -${discountAmount.toFixed(2)}
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
            <Text style={styles.totalAmount}>${finalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsCard}>
          <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>

          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === 'card' && styles.paymentMethodSelected,
              ]}
              onPress={() => handlePaymentMethodSelect('card')}
            >
              <View style={styles.methodIconContainer}>
                <Icon name="credit-card" size={24} color="#4A90E2" />
              </View>
              <Text style={styles.methodText}>Credit/Debit Card</Text>
              {selectedPaymentMethod === 'card' && (
                <Icon name="check-circle" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === 'wallet' && styles.paymentMethodSelected,
              ]}
              onPress={() => handlePaymentMethodSelect('wallet')}
            >
              <View style={styles.methodIconContainer}>
                <Icon name="smartphone" size={24} color="#4A90E2" />
              </View>
              <Text style={styles.methodText}>Mobile Wallet</Text>
              {selectedPaymentMethod === 'wallet' && (
                <Icon name="check-circle" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === 'cash' && styles.paymentMethodSelected,
              ]}
              onPress={() => handlePaymentMethodSelect('cash')}
            >
              <View style={styles.methodIconContainer}>
                <Icon name="attach-money" size={24} color="#4A90E2" />
              </View>
              <Text style={styles.methodText}>Cash on Board</Text>
              {selectedPaymentMethod === 'cash' && (
                <Icon name="check-circle" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Payment Method Details */}
        <View style={styles.paymentDetailsCard}>
          {renderPaymentMethod()}
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Icon name="security" size={20} color="#4CAF50" />
          <Text style={styles.securityText}>
            Your payment is secure and encrypted
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
              <Icon name="hourglass-empty" size={20} color="#FFF" />
              <Text style={styles.confirmButtonText}>PROCESSING...</Text>
            </>
          ) : (
            <>
              <Text style={styles.confirmButtonText}>
                CONFIRM PAYMENT - ${finalAmount.toFixed(2)}
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
          <Text style={styles.cancelButtonText}>Cancel Payment</Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
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
    marginTop: 10,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginBottom: 12,
  },
  walletIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  walletStatus: {
    fontSize: 14,
    color: '#4CAF50',
  },
  walletNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  cashContainer: {
    alignItems: 'center',
    padding: 20,
  },
  cashTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 20,
    marginBottom: 12,
  },
  cashDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  cashInstructions: {
    width: '100%',
  },
  instructionTitle: {
    fontSize: 18,
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
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
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