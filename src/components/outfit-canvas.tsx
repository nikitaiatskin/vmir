import { Image } from 'expo-image';
import type { ComponentRef, RefObject } from 'react';
import { View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useRotationGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { clampPlacement, MAX_SCALE, MIN_SCALE, type Placement } from '@/features/outfits';
import { useTheme } from '@/theme';

export type CanvasSize = { width: number; height: number };

/** Base tile width as a share of the canvas width at scale 1. */
export const BASE_TILE = 0.42;

/**
 * Outfit canvas (DESIGN.md §6): drag, pinch and rotate run on the UI thread (Reanimated),
 * and the final position is committed to React state when the gesture ends.
 */
export function OutfitCanvas({
  canvasRef,
  size,
  placements,
  urls,
  selected,
  onSelect,
  onChange,
  editable = true,
}: {
  canvasRef?: RefObject<ComponentRef<typeof View> | null>;
  size: CanvasSize;
  placements: Placement[];
  urls: Record<string, { url?: string; cacheKey: string }>;
  selected: string | null;
  onSelect: (key: string | null) => void;
  onChange: (p: Placement) => void;
  editable?: boolean;
}) {
  const { colors } = useTheme();
  const tapBackground = useTapGesture({
    runOnJS: true,
    onActivate: () => onSelect(null),
  });

  return (
    <GestureDetector gesture={tapBackground}>
      <View
        ref={canvasRef}
        collapsable={false}
        style={{ width: size.width, height: size.height, backgroundColor: colors.bg, overflow: 'hidden' }}
      >
        {[...placements]
          .sort((a, b) => a.z - b.z)
          .map((p) => (
            <CanvasItem
              key={p.key}
              placement={p}
              size={size}
              image={urls[p.itemId]}
              selected={selected === p.key}
              editable={editable}
              onSelect={onSelect}
              onChange={onChange}
            />
          ))}
      </View>
    </GestureDetector>
  );
}

function CanvasItem({
  placement,
  size,
  image,
  selected,
  editable,
  onSelect,
  onChange,
}: {
  placement: Placement;
  size: CanvasSize;
  image: { url?: string; cacheKey: string } | undefined;
  selected: boolean;
  editable: boolean;
  onSelect: (key: string | null) => void;
  onChange: (p: Placement) => void;
}) {
  const { colors } = useTheme();
  const tile = size.width * BASE_TILE;

  // Shared values are seeded from props; gestures write them on the UI thread.
  const x = useSharedValue(placement.x * size.width);
  const y = useSharedValue(placement.y * size.height);
  const scale = useSharedValue(placement.scale);
  const rotation = useSharedValue(placement.rotation);

  const commit = (nx: number, ny: number, ns: number, nr: number) => {
    onChange(
      clampPlacement({
        ...placement,
        x: nx / size.width,
        y: ny / size.height,
        scale: ns,
        rotation: nr,
      }),
    );
  };
  const select = () => onSelect(placement.key);

  const end = () => {
    'worklet';
    scheduleOnRN(commit, x.value, y.value, scale.value, rotation.value);
  };

  const pan = usePanGesture({
    enabled: editable,
    onActivate: () => {
      'worklet';
      scheduleOnRN(select);
    },
    onUpdate: (e) => {
      'worklet';
      x.value = Math.min(size.width, Math.max(0, x.value + e.changeX));
      y.value = Math.min(size.height, Math.max(0, y.value + e.changeY));
    },
    onDeactivate: end,
  });
  const pinch = usePinchGesture({
    enabled: editable,
    onUpdate: (e) => {
      'worklet';
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value * e.scaleChange));
    },
    onDeactivate: end,
  });
  const rotate = useRotationGesture({
    enabled: editable,
    onUpdate: (e) => {
      'worklet';
      rotation.value = rotation.value + (e.rotationChange * 180) / Math.PI;
    },
    onDeactivate: end,
  });
  const tap = useTapGesture({ enabled: editable, runOnJS: true, onActivate: select });
  const gesture = useSimultaneousGestures(pan, pinch, rotate, tap);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - tile / 2 },
      { translateY: y.value - tile / 2 },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityRole="imagebutton"
        accessibilityLabel="Outfit item"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: tile,
            height: tile,
            borderWidth: selected ? 1.5 : 0,
            borderColor: colors.highlight,
            borderStyle: 'dashed',
            borderRadius: 8,
          },
          style,
        ]}
      >
        {image?.url ? (
          <Image
            source={{ uri: image.url, cacheKey: image.cacheKey }}
            contentFit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}
