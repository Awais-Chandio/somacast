import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  Check,
  Radio,
  RadioOff,
  RefreshCw,
} from 'lucide-react-native';
import { color, size, theme } from '@somacast/core';
import { ICON_STROKE } from '../../../shared/theme/icons';
import { ff, fs } from '../../../shared/theme/typography';
import type { LinkPanelController } from '../controller/useLinkPanel';
import {
  BACKLOG_SIZE,
  formatCount,
  outboxText,
  statusText,
} from '../model/linkPanel';

const ICON = size.icon[1]; // 24
const SMALL_ICON = size.icon[0]; // 16

// Link state is shown by icon + word; the colour only helps.
const linkLook = {
  AOS: { Icon: Radio, tint: color.blueYonder, hint: 'signal' },
  LOS: { Icon: RadioOff, tint: color.rocketRed, hint: 'no signal' },
} as const;

type Props = { link: LinkPanelController; crewId: string };

export function LinkPanel({ link, crewId }: Props) {
  const look = linkLook[link.link];
  const banner = statusText(link.status);
  const BannerIcon =
    link.status.phase === 'synced'
      ? Check
      : link.status.phase === 'interrupted'
      ? AlertTriangle
      : RefreshCw;

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <Pressable
          onPress={link.toggleLink}
          accessibilityRole="switch"
          accessibilityState={{ checked: link.link === 'AOS' }}
          accessibilityLabel={`Link ${link.link}, ${look.hint}. Tap to switch.`}
          style={({ pressed }) => [
            styles.toggle,
            { borderColor: look.tint },
            pressed && styles.pressed,
          ]}
        >
          <look.Icon size={ICON} color={look.tint} strokeWidth={ICON_STROKE} />
          <Text style={styles.toggleText}>Link: {link.link}</Text>
        </Pressable>
        <Text style={styles.count} accessibilityLiveRegion="polite">
          {outboxText(link.pending)}
        </Text>
      </View>

      <Pressable
        onPress={() => link.fillBacklog(crewId)}
        disabled={!link.canFill}
        accessibilityRole="button"
        accessibilityLabel={`Demo: fill ${formatCount(
          BACKLOG_SIZE,
        )}-item backlog`}
        accessibilityHint="Works only in LOS"
        accessibilityState={{ disabled: !link.canFill, busy: link.filling }}
        style={({ pressed }) => [
          styles.fill,
          !link.canFill && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.fillText}>
          {link.filling
            ? 'FILLING BACKLOG…'
            : `FILL ${formatCount(BACKLOG_SIZE)}-ITEM BACKLOG`}
        </Text>
        {link.link === 'AOS' && <Text style={styles.fillHint}>LOS only</Text>}
      </Pressable>

      {banner && (
        <View style={styles.banner} accessible accessibilityLiveRegion="polite">
          <BannerIcon
            size={SMALL_ICON}
            color={theme.accent}
            strokeWidth={ICON_STROKE}
          />
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggle: {
    minHeight: size.minTouch,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  toggleText: { ...ff.bodyBold, color: theme.text, fontSize: fs.body },
  count: { ...ff.bodySemi, color: theme.text, fontSize: fs.body, flex: 1 },
  fill: {
    minHeight: size.minTouch,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.accent,
  },
  fillText: { ...ff.bodyBold, color: theme.accent, fontSize: fs.small },
  fillHint: { ...ff.body, color: theme.text, fontSize: fs.small },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerText: { ...ff.bodySemi, color: theme.text, fontSize: fs.body },
});
