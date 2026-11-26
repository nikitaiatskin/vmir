import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <NativeTabs tintColor={colors.text}>
      <NativeTabs.Trigger name="wardrobe">
        <NativeTabs.Trigger.Icon sf={{ default: 'hanger', selected: 'hanger' }} md="checkroom" />
        <NativeTabs.Trigger.Label>Wardrobe</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="outfits">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'rectangle.stack', selected: 'rectangle.stack.fill' }}
          md="style"
        />
        <NativeTabs.Trigger.Label>Outfits</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wishlist">
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
        <NativeTabs.Trigger.Label>Wishlist</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
