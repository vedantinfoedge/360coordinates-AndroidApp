import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../../context/AuthContext';
import BuyerHeader from '../../components/BuyerHeader';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const CityFilteredBuyScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  
  return (
    <SafeAreaView style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      <View style={styles.content}>
        <Text style={styles.title}>City Filtered Buy</Text>
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

export default CityFilteredBuyScreen;

