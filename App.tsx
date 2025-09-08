import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FlipsProvider } from './src/state/FlipsContext';
import Home from './src/screens/Home';
import FlipSheet from './src/screens/FlipSheet';
import Settings from './src/screens/Settings';

export type RootStackParamList = {
  Home: undefined;
  FlipSheet: { flipId?: number };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <FlipsProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="FlipSheet" component={FlipSheet} />
          <Stack.Screen name="Settings" component={Settings} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </FlipsProvider>
  );
}
