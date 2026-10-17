/**
 * @format
 */

import React, { useMemo } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@somacast/core';
import { getSupabase, isBackendConfigured } from '../backend/supabase';
import { useAuth } from '../features/auth/controller/useAuth';
import { accountLabel, crewProblem } from '../features/auth/model/account';
import { AccountNotice } from '../features/auth/view/AccountNotice';
import { SignInScreen } from '../features/auth/view/SignInScreen';
import { TodayScreen } from '../features/today/view/TodayScreen';
import { simulateMission } from '../shared/model/simulateMission';

// Sign-in gate before Today. Each account gets its own TodayScreen (key), so the outbox,
// link state and ground never carry over from one user to the next.
function Root() {
  const client = getSupabase();
  const auth = useAuth(client);
  const missionCrewIds = useMemo(
    () => simulateMission('normal').crew.map(m => m.id),
    [],
  );
  const { state } = auth;

  switch (state.phase) {
    case 'loading':
      return (
        <View style={styles.loading}>
          <ActivityIndicator
            color={theme.accent}
            accessibilityLabel="Loading"
          />
        </View>
      );
    case 'signedOut':
      return (
        <SignInScreen
          configured={isBackendConfigured()}
          busy={state.busy}
          error={state.error}
          onSignIn={auth.signIn}
          onOffline={auth.continueOffline}
        />
      );
    case 'offline':
      return (
        <TodayScreen
          key="offline"
          account={null}
          client={null}
          onAccountAction={auth.leaveOffline}
        />
      );
    case 'signedIn': {
      const { account } = state;
      if (account.role === 'surgeon')
        return (
          <AccountNotice
            label={accountLabel(account)}
            title="FLIGHT SURGEON ACCOUNT"
            message="This phone app is the crew view. Flight surgeons use the ground console, which reads every crew's log."
            onSignOut={auth.signOut}
          />
        );
      const problem = crewProblem(account, missionCrewIds);
      if (problem)
        return (
          <AccountNotice
            label={accountLabel(account)}
            title="CREW NOT FOUND"
            message={problem}
            onSignOut={auth.signOut}
          />
        );
      return (
        <TodayScreen
          key={account.userId}
          account={account}
          client={client}
          onAccountAction={auth.signOut}
        />
      );
    }
  }
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
});

export default App;
