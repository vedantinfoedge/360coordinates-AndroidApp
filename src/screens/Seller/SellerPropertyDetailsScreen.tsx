import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const SellerPropertyDetailsScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  
  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onSubscriptionPress={() => navigation.navigate('Subscription')}
        onLogoutPress={logout}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Seller Property Details</Text>
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

export default SellerPropertyDetailsScreen;

