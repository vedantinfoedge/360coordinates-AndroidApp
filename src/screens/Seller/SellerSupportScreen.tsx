import React, {useState, useRef} from 'react';
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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import SellerHeader from '../../components/SellerHeader';
import {useAuth} from '../../context/AuthContext';

type SupportScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<SellerTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SupportScreenNavigationProp;
};

const faqs = [
  {
    id: '1',
    question: 'How do I list my property?',
    answer:
      'Go to your dashboard and click "Add Property". Fill in all the required details including property type, location, price, amenities, and upload photos. Once submitted, your property will be reviewed and published.',
  },
  {
    id: '2',
    question: 'How do I edit or delete my property listing?',
    answer:
      'Go to "My Properties" tab, find your property, and click "Edit" to update details or "Delete" to remove the listing.',
  },
  {
    id: '3',
    question: 'How do I respond to inquiries?',
    answer:
      'Go to the "Inquiries" tab to see all inquiries about your properties. Click on any inquiry to view details and respond through the chat feature.',
  },
  {
    id: '4',
    question: 'What information do I need to provide when listing a property?',
    answer:
      'You need to provide property title, type, location, price, number of bedrooms/bathrooms, area, amenities, property description, and photos (up to 10 images).',
  },
  {
    id: '5',
    question: 'How long does it take for my property to be published?',
    answer:
      'Properties are typically reviewed and published within 24-48 hours of submission. You will receive a notification once your property is live.',
  },
  {
    id: '6',
    question: 'Can I promote my property listing?',
    answer:
      'Yes! Featured properties get more visibility. Contact our support team for promotion options.',
  },
  {
    id: '7',
    question: 'How do I update my profile information?',
    answer:
      'Go to the Profile tab, click "Edit", make your changes, and click "Save". Your profile information will be updated.',
  },
  {
    id: '8',
    question: 'How do I report a problem?',
    answer:
      'You can contact our support team via email at info@360coordinates.com or use the contact form on this support page. We typically respond within 24 hours.',
  },
];

const SellerSupportScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const {logout} = useAuth();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleEmailPress = () => {
    const email = 'info@360coordinates.com';
    const subject = 'Support Query';
    const body = '';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(err => console.error('Error opening email:', err));
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
      Linking.openURL(url).catch(err =>
        console.error('Error opening maps:', err),
      );
    }
  };

  const handleSubmitContact = () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      return;
    }
    // In real app, send to backend
    const email = 'info@360coordinates.com';
    const subject = contactForm.subject || 'Contact Form Query';
    const body = `Name: ${contactForm.name}\nEmail: ${contactForm.email}\n\nMessage:\n${contactForm.message}`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(err => console.error('Error opening email:', err));
    // Reset form
    setContactForm({name: '', email: '', subject: '', message: ''});
  };

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => {
          // Already on support page
        }}
        onSubscriptionPress={() => navigation.navigate('Subscription')}
        onLogoutPress={logout}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true}
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
              <Text style={styles.contactIcon}>📧</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>info@360coordinates.com</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Location */}
          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleLocationPress}>
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>📍</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Location</Text>
              <Text style={styles.contactValue}>Pune, Maharashtra, India</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
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
                onChangeText={text =>
                  setContactForm({...contactForm, name: text})
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
                onChangeText={text =>
                  setContactForm({...contactForm, email: text})
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter subject"
                placeholderTextColor={colors.textSecondary}
                value={contactForm.subject}
                onChangeText={text =>
                  setContactForm({...contactForm, subject: text})
                }
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your message"
                placeholderTextColor={colors.textSecondary}
                value={contactForm.message}
                onChangeText={text =>
                  setContactForm({...contactForm, message: text})
                }
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitContact}>
              <Text style={styles.submitButtonText}>Send Message</Text>
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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md, // Minimal top padding since header starts hidden
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceSecondary,
    marginBottom: spacing.md,
  },
  contactIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  contactIcon: {
    fontSize: 20,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: '600',
  },
  contactValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
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
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    minHeight: 60,
  },
  faqQuestionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
    paddingRight: spacing.md,
  },
  faqToggle: {
    ...typography.h2,
    color: colors.primary,
    fontSize: 28,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  faqAnswer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  faqAnswerText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    fontSize: 15,
  },
  form: {
    marginTop: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 15,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 48,
  },
  textArea: {
    height: 140,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 52,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});

export default SellerSupportScreen;

