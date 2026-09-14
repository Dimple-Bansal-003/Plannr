import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { RecurringTimeBlock } from '../scheduler/types';
import { WeeklyTemplateGrid } from '../components/WeeklyTemplateGrid';
import { DEFAULT_WEEKLY_TEMPLATE } from '../storage/defaultTemplate';

interface OnboardingScreenProps {
  onComplete: (template: RecurringTimeBlock[]) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [template, setTemplate] = useState<RecurringTimeBlock[]>(DEFAULT_WEEKLY_TEMPLATE);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Progress Indicator */}
        <View style={styles.progressBar}>
          <View style={[styles.progressSegment, step >= 1 && styles.progressActive]} />
          <View style={[styles.progressSegment, step >= 2 && styles.progressActive]} />
          <View style={[styles.progressSegment, step >= 3 && styles.progressActive]} />
        </View>

        {/* Step 1: Welcome & Value Proposition */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ZERO-AI CORE • 100% DETERMINISTIC</Text>
            </View>
            <Text style={styles.title}>Plannr</Text>
            <Text style={styles.subtitle}>
              Turn your coursework deadlines into a realistic, day-by-day study schedule that fits your actual free time.
            </Text>

            <View style={styles.featureBox}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📐</Text>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Deterministic Math, Not Guesses</Text>
                  <Text style={styles.featureDesc}>
                    Priority queue + interval packing. No AI hallucinations, no random reshuffling of your day.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🔒</Text>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Zero Permissions & No Sign-In</Text>
                  <Text style={styles.featureDesc}>
                    Local-only. No account needed, no mic, camera, contacts, or calendar permissions required.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(2)}>
              <Text style={styles.buttonText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Honest Overcommit Promise */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.badgeText, { color: '#B45309' }]}>HONEST OVERCOMMIT GUARANTEE</Text>
            </View>
            <Text style={styles.title}>Propose, Never Autopilot</Text>
            <Text style={styles.subtitle}>
              Most apps pretend an impossible workload fits. Plannr warns you upfront when a deadline is at risk.
            </Text>

            <View style={styles.cardPreview}>
              <View style={styles.cardPreviewHeader}>
                <Text style={styles.cardPreviewAlert}>⚠️ AT RISK WARNING</Text>
              </View>
              <Text style={styles.cardPreviewTitle}>Operating Systems Lab 3</Text>
              <Text style={styles.cardPreviewBody}>
                Requires 4h, but only 1h of free time exists before deadline (Oct 18, 17:00). Missing 3h.
              </Text>
            </View>

            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                ✓ Schedules are proposed for your approval — never silently applied in background.
              </Text>
              <Text style={styles.bulletItem}>
                ✓ Honest arithmetic: if you do not have enough hours, it flags it clearly.
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButtonFlex} onPress={() => setStep(3)}>
                <Text style={styles.buttonText}>Set Up Free Time →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Set Free-Time Template */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>When do you study?</Text>
            <Text style={styles.stepDesc}>
              Define your recurring weekly available time. Plannr will pack your tasks into these blocks. (Editable anytime in Settings).
            </Text>

            <WeeklyTemplateGrid
              initialTemplate={template}
              onChange={(updated) => setTemplate(updated)}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButtonFlex}
                onPress={() => onComplete(template)}
              >
                <Text style={styles.buttonText}>Start Planning 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#4F46E5',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  featureBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  cardPreview: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginVertical: 12,
  },
  cardPreviewHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  cardPreviewAlert: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  cardPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 4,
  },
  cardPreviewBody: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  bulletList: {
    gap: 10,
    marginVertical: 12,
  },
  bulletItem: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonFlex: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
