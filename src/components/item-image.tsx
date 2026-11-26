import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/** Image tile: cutout on the muted background (DESIGN.md §5 ItemTile). */
export function ItemImage({
  url,
  cacheKey,
  pending,
  style,
  padding = 0.12,
  label,
}: {
  url: string | undefined;
  cacheKey: string | null | undefined;
  pending?: boolean;
  style?: ViewStyle;
  padding?: number;
  label?: string;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      accessible={!!label}
      accessibilityLabel={label}
      style={[
        {
          aspectRatio: 1,
          borderRadius: radius.tile,
          backgroundColor: colors.surfaceMuted,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {pending || !url ? (
        <Shimmer />
      ) : (
        <Image
          source={{ uri: url, cacheKey: cacheKey ?? undefined }}
          contentFit="contain"
          transition={150}
          style={{ width: `${100 - padding * 200}%`, height: `${100 - padding * 200}%` }}
        />
      )}
    </View>
  );
}

export function Shimmer() {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ position: 'absolute', inset: 0, backgroundColor: colors.border, opacity }}
    />
  );
}
