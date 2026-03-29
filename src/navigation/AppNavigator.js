import 'react-native-gesture-handler';
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator }      from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../context/AppContext';
import DrawerContent      from './DrawerContent';
import SplashScreen       from '../screens/SplashScreen';
import SetupScreen        from '../screens/SetupScreen';
import LockScreen         from '../screens/LockScreen';
import CalendarScreen     from '../screens/CalendarScreen';
import GalleryScreen      from '../screens/GalleryScreen';
import EntriesListScreen  from '../screens/EntriesListScreen';
import SettingsScreen     from '../screens/SettingsScreen';
import SearchScreen       from '../screens/SearchScreen';
import EditorScreen       from '../screens/EditorScreen';
import EntryViewerScreen  from '../screens/EntryViewerScreen';
import BackupScreen       from '../screens/BackupScreen';
import EncryptionScreen   from '../screens/EncryptionScreen';

const Stack  = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// The Drawer only has Calendar + Settings
// All other screens live in the ROOT Stack so navigation always finds them
function MainDrawer() {
  const { theme, isSidebarEnabled } = useApp();
  return (
    <Drawer.Navigator
      drawerContent={props => <DrawerContent {...props} />}
      screenOptions={{
        headerShown:    false,
        drawerType:     Platform.OS === 'ios' ? 'front' : 'slide',
        drawerStyle:   { width: 300, backgroundColor: theme.surface },
        overlayColor:   theme.isDark
          ? 'rgba(18,10,34,0.7)'
          : 'rgba(18,10,34,0.4)',
        swipeEdgeWidth: 48,
        swipeEnabled:   isSidebarEnabled, // Use isSidebarEnabled from context
      }}
    >
      <Drawer.Screen name="Calendar" component={CalendarScreen} />
      <Drawer.Screen name="Gallery"  component={GalleryScreen} />
      <Drawer.Screen name="Search"   component={SearchScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

export default function RootNavigator() {
  const { authState, theme } = useApp();

  const navTheme = {
    dark:   theme.isDark,
    colors: {
      primary:      theme.primary,
      background:   theme.bg,
      card:         theme.surface,
      text:         theme.text,
      border:       theme.border,
      notification: theme.primary,
    },
    fonts: theme.fonts,
  };

  const bg = theme.bg;

  // ── Shared sheet options ──────────────────────────────────────────────────
  const sheetOpts = {
    animation:        Platform.OS === 'ios' ? 'default' : 'slide_from_bottom',
    gestureEnabled:   true,
    gestureDirection: 'vertical',
    contentStyle:     { backgroundColor: bg },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}
      >
        {/* ── Pre-auth ── */}
        {authState === 'splash' && (
          <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'none' }} />
        )}
        {authState === 'setup' && (
          <Stack.Screen name="Setup" component={SetupScreen} options={{ animation: 'fade' }} />
        )}
        {authState === 'locked' && (
          <Stack.Screen name="Lock" component={LockScreen} options={{ animation: 'fade' }} />
        )}

        {/* ── Main app — all screens in ROOT stack so navigate() always finds them ── */}
        {(authState === 'real' || authState === 'decoy') && (
          <>
            {/* Main drawer lives as the base screen */}
            <Stack.Screen
              name="Main"
              component={MainDrawer}
              options={{ animation: 'fade' }}
            />

            {/* Modal screens — presented over drawer */}
            <Stack.Screen
              name="EntriesList"
              component={EntriesListScreen}
              options={{ ...sheetOpts }}
            />
            <Stack.Screen
              name="Editor"
              component={EditorScreen}
              options={{ ...sheetOpts }}
            />
            <Stack.Screen
              name="EntryViewer"
              component={EntryViewerScreen}
              options={{
                animation:      Platform.OS === 'ios' ? 'default' : 'slide_from_right',
                gestureEnabled: true,
                contentStyle:   { backgroundColor: bg },
              }}
            />
            <Stack.Screen
              name="Backup"
              component={BackupScreen}
              options={{
                animation:      Platform.OS === 'ios' ? 'default' : 'slide_from_right',
                gestureEnabled: true,
                contentStyle:   { backgroundColor: bg },
              }}
            />
            <Stack.Screen
              name="Security"
              component={LockScreen}
              options={{
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Encryption"
              component={EncryptionScreen}
              options={{
                animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
                gestureEnabled: true,
                contentStyle: { backgroundColor: bg },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}