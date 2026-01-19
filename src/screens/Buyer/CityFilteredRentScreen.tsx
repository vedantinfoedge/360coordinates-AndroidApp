import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../../context/AuthContext';
import BuyerHeader from '../../components/BuyerHeader';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const CityFilteredRentScreen: React.FC<Props> = ({navigation}) => {
  const {logout, user, isAuthenticated} = useAuth();
  
  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;
  
  return (
    <SafeAreaView style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={isLoggedIn ? logout : undefined}
        onSignInPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', {screen: 'Login'})
            : undefined
        }
        onSignUpPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', {screen: 'Register'})
            : undefined
        }
        showLogout={isLoggedIn}
        showProfile={isLoggedIn}
        showSignIn={isGuest}
        showSignUp={isGuest}
      />
      <View style={styles.content}>
        <Text style={styles.title}>City Filtered Rent</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default CityFilteredRentScreen;

