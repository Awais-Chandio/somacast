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
import { Chip } from '../../../shared/components';
import { useCopy } from '../../../shared/copy/useCopy';
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

// Link state is shown by icon + word; the colour only helps. The words come from the Space / Earth copy.
const linkLook = {
  AOS: {
    Icon: Radio,
    tint: color.blueYonder,
    word: 'linkUp',
    hint: 'linkUpHint',
  },
  LOS: {
    Icon: RadioOff,
    tint: color.rocketRed,
    word: 'linkDown',
    hint: 'linkDownHint',
  },
} as const;

type Props = { link: LinkPanelController; crewId: string };

export function LinkPanel({ link, crewId }: Props) {
  const { words } = useCopy();
  const look = linkLook[link.link];
  const linkWord = words[look.word];
  const banner = statusText(link.status);
  const BannerIcon =
    link.status.phase === 'synced'
      ? Check
      : link.status.phase === 'interrupted' ||
        link.status.phase === 'unverified'
      ? AlertTriangle
      : RefreshCw;

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <Pressable
          onPress={link.toggleLink}
          accessibilityRole="switch"
          accessibilityState={{ checked: link.link === 'AOS' }}
          accessibilityLabel={`Link ${linkWord}, ${
            words[look.hint]
          }. Tap to switch.`}
          style={({ pressed }) => [
            styles.toggle,
            { borderColor: look.tint },
            pressed && styles.pressed,
          ]}
        >
          <look.Icon size={ICON} color={look.tint} strokeWidth={ICON_STROKE} />
          <Text style={styles.toggleText}>Link: {linkWord}</Text>
        </Pressable>
        <Text style={styles.count} accessibilityLiveRegion="polite">
          {outboxText(link.outbox)}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.groundLabel}>Ground:</Text>
        {link.hasRemote ? (
          <>
            <Chip
              label="Supabase"
              selected={link.ground === 'supabase'}
              onPress={() => link.selectGround('supabase')}
              a11y="Ground: Supabase database"
            />
            <Chip
              label="Demo"
              selected={link.ground === 'demo'}
              onPress={() => link.selectGround('demo')}
              a11y="Ground: offline demo ground on this phone"
            />
          </>
        ) : (
          <Text style={styles.groundOffline}>offline demo on this phone</Text>
        )}
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={() => link.fillBacklog(crewId)}
          disabled={!link.canFill}
          accessibilityRole="button"
          accessibilityLabel={`Demo: fill ${formatCount(
            BACKLOG_SIZE,
          )}-item backlog`}
          accessibilityHint={`Works only ${words.whileDown}`}
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
        </Pressable>
        <Pressable
          onPress={link.resetDemo}
          disabled={!link.canReset}
          accessibilityRole="button"
          accessibilityLabel="Demo: reset outbox and ground"
          accessibilityHint={`Works only ${words.whileDown}`}
          accessibilityState={{ disabled: !link.canReset }}
          style={({ pressed }) => [
            styles.reset,
            !link.canReset && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.resetText}>RESET DEMO</Text>
        </Pressable>
      </View>
      {link.link === 'AOS' && (
        <Text style={styles.hint}>
          Fill, reset and ground switch work {words.whileDown} only.
        </Text>
      )}
      {link.link === 'LOS' && link.ground === 'supabase' && (
        <Text style={styles.hint}>
          Reset clears this phone only. The Supabase log is append-only.
        </Text>
      )}

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
    flex: 1,
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
  reset: {
    minHeight: size.minTouch,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.text,
  },
  resetText: { ...ff.bodyBold, color: theme.text, fontSize: fs.small },
  groundLabel: { ...ff.bodySemi, color: theme.text, fontSize: fs.body },
  groundOffline: { ...ff.body, color: theme.textSecondary, fontSize: fs.small },
  hint: { ...ff.body, color: theme.textSecondary, fontSize: fs.small },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerText: { ...ff.bodySemi, color: theme.text, fontSize: fs.body },
});
