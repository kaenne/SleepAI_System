import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as React from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { generateInsight, useSleepJournal } from "@/hooks/use-sleep-journal";

export default function AddSleepEntryModal() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { addEntry } = useSleepJournal();

  const [sleepHours, setSleepHours] = React.useState(7);
  const [stressLevel, setStressLevel] = React.useState(5);
  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const insight = React.useMemo(
    () => generateInsight({ sleepHours, stressLevel }),
    [sleepHours, stressLevel],
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addEntry({
        sleepHours,
        stressLevel,
        note: note.trim() || undefined,
      });
      Alert.alert("✅ Saved!", "Your sleep entry has been recorded.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sleepEmoji = sleepHours >= 8 ? "😴" : sleepHours >= 6 ? "😊" : "😫";
  const stressEmoji = stressLevel <= 3 ? "😌" : stressLevel <= 6 ? "😐" : "😰";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.headerContent}
          >
            <Pressable onPress={() => router.back()} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.headerText}>
              <ThemedText style={styles.headerTitle}>
                📝 Log Your Sleep
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                How did you sleep last night?
              </ThemedText>
            </View>
            <View style={{ width: 40 }} />
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sleep Hours Slider */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <Card variant="elevated">
              <View style={styles.sliderSection}>
                <View style={styles.sliderHeader}>
                  <ThemedText style={styles.sliderLabel}>
                    🌙 Sleep Duration
                  </ThemedText>
                  <ThemedText
                    style={[styles.sliderValue, { color: colors.tint }]}
                  >
                    {sleepHours}h {sleepEmoji}
                  </ThemedText>
                </View>
                <View style={styles.sliderTrack}>
                  {[...Array(13)].map((_, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setSleepHours(i)}
                      style={[
                        styles.sliderDot,
                        {
                          backgroundColor:
                            i <= sleepHours ? colors.tint : colors.cardBorder,
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.sliderLabels}>
                  <ThemedText
                    style={[styles.sliderMinMax, { color: colors.muted }]}
                  >
                    0h
                  </ThemedText>
                  <ThemedText
                    style={[styles.sliderMinMax, { color: colors.muted }]}
                  >
                    12h
                  </ThemedText>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Stress Level Slider */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <Card variant="elevated">
              <View style={styles.sliderSection}>
                <View style={styles.sliderHeader}>
                  <ThemedText style={styles.sliderLabel}>
                    😓 Stress Level
                  </ThemedText>
                  <ThemedText
                    style={[styles.sliderValue, { color: colors.accent }]}
                  >
                    {stressLevel}/10 {stressEmoji}
                  </ThemedText>
                </View>
                <View style={styles.sliderTrack}>
                  {[...Array(10)].map((_, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setStressLevel(i + 1)}
                      style={[
                        styles.stressDot,
                        {
                          backgroundColor:
                            i + 1 <= stressLevel
                              ? stressLevel <= 3
                                ? colors.success
                                : stressLevel <= 6
                                  ? colors.warning
                                  : colors.danger
                              : colors.cardBorder,
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.sliderLabels}>
                  <ThemedText
                    style={[styles.sliderMinMax, { color: colors.muted }]}
                  >
                    Low
                  </ThemedText>
                  <ThemedText
                    style={[styles.sliderMinMax, { color: colors.muted }]}
                  >
                    High
                  </ThemedText>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Note Input */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <Card variant="elevated">
              <ThemedText style={styles.noteLabel}>
                📓 Notes (optional)
              </ThemedText>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="How are you feeling? Any dreams?"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                maxLength={500}
                style={[
                  styles.noteInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                  },
                ]}
              />
            </Card>
          </Animated.View>

          {/* AI Insight */}
          <Animated.View entering={FadeInUp.delay(400).duration(400)}>
            <Card variant="gradient">
              <View style={styles.insightContent}>
                <ThemedText style={styles.insightEmoji}>🤖</ThemedText>
                <View style={styles.insightText}>
                  <ThemedText style={styles.insightTitle}>
                    AI Insight
                  </ThemedText>
                  <ThemedText style={styles.insightBody}>{insight}</ThemedText>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Submit Button */}
          <Animated.View entering={FadeInUp.delay(500).duration(400)}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <ThemedText style={styles.submitButtonText}>
                  {isSubmitting ? "Saving..." : "✨ Save Entry"}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  sliderSection: {
    padding: Spacing.sm,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  sliderTrack: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  sliderDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  stressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  sliderMinMax: {
    fontSize: 12,
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  insightContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  insightEmoji: {
    fontSize: 32,
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  submitButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
