import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const PrivacyPolicyScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.intro}>
          Welcome to 360Coordinates, owned and operated by Mr. Sudhakar Poul &
          Company, located in Ambegaon BK, Pune, India. By accessing or using
          our website www.360coordinates.com and services, you agree to this
          Privacy Policy. Please read it carefully before proceeding.
        </Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.body}>
          At 360Coordinates, we are committed to protecting your privacy and
          ensuring the security of your personal information. This Privacy
          Policy explains how we collect, use, store, and protect your data when
          you use our real estate platform. By using our services, you consent
          to the practices described in this policy.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.body}>
          We collect various types of information to provide and improve our
          services:
        </Text>
        <Text style={styles.listItem}>• Personal Information: Name, email address, phone number, postal address</Text>
        <Text style={styles.listItem}>• Property Information: Property details, location, pricing, images, documents</Text>
        <Text style={styles.listItem}>• Account Information: Username, password, profile details</Text>
        <Text style={styles.listItem}>• Financial Information: Payment details for premium services (processed securely)</Text>
        <Text style={styles.listItem}>• Technical Information: IP address, browser type, device information, cookies</Text>
        <Text style={styles.listItem}>• Usage Data: Pages visited, search queries, interaction with listings</Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.body}>
          Your personal information is used only for the following purposes:
        </Text>
        <Text style={styles.listItem}>• To provide and deliver our real estate services</Text>
        <Text style={styles.listItem}>• To connect buyers, sellers, homeowners, and real estate agents</Text>
        <Text style={styles.listItem}>• To process property listings and inquiries</Text>
        <Text style={styles.listItem}>• To communicate with you about services, updates, and support</Text>
        <Text style={styles.listItem}>• To improve website functionality and user experience</Text>
        <Text style={styles.listItem}>• To send promotional offers and marketing communications (with your consent)</Text>
        <Text style={styles.listItem}>• To prevent fraud and ensure platform security</Text>
        <Text style={styles.listItem}>• To comply with legal obligations and resolve disputes</Text>

        <Text style={styles.sectionTitle}>4. How We Share Your Information</Text>
        <Text style={styles.body}>
          We respect your privacy and do not sell your personal information to
          third parties. However, we may share your information in the following
          circumstances:
        </Text>
        <Text style={styles.listItem}>• With Other Users: Property listings and contact details shared to facilitate transactions</Text>
        <Text style={styles.listItem}>• With Service Providers: Third-party vendors who help us operate the platform (payment processors, hosting services)</Text>
        <Text style={styles.listItem}>• With Real Estate Agents: When you request to connect with agents for property services</Text>
        <Text style={styles.listItem}>• Legal Requirements: When required by law, court order, or government regulations</Text>
        <Text style={styles.listItem}>• Business Transfers: In case of merger, acquisition, or sale of company assets</Text>
        <Text style={styles.body}>
          We ensure that all third parties maintain strict confidentiality and
          security standards.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.body}>
          We take data security seriously and implement industry-standard
          measures to protect your information:
        </Text>
        <Text style={styles.listItem}>• Secure SSL encryption for data transmission</Text>
        <Text style={styles.listItem}>• Password-protected user accounts</Text>
        <Text style={styles.listItem}>• Regular security audits and updates</Text>
        <Text style={styles.listItem}>• Restricted access to personal data by authorized personnel only</Text>
        <Text style={styles.listItem}>• Secure payment processing through trusted gateways</Text>
        <Text style={styles.body}>
          However, no method of transmission over the internet is 100% secure.
          While we strive to protect your data, we cannot guarantee absolute
          security.
        </Text>

        <Text style={styles.sectionTitle}>6. Cookies and Tracking Technologies</Text>
        <Text style={styles.body}>
          360Coordinates uses cookies and similar tracking technologies to
          enhance your browsing experience:
        </Text>
        <Text style={styles.listItem}>• Essential Cookies: Required for website functionality</Text>
        <Text style={styles.listItem}>• Performance Cookies: Help us understand how users interact with the site</Text>
        <Text style={styles.listItem}>• Functional Cookies: Remember your preferences and settings</Text>
        <Text style={styles.listItem}>• Marketing Cookies: Track your activity to display relevant advertisements</Text>
        <Text style={styles.body}>
          You can manage or disable cookies through your browser settings. Note
          that disabling cookies may affect website functionality.
        </Text>

        <Text style={styles.sectionTitle}>7. Your Rights and Choices</Text>
        <Text style={styles.body}>
          You have the following rights regarding your personal information:
        </Text>
        <Text style={styles.listItem}>• Access: Request a copy of the personal data we hold about you</Text>
        <Text style={styles.listItem}>• Correction: Update or correct inaccurate information</Text>
        <Text style={styles.listItem}>• Deletion: Request deletion of your account and personal data</Text>
        <Text style={styles.listItem}>• Opt-Out: Unsubscribe from marketing emails at any time</Text>
        <Text style={styles.listItem}>• Data Portability: Request your data in a portable format</Text>
        <Text style={styles.listItem}>• Withdraw Consent: Revoke consent for data processing where applicable</Text>
        <Text style={styles.body}>
          To exercise these rights, please contact us using the information
          provided in Section 12.
        </Text>

        <Text style={styles.sectionTitle}>8. Data Retention</Text>
        <Text style={styles.body}>
          We retain your personal information only for as long as necessary to
          fulfill the purposes outlined in this Privacy Policy, unless a longer
          retention period is required by law. When data is no longer needed, we
          will securely delete or anonymize it.
        </Text>
        <Text style={styles.listItem}>• Active user accounts: Data retained while account is active</Text>
        <Text style={styles.listItem}>• Inactive accounts: Data may be deleted after prolonged inactivity</Text>
        <Text style={styles.listItem}>• Transaction records: Retained for legal and accounting purposes</Text>
        <Text style={styles.listItem}>• Marketing data: Retained until you opt-out or unsubscribe</Text>

        <Text style={styles.sectionTitle}>9. Third-Party Links</Text>
        <Text style={styles.body}>
          Our website may contain links to third-party websites, services, or
          advertisements. We are not responsible for the privacy practices or
          content of these external sites. We encourage you to review the
          privacy policies of any third-party sites you visit.
        </Text>

        <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
        <Text style={styles.body}>
          360Coordinates is not intended for use by individuals under the age of
          18. We do not knowingly collect personal information from children. If
          we discover that we have inadvertently collected data from a minor, we
          will promptly delete it. If you believe a child has provided us with
          personal information, please contact us immediately.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to This Privacy Policy</Text>
        <Text style={styles.body}>
          We reserve the right to update or modify this Privacy Policy at any
          time to reflect changes in our practices or legal requirements. The
          "Last Updated" date at the top of this page will indicate when the
          policy was last revised. Continued use of our services after changes
          are posted constitutes your acceptance of the updated policy.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Information</Text>
        <Text style={styles.body}>
          If you have any questions, concerns, or requests regarding this
          Privacy Policy or how we handle your personal information, please
          contact us:
        </Text>
        <Text style={styles.contactBlock}>
          360Coordinates – Mr. Sudhakar Poul & Company{'\n'}
          Ambegaon BK, Pune, Maharashtra, India{'\n'}
          Email: info@360coordinates.com{'\n'}
          Phone: +91 98606 38920
        </Text>
        <Text style={styles.footer}>
          By continuing to use 360Coordinates, you acknowledge that you have
          read, understood, and agree to be bound by this Privacy Policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
    marginLeft: 4,
  },
  contactBlock: {
    fontSize: 14,
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  footer: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default PrivacyPolicyScreen;

