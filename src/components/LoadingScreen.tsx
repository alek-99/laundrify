
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface LoadingScreenProps {
  progress?: number;
  status?: string;
}

export default function LoadingScreen({
  progress = 0,
  status = "Menyiapkan aplikasi...",
}: LoadingScreenProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.035,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, []);

  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setDisplayProgress(Math.round(value));
    });

    Animated.timing(progressAnim, {
      toValue: Math.max(0, Math.min(100, progress)),
      duration: 450,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    return () => {
      progressAnim.removeListener(listener);
    };
  }, [progress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* LOGO */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: logoAnim },
                { scale: pulseAnim },
              ],
            },
          ]}
        >
          <View style={styles.logoFrame}>
            <View style={styles.logoInner}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
        </Animated.View>

        {/* APP IDENTITY */}
        <Text style={styles.appName}>LAUNDRY APP</Text>

        <Text style={styles.tagline}>
          Sistem Manajemen Laundry
        </Text>

        {/* LOADING */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingHeader}>
            <View style={styles.statusWrapper}>
              <View style={styles.statusDot} />
              <Text style={styles.loadingText}>{status}</Text>
            </View>

            <Text style={styles.percentage}>
              {displayProgress}%
            </Text>
          </View>

          {/* INSET PROGRESS BAR */}
          <View style={styles.progressOuter}>
            <View style={styles.progressInner}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressWidth },
                ]}
              />
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              MOHON TUNGGU SEBENTAR
            </Text>

            <View style={styles.footerLine} />
          </View>
        </View>
      </Animated.View>

      {/* VERSION */}
      <View style={styles.versionContainer}>
        <View style={styles.versionLine} />
        <Text style={styles.version}>VERSION 1.0.0</Text>
        <View style={styles.versionLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F1",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  content: {
    width: "100%",
    alignItems: "center",
  },

  // LOGO
  logoContainer: {
    marginBottom: 32,
  },

  logoFrame: {
    width: 116,
    height: 116,
    padding: 7,
    borderRadius: 22,
    backgroundColor: "#F4F5F1",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    shadowColor: "#A7AAA2",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },

  logoInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ECEDE7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E1DA",
  },

  logo: {
    width: 76,
    height: 76,
  },

  // APP IDENTITY
  appName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#172554",
    letterSpacing: 3,
  },

  tagline: {
    fontSize: 12,
    fontWeight: "500",
    color: "#92958E",
    marginTop: 8,
    letterSpacing: 0.4,
  },

  // LOADING
  loadingContainer: {
    width: "100%",
    marginTop: 64,
  },

  loadingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  statusWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22A06B",
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#62665F",
  },

  percentage: {
    fontSize: 13,
    fontWeight: "900",
    color: "#172554",
    fontVariant: ["tabular-nums"],
  },

  // INSET PROGRESS
  progressOuter: {
    width: "100%",
    height: 12,
    padding: 2,
    backgroundColor: "#E7E8E1",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DCDDD5",
  },

  progressInner: {
    flex: 1,
    backgroundColor: "#DEDFD8",
    borderRadius: 2,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#172554",
    borderRadius: 2,
  },

  // FOOTER
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
  },

  footerText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#A0A299",
  },

  footerLine: {
    width: 35,
    height: 2,
    backgroundColor: "#D9DAD3",
  },

  // VERSION
  versionContainer: {
    position: "absolute",
    bottom: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  versionLine: {
    width: 22,
    height: 1,
    backgroundColor: "#D8D9D2",
  },

  version: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#A0A299",
  },
});
