import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// A small, logical-direction set of pieces: React Native mirrors start/end, margins and flex rows when
// I18nManager.forceRTL is on, so nothing here names left or right.
export const colors = { brand: "#1f6e50", brandSoft: "#e9f3ee", ink: "#1c2a24", muted: "#5c6b64", line: "#d9e2dd", paper: "#faf8f3", danger: "#9f2d2d", gold: "#c99a2e" };

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 };
  if (!scroll) return <View style={[styles.screen, pad]}>{children}</View>;
  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={[styles.screen, pad]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export const Title = ({ children }: { children: ReactNode }) => <Text style={styles.title}>{children}</Text>;
export const Body = ({ children, muted = false }: { children: ReactNode; muted?: boolean }) => <Text style={[styles.body, muted && { color: colors.muted }]}>{children}</Text>;
export const Label = ({ children }: { children: ReactNode }) => <Text style={styles.label}>{children}</Text>;

export function Button({ title, onPress, kind = "primary", disabled = false, busy = false, testID }: { title: string; onPress: () => void; kind?: "primary" | "secondary" | "danger"; disabled?: boolean; busy?: boolean; testID?: string }) {
  const off = disabled || busy;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.button, kind === "secondary" && styles.buttonSecondary, kind === "danger" && styles.buttonDanger, off && { opacity: 0.55 }, pressed && { opacity: 0.85 }]}
    >
      {busy ? <ActivityIndicator color={kind === "primary" ? "#fff" : colors.brand} /> : <Text style={[styles.buttonText, kind !== "primary" && { color: kind === "danger" ? colors.danger : colors.brand }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, ...input }: { label: string; error?: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput {...input} style={[styles.input, input.multiline && { minHeight: 96, textAlignVertical: "top" }, error ? { borderColor: colors.danger } : null]} placeholderTextColor={colors.muted} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export const Notice = ({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) => (
  <View style={[styles.notice, tone === "error" && { borderColor: colors.danger, backgroundColor: "#fbeeee" }, tone === "success" && { borderColor: colors.brand }]}>
    <Text style={[styles.body, tone === "error" && { color: colors.danger }]}>{children}</Text>
  </View>
);

export const Card = ({ children }: { children: ReactNode }) => <View style={styles.card}>{children}</View>;
export const Row = ({ children }: { children: ReactNode }) => <View style={styles.row}>{children}</View>;
export const Spinner = () => (
  <View style={{ padding: 32, alignItems: "center" }}>
    <ActivityIndicator color={colors.brand} />
  </View>
);

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingHorizontal: 20, gap: 16, backgroundColor: colors.paper },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, lineHeight: 34 },
  body: { fontSize: 16, lineHeight: 26, color: colors.ink },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink, backgroundColor: "#fff" },
  error: { color: colors.danger, fontSize: 13 },
  button: { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", minHeight: 48, justifyContent: "center" },
  buttonSecondary: { backgroundColor: colors.brandSoft },
  buttonDanger: { backgroundColor: "#fbeeee" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#fff" },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.ink, fontSize: 14 },
  notice: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, backgroundColor: "#fff" },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 10, backgroundColor: "#fff" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
