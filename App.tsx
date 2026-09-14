import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './src/context/AppContext';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';

const MainNavigator: React.FC = () => {
  const { isOnboarded, isLoading, finishOnboarding } = useApp();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {!isOnboarded ? (
        <OnboardingScreen onComplete={finishOnboarding} />
      ) : (
        <HomeScreen />
      )}
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
