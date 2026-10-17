import React, { useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@somacast/core';
import { Chip, SectionLabel } from '../../../shared/components';
import { getDeviceOutbox } from '../../../sync/SqliteOutboxStore';
import {
  createSupabaseTransport,
  supabaseGroundCounts,
} from '../../../sync/SupabaseTransport';
import { accountLabel, type Account } from '../../auth/model/account';
import { AccountBar } from '../../auth/view/AccountBar';
import {
  useLinkPanel,
  type RemoteGround,
} from '../../link/controller/useLinkPanel';
import { LinkPanel } from '../../link/view/LinkPanel';
import { ff, fs } from '../../../shared/theme/typography';
import { useTodayController } from '../controller/useTodayController';
import { AlertCard } from './AlertCard';
import { DayStepper } from './DayStepper';
import { ForecastCard } from './ForecastCard';
import { ReadingsGrid } from './ReadingsGrid';
import { TodayHeader } from './TodayHeader';

type Props = {
  account: Account | null; // null = offline demo, no account
  client: SupabaseClient | null;
  onAccountAction: () => void; // sign out, or back to sign-in from the offline demo
};

// View: lays out what the controllers hand it. No state logic, no health logic.
// Signed in: the account's own outbox, its crew only, and Supabase as the ground.
export function TodayScreen({ account, client, onAccountAction }: Props) {
  const outbox = getDeviceOutbox(account?.userId);
  const crewId = account?.crewId ?? undefined;
  const remote = useMemo<RemoteGround | null>(
    () =>
      client && crewId
        ? {
            transport: linkUp => createSupabaseTransport(client, { linkUp }),
            check: () => supabaseGroundCounts(client, crewId),
          }
        : null,
    [client, crewId],
  );
  const link = useLinkPanel(outbox, {
    remote,
    accountId: account?.userId ?? null,
  });
  const c = useTodayController(outbox, link.refresh, link.resetEpoch, crewId);
  const { view } = c;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <TodayHeader />
      <AccountBar
        label={account ? accountLabel(account) : 'Offline demo, no account'}
        action={account ? 'SIGN OUT' : 'SIGN IN'}
        onAction={onAccountAction}
      />
      <LinkPanel link={link} crewId={c.crewId} />

      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel>CREW MEMBER</SectionLabel>
        <View style={styles.row}>
          {c.crew.map(m => (
            <Chip
              key={m.id}
              label={m.name}
              selected={m.id === c.crewId}
              onPress={() => c.selectCrew(m.id)}
              a11y={`Crew member ${m.name}`}
            />
          ))}
        </View>

        <SectionLabel>SCENARIO</SectionLabel>
        <View style={styles.row}>
          {c.scenarios.map(s => (
            <Chip
              key={s.key}
              label={s.label}
              selected={s.key === c.scenario}
              onPress={() => c.selectScenario(s.key)}
              a11y={`Scenario ${s.label}`}
            />
          ))}
        </View>

        <SectionLabel>MISSION DAY</SectionLabel>
        <DayStepper
          day={c.day}
          maxDay={c.maxDay}
          onPrev={c.prevDay}
          onNext={c.nextDay}
        />

        <ForecastCard view={view} />

        <SectionLabel>WHY</SectionLabel>
        {view.reasons.map((r, i) => (
          <Text key={i} style={styles.reason}>
            • {r}
          </Text>
        ))}

        <SectionLabel>ALERTS ({view.alerts.length})</SectionLabel>
        {view.alerts.length === 0 && (
          <Text style={styles.muted}>No alerts for this day.</Text>
        )}
        {view.alerts.map(a => (
          <AlertCard key={a.id} alert={a} />
        ))}

        <SectionLabel>LATEST READINGS (SIMULATED)</SectionLabel>
        <ReadingsGrid readings={view.latest} />

        <Text style={styles.footer}>
          Decision support only, not a medical device. Thresholds are
          illustrative.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 48 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: {
    ...ff.body,
    color: theme.text,
    fontSize: fs.body,
    lineHeight: fs.body * 1.5,
    marginBottom: 4,
  },
  muted: { ...ff.body, color: theme.textSecondary, fontSize: fs.body },
  footer: {
    ...ff.body,
    color: theme.textSecondary,
    fontSize: fs.small,
    lineHeight: fs.small * 1.5,
    marginTop: 32,
    textAlign: 'center',
  },
});
