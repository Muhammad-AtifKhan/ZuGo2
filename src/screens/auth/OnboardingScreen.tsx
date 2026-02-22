// src/screens/auth/OnboardingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// 👇 PROPS DEFINE KARO
interface Props {
  onComplete?: () => void;  // OPTIONAL PROP - AGAR NA HO TO NAVIGATION USE KARO
}

export default function OnboardingScreen({ onComplete }: Props) {
  const navigation = useNavigation<any>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      emoji: '🚌',
      title: 'Welcome to ZuGo',
      description:
        'Smart urban mobility for Pakistan. Book buses, track routes, and travel seamlessly.',
      color: '#1a73e8',
    },
    {
      emoji: '📱',
      title: 'Easy & Smart Travel',
      description:
        'Book rides instantly, track buses live, and make secure digital payments.',
      color: '#34a853',
    },
    {
      emoji: '🏢',
      title: 'Manage Your Transport Business',
      description:
        'Add drivers, manage fleet, track revenue, and optimize routes efficiently.',
      color: '#ea4335',
    },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 👇 LAST SLIDE - ONBOARDING COMPLETE
      if (onComplete) {
        // AGAR onComplete PROP DI HAI TO USE KARO
        onComplete();
      } else {
        // WARNA NAVIGATION SE LOGIN PE JAO (FALLBACK)
        navigation.replace('Login');
      }
    }
  };

  const handleSkip = () => {
    // 👇 SKIP KARNE PAR BHI ONBOARDING COMPLETE
    if (onComplete) {
      onComplete();
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>

          {/* Illustration */}
          <View style={styles.illustration}>
            <Text style={styles.emoji}>{slides[currentIndex].emoji}</Text>
          </View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {slides[currentIndex].title}
            </Text>
            <Text style={styles.description}>
              {slides[currentIndex].description}
            </Text>
          </View>

          {/* Bottom */}
          <View style={styles.bottomContainer}>

            {/* Pagination */}
            <View style={styles.pagination}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {currentIndex < slides.length - 1 ? (
                <>
                  <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                  >
                    <Text style={styles.nextText}>Next</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={handleNext}
                >
                  <Text style={styles.getStartedText}>
                    Get Started
                  </Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  illustration: {
    flex: 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emoji: {
    fontSize: 120,
  },
  textContainer: {
    flex: 0.25,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#202124',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#5f6368',
    lineHeight: 24,
  },
  bottomContainer: {
    flex: 0.2,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DADCE0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1a73e8',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#5f6368',
  },
  nextButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  nextText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  getStartedButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});