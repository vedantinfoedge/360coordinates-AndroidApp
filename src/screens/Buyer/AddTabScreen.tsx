import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerStackParamList} from '../../navigation/BuyerNavigator';
import {MainStackParamList} from '../../navigation/MainStackNavigator';
import {colors, spacing, typography} from '../../theme';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';

type AddTabNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerStackParamList & MainStackParamList, 'Add'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: AddTabNavigationProp;
};

const AddTabScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const {isAuthenticated} = useAuth();

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <BuyerHeader
        showProfile={isAuthenticated}
        showSignIn={!isAuthenticated}
        showSignUp={!isAuthenticated}
        onProfilePress={() => navigation.navigate('Profile')}
        onSignInPress={() => navigation.getParent()?.navigate('Auth')}
        onSignUpPress={() => navigation.getParent()?.navigate('Auth')}
      />
      <View style={styles.content}>
        <Text style={styles.placeholder}>Add</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    ...typography.h3,
    color: colors.textSecondary,
  },
});

export default AddTabScreen;
