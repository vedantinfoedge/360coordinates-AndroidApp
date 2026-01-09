import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography} from '../../theme';
import BuyerHeader from '../../components/BuyerHeader';
import PropertyMapView from '../../components/map/PropertyMapView';
import {useAuth} from '../../context/AuthContext';

type PropertyMapScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: PropertyMapScreenNavigationProp;
  route?: {
    params?: {
      listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
    };
  };
};

const PropertyMapScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout} = useAuth();
  const listingType = route?.params?.listingType || 'all';

  const handlePropertyPress = (property: any) => {
    try {
      navigation.navigate('PropertyDetails', {propertyId: String(property.id)});
    } catch (error: any) {
      console.error('Error navigating to property details:', error);
    }
  };

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      <PropertyMapView
        onPropertyPress={handlePropertyPress}
        showListToggle={true}
        listingType={listingType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default PropertyMapScreen;

