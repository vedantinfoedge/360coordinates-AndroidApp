import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon } from '../../components/navigation/TabIcons';
import BuyerHeader from '../../components/BuyerHeader';
import { useAuth } from '../../context/AuthContext';
import { contactService } from '../../services/contact.service';

type SupportScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SupportScreenNavigationProp;
};

const faqs = [
  {
    id: '1',
    question: 'How do I search for properties?',
    answer:
      'You can search for properties using the search bar on the home screen. Enter city, locality, or project name. You can also use filters to narrow down your search by property type, price range, bedrooms, and more.',
  },
  {
    id: '2',
    question: 'How do I contact a property owner?',
    answer:
      'On any property details page, you can click "View Contact" to see the owner\'s contact details, or use "Chat with Owner" to start a conversation directly through the app.',
  },
  {
    id: '3',
    question: 'Can I save properties to favorites?',
    answer:
      'Yes! Click the heart icon on any property card or property details page to add it to your favorites. You can view all your favorite properties in the Favorites tab.',
  },
  {
    id: '4',
    question: 'How do I list my property?',
    answer:
      'If you are a Seller or Agent, you can list your property by going to your dashboard and clicking "Add Property". Fill in all the required details and submit.',
  },
  {
    id: '5',
    question: 'What information do I need to register?',
    answer:
      'To register, you need to provide your full name, email address, password, and select your role (Buyer/Tenant, Seller/Owner, or Agent/Builder).',
  },
  {
    id: '6',
    question: 'How do I update my profile?',
    answer:
      'Go to the Profile tab, click "Edit Profile", make your changes, and click "Save". Your profile information will be updated.',
  },
  {
    id: '7',
    question: 'What payment methods are accepted?',
    answer:
      'Currently, we support direct contact with property owners. Payment transactions are handled directly between buyers and sellers outside the app.',
  },
  {
    id: '8',
    question: 'How do I report a problem?',
    answer:
      'You can contact our support team via email at info@360coordinates.com or use the contact form on this support page. We typically respond within 24 hours.',
  },
];

const SupportScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { logout, user, isAuthenticated } = useAuth();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;
  const [loading, setLoading] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleEmailPress = () => {
    const email = 'info@360coordinates.com';
    const subject = 'Support Query';
    const body = '';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch((err: any) => console.error('Error opening email:', err));
  };

  const handlePhonePress = () => {
    // You can add a phone number if available
    // Linking.openURL('tel:+911234567890');
  };

  const handleLocationPress = () => {
    const address = 'Pune, Maharashtra, India';
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    });
    if (url) {
      Linking.openURL(url).catch((err: any) =>
        console.error('Error opening maps:', err),
      );
    }
  };

  const handleSubmitContact = async () => {
    const validation = contactService.validate(contactForm);
    if (!validation.valid) {
      Alert.alert('Error', validation.error);
      return;
    }

    setLoading(true);
    try {
      const result = await contactService.send(contactForm);
      if (result?.success) {
        Alert.alert('Success', 'Your message has been sent successfully!');
        setContactForm({ name: '', email: '', phone: '', message: '' });
      } else {
        throw new Error(result?.message || 'Failed to send message.');
      }
    } catch (error: any) {
      console.error('Contact Form Error:', error);
      Alert.alert('Error', error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => {
          // Already on support page - do nothing
        }}
        onLogoutPress={isLoggedIn ? logout : undefined}
        onSignInPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', { screen: 'Login' })
            : undefined
        }
        onSignUpPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', { screen: 'Register' })
            : undefined
        }
        showLogout={isLoggedIn}
        showProfile={isLoggedIn}
        showSignIn={isGuest}
        showSignUp={isGuest}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.md }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}>
        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          {/* Email */}
          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleEmailPress}>
            <View style={styles.contactIconContainer}>
              <TabIcon name="mail" color={colors.primary} size={24} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>info@360coordinates.com</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Location */}
          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleLocationPress}>
            <View style={styles.contactIconContainer}>
              <TabIcon name="location" color={colors.primary} size={24} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Location</Text>
              <Text style={styles.contactValue}>Pune, Maharashtra, India</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        {/* FAQs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map(faq => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() =>
                  setExpandedFaq(expandedFaq === faq.id ? null : faq.id)
                }>
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Text style={styles.faqToggle}>
                  {expandedFaq === faq.id ? '−' : '+'}
                </Text>
              </TouchableOpacity>
              {expandedFaq === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Form Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          <Text style={styles.sectionSubtitle}>
            Have a question? Fill out the form below and we'll get back to you.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
                value={contactForm.name}
                onChangeText={(text: string) =>
                  setContactForm({ ...contactForm, name: text })
                }
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={contactForm.email}
                onChangeText={(text: string) =>
                  setContactForm({ ...contactForm, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone (min 10 digits)"
                placeholderTextColor={colors.textSecondary}
                value={contactForm.phone}
                onChangeText={(text: string) =>
                  setContactForm({ ...contactForm, phone: text })
                }
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your message"
                placeholderTextColor={colors.textSecondary}
                value={contactForm.message}
                onChangeText={(text: string) =>
                  setContactForm({ ...contactForm, message: text })
                }
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && { opacity: 0.7 }]}
              onPress={handleSubmitContact}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contactIcon: {
    fontSize: 24,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  contactValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  contactArrow: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 70,
  },
  faqItem: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  faqQuestionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontWeight: '600',
    fontSize: 15,
  },
  faqToggle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  faqAnswer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  faqAnswerText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    marginTop: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 120,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default SupportScreen;

