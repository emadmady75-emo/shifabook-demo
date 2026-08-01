import { describe, expect, it } from 'vitest';
import { routeSettingsSection } from './doctorDashboard';

describe('routeSettingsSection', () => {
  it('routes each settings tab only to its owning component', () => {
    expect(routeSettingsSection('schedule')).toEqual({
      scheduleSection: 'schedule',
      profileSection: null,
    });
    expect(routeSettingsSection('blocked')).toEqual({
      scheduleSection: 'blocked',
      profileSection: null,
    });
    expect(routeSettingsSection('profile')).toEqual({
      scheduleSection: null,
      profileSection: 'profile',
    });
    expect(routeSettingsSection('password')).toEqual({
      scheduleSection: null,
      profileSection: 'password',
    });
  });
});
