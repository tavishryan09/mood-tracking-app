/**
 * Type definitions for React Navigation
 *
 * This file provides proper TypeScript types for all navigation routes
 * Replace 'any' types in screen components with these typed props
 */

import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root Stack (Auth flows)
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  OAuthCallback: { token?: string; error?: string };
};

// Main Tab Navigator (Mobile)
export type MainTabParamList = {
  Dashboard: undefined;
  Projects: undefined;
  Planning: undefined;
  Profile: undefined;
  Admin: undefined;
};

// Main Drawer Navigator (Desktop/Web)
export type MainDrawerParamList = {
  Dashboard: undefined;
  Projects: undefined;
  Planning: undefined;
  Profile: undefined;
  Admin: undefined;
};

// Projects Stack
export type ProjectsStackParamList = {
  ProjectsList: undefined;
  ProjectTableView: undefined;
  CreateProject: undefined;
  EditProject: { projectId: string };
  ClientsList: undefined;
  CreateClient: undefined;
  EditClient: { clientId: string };
};

// Events Stack
export type EventsStackParamList = {
  CreateEvent: { date?: string; projectId?: string };
  EditEvent: { eventId: string };
};

// Admin Stack
export type AdminStackParamList = {
  ManageUsers: undefined;
  InviteUser: undefined;
  EditUser: { userId: string };
  UserRates: undefined;
  TeamViewSettings: undefined;
};

// Profile Stack
export type ProfileStackParamList = {
  ProfileScreen: undefined;
  PlanningColors: undefined;
  ManageCustomThemes: undefined;
  ColorPaletteEditor: { paletteId?: string };
  ElementColorMapper: { paletteId: string };
  CustomColorManager: undefined;
};

// Combined navigation prop types for nested navigators
export type DashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  StackScreenProps<RootStackParamList>
>;

export type ProjectsScreenProps = CompositeScreenProps<
  StackScreenProps<ProjectsStackParamList, 'ProjectsList'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Projects'>,
    StackScreenProps<RootStackParamList>
  >
>;

export type ProjectTableViewScreenProps = StackScreenProps<
  ProjectsStackParamList,
  'ProjectTableView'
>;

export type CreateProjectScreenProps = StackScreenProps<
  ProjectsStackParamList,
  'CreateProject'
>;

export type EditProjectScreenProps = StackScreenProps<
  ProjectsStackParamList,
  'EditProject'
>;

export type ClientsListScreenProps = StackScreenProps<
  ProjectsStackParamList,
  'ClientsList'
>;

export type CreateClientScreenProps = StackScreenProps<
  ProjectsStackParamList,
  'CreateClient'
>;

export type EditClientScreenProps = StackScreenProps<
  ProjectsStackParamList,
  'EditClient'
>;

export type PlanningScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Planning'>,
  StackScreenProps<RootStackParamList>
>;

export type ProfileScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, 'ProfileScreen'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Profile'>,
    StackScreenProps<RootStackParamList>
  >
>;

export type CreateEventScreenProps = StackScreenProps<
  EventsStackParamList,
  'CreateEvent'
>;

export type EditEventScreenProps = StackScreenProps<
  EventsStackParamList,
  'EditEvent'
>;

export type ManageUsersScreenProps = StackScreenProps<
  AdminStackParamList,
  'ManageUsers'
>;

export type InviteUserScreenProps = StackScreenProps<
  AdminStackParamList,
  'InviteUser'
>;

export type EditUserScreenProps = StackScreenProps<
  AdminStackParamList,
  'EditUser'
>;

export type UserRatesScreenProps = StackScreenProps<
  AdminStackParamList,
  'UserRates'
>;

export type TeamViewSettingsScreenProps = StackScreenProps<
  AdminStackParamList,
  'TeamViewSettings'
>;

export type PlanningColorsScreenProps = StackScreenProps<
  ProfileStackParamList,
  'PlanningColors'
>;

export type ManageCustomThemesScreenProps = StackScreenProps<
  ProfileStackParamList,
  'ManageCustomThemes'
>;

export type ColorPaletteEditorScreenProps = StackScreenProps<
  ProfileStackParamList,
  'ColorPaletteEditor'
>;

export type ElementColorMapperScreenProps = StackScreenProps<
  ProfileStackParamList,
  'ElementColorMapper'
>;

export type CustomColorManagerScreenProps = StackScreenProps<
  ProfileStackParamList,
  'CustomColorManager'
>;

// Auth screens
export type LoginScreenProps = StackScreenProps<RootStackParamList, 'Login'>;
export type RegisterScreenProps = StackScreenProps<RootStackParamList, 'Register'>;

export type OAuthCallbackScreenProps = StackScreenProps<
  RootStackParamList,
  'OAuthCallback'
>;

// Declare global navigation type for use with useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
