/**
 * @format
 */

import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TodayScreen } from '../features/today/view/TodayScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <TodayScreen />
    </SafeAreaProvider>
  );
}

export default App;
