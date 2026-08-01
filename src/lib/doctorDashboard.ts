export type SettingsTab = 'schedule' | 'blocked' | 'profile' | 'password';
export type ScheduleSettingsSection = 'schedule' | 'blocked';
export type ProfileSettingsSection = 'profile' | 'password';

export function routeSettingsSection(activeSection: SettingsTab): {
  scheduleSection: ScheduleSettingsSection | null;
  profileSection: ProfileSettingsSection | null;
} {
  if (activeSection === 'schedule' || activeSection === 'blocked') {
    return { scheduleSection: activeSection, profileSection: null };
  }

  return { scheduleSection: null, profileSection: activeSection };
}
