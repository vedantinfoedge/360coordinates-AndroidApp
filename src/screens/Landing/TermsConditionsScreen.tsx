import React from 'react';
import {Text, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const TermsConditionsScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.intro}>
          Welcome to 360Coordinates, owned and operated by Mr. Sudhakar Poul &
          Company, located in Ambegaon BK, Pune, India. By accessing or using
          our website www.360coordinates.com and services, you agree to comply
          with these Terms & Conditions. Please read them carefully before
          proceeding.
        </Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.body}>
          360Coordinates is a real estate service platform designed to connect
          buyers, sellers, homeowners, and real estate agents across India. By
          using our services, you accept these terms and confirm that you are
          legally capable of entering into a binding agreement.
        </Text>

        <Text style={styles.sectionTitle}>2. Services Provided</Text>
        <Text style={styles.body}>
          360Coordinates offers a wide range of real estate-related services,
          including:
        </Text>
        <Text style={styles.listItem}>• Property listing for buyers and sellers</Text>
        <Text style={styles.listItem}>• Lead generation for real estate agents</Text>
        <Text style={styles.listItem}>• Property marketing and promotion</Text>
        <Text style={styles.listItem}>• Homeowner property management support</Text>
        <Text style={styles.listItem}>• Real estate consultation and guidance</Text>
        <Text style={styles.body}>
          We reserve the right to add, modify, or discontinue services at any
          time.
        </Text>

        <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
        <Text style={styles.body}>
          By using 360Coordinates, you agree that:
        </Text>
        <Text style={styles.listItem}>• All information you submit (property details, contact info, documents, etc.) is accurate and genuine.</Text>
        <Text style={styles.listItem}>• You will not upload any misleading, fraudulent, abusive, or illegal content.</Text>
        <Text style={styles.listItem}>• You will use the platform only for lawful real estate dealings.</Text>
        <Text style={styles.listItem}>• You will not attempt to copy, hack, or misuse the platform or its resources.</Text>

        <Text style={styles.sectionTitle}>4. Property Listings & Accuracy</Text>
        <Text style={styles.body}>
          360Coordinates does not guarantee the accuracy, legality, or
          authenticity of property listings shared by users. All users (buyer,
          seller, agent, homeowner) are responsible for verifying:
        </Text>
        <Text style={styles.listItem}>• Ownership documents</Text>
        <Text style={styles.listItem}>• Property conditions</Text>
        <Text style={styles.listItem}>• Legal permissions</Text>
        <Text style={styles.listItem}>• Pricing & availability</Text>
        <Text style={styles.body}>
          360Coordinates is not liable for disputes between users.
        </Text>

        <Text style={styles.sectionTitle}>5. Payments & Fees</Text>
        <Text style={styles.body}>
          Some services provided by 360Coordinates may require payment. You
          agree that:
        </Text>
        <Text style={styles.listItem}>• All payments are non-refundable unless stated otherwise.</Text>
        <Text style={styles.listItem}>• Prices may change based on service updates.</Text>
        <Text style={styles.listItem}>• Payment details provided must be valid and authorized.</Text>

        <Text style={styles.sectionTitle}>6. Third-Party Services</Text>
        <Text style={styles.body}>
          360Coordinates may link you to third-party websites, agents, or
          service vendors. We are not responsible for:
        </Text>
        <Text style={styles.listItem}>• External site content</Text>
        <Text style={styles.listItem}>• Vendor service quality</Text>
        <Text style={styles.listItem}>• Third-party policies</Text>
        <Text style={styles.body}>
          Users must verify independently before proceeding.
        </Text>

        <Text style={styles.sectionTitle}>7. Intellectual Property Rights</Text>
        <Text style={styles.body}>
          All content on 360Coordinates—including logos, text, graphics, data,
          and website design—belongs to Mr. Sudhakar Poul & Company. Users may
          not copy, reproduce, modify, or distribute any content without written
          permission.
        </Text>

        <Text style={styles.sectionTitle}>8. Privacy & Data Protection</Text>
        <Text style={styles.body}>
          Your personal information is used only to:
        </Text>
        <Text style={styles.listItem}>• Deliver services</Text>
        <Text style={styles.listItem}>• Connect buyers, sellers, and agents</Text>
        <Text style={styles.listItem}>• Provide support</Text>
        <Text style={styles.listItem}>• Improve website experience</Text>
        <Text style={styles.body}>
          We never sell or misuse user data. Please read our Privacy Policy for
          detailed information.
        </Text>

        <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
        <Text style={styles.body}>
          360Coordinates is not responsible for:
        </Text>
        <Text style={styles.listItem}>• Property disputes</Text>
        <Text style={styles.listItem}>• Fraudulent user activities</Text>
        <Text style={styles.listItem}>• Incorrect or outdated listings</Text>
        <Text style={styles.listItem}>• Losses arising from user decisions</Text>
        <Text style={styles.listItem}>• Service interruption or technical errors</Text>
        <Text style={styles.body}>
          Users are advised to conduct proper due diligence before finalizing
          any deal.
        </Text>

        <Text style={styles.sectionTitle}>10. Account Termination</Text>
        <Text style={styles.body}>
          We may suspend or terminate access to 360Coordinates if:
        </Text>
        <Text style={styles.listItem}>• User violates terms</Text>
        <Text style={styles.listItem}>• Fraudulent or illegal activity is detected</Text>
        <Text style={styles.listItem}>• Misuse of platform is identified</Text>
        <Text style={styles.body}>
          No refunds will be provided for terminated accounts.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
        <Text style={styles.body}>
          360Coordinates reserves the right to update or change these Terms &
          Conditions at any time. Continued use of the site means you agree to
          the updated terms.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Information</Text>
        <Text style={styles.body}>
          For any queries or support, contact:
        </Text>
        <Text style={styles.contactBlock}>
          360Coordinates – Mr. Sudhakar Poul & Company{'\n'}
          Ambegaon BK, Pune, Maharashtra, India{'\n'}
          Email: info@360coordinates.com{'\n'}
          Phone: +91 98606 38920
        </Text>
        <Text style={styles.footer}>
          By continuing to use 360Coordinates, you acknowledge that you have
          read, understood, and agree to be bound by these Terms & Conditions.
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

export default TermsConditionsScreen;

