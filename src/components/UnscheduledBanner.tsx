import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface UnscheduledBannerProps {
  onRecalculate: () => void;
}

export const UnscheduledBanner: React.FC<UnscheduledBannerProps> = ({ onRecalculate }) => {
  return (
    <View style={styles.banner}>
      <View style={styles.textContainer}>
        <Text style={styles.icon}>⚠️</Text>
        <View style={styles.content}>
          <Text style={styles.title}>New Task Added (Not Yet Scheduled)</Text>
          <Text style={styles.subtext}>
            Your schedule hasn't been changed. Tap below to calculate an updated plan.
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={onRecalculate}>
        <Text style={styles.buttonText}>Recalculate Plan</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  subtext: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
