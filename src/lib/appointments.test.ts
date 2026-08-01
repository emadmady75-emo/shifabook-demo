import { describe, expect, it } from 'vitest';
import {
  cancelAppointmentInState,
  getTodayAppointments,
  mapDoctorAppointment,
  mapRefreshedDoctorAppointment,
  reconcileDoctorAppointments,
} from './appointments';

describe('mapDoctorAppointment', () => {
  it('preserves existing confirmation metadata from a doctor appointment row', () => {
    const confirmedAt = '2030-01-02T08:30:00.000Z';
    const mapped = mapDoctorAppointment(
      {
        id: 'synthetic-appointment',
        patient_name: 'Synthetic Patient',
        patient_phone: '0000000000',
        appointment_date: '2030-01-02',
        appointment_time: '09:00',
        status: 'cancelled',
        created_at: '2030-01-01T00:00:00.000Z',
        consultation_fee_at_booking: 500,
        confirmed_by: 'Synthetic Reception',
        confirmed_at: confirmedAt,
      },
      450,
    );

    expect(mapped.confirmed_by).toBe('Synthetic Reception');
    expect(mapped.confirmed_at).toBe(confirmedAt);
  });
});

describe('cancelAppointmentInState', () => {
  it('cancels only the target while preserving its confirmation metadata', () => {
    const confirmedAt = '2030-01-02T08:30:00.000Z';
    const target = {
      id: 'target',
      status: 'confirmed' as const,
      confirmed_by: 'Synthetic Reception',
      confirmed_at: confirmedAt,
    };
    const untouched = { id: 'other', status: 'pending' as const };

    const next = cancelAppointmentInState(
      [target, untouched],
      'target',
      'Synthetic Admin',
      '2030-01-02T08:45:00.000Z',
    );

    expect(next[0]).toMatchObject({
      status: 'cancelled',
      confirmed_by: 'Synthetic Reception',
      confirmed_at: confirmedAt,
      cancelled_by: 'Synthetic Admin',
      cancelled_at: '2030-01-02T08:45:00.000Z',
    });
    expect(next[1]).toBe(untouched);
  });
});

describe('getTodayAppointments', () => {
  it('returns only active appointments on the requested local date', () => {
    const appointments = [
      { id: 'today-active', date: '2030-01-02', status: 'pending' as const },
      { id: 'today-cancelled', date: '2030-01-02', status: 'cancelled' as const },
      { id: 'tomorrow-active', date: '2030-01-03', status: 'confirmed' as const },
    ];

    expect(getTodayAppointments(appointments, '2030-01-02').map(item => item.id))
      .toEqual(['today-active']);
  });
});

describe('reconcileDoctorAppointments', () => {
  it('keeps the existing state reference when a repeated fetch is unchanged', () => {
    const row = {
      id: 'synthetic-appointment',
      patient_name: 'Synthetic Patient',
      patient_phone: '0000000000',
      appointment_date: '2030-01-02',
      appointment_time: '09:00',
      status: 'pending',
      created_at: '2030-01-01T00:00:00.000Z',
    };
    const first = reconcileDoctorAppointments([], [row], 450);
    const repeated = reconcileDoctorAppointments(first, [{ ...row }], 450);

    expect(repeated).toBe(first);
  });
});

describe('mapRefreshedDoctorAppointment', () => {
  it('preserves confirmation metadata across refresh and subsequent local cancellation', () => {
    const refreshed = mapRefreshedDoctorAppointment({
      id: 'refresh-1',
      patient_name: 'Synthetic Patient',
      patient_phone: '0000000000',
      appointment_date: '2030-01-02',
      appointment_time: '09:00',
      status: 'confirmed',
      created_at: '2030-01-01T08:00:00.000Z',
      consultation_fee_at_booking: 500,
      confirmed_by: 'Synthetic Reception',
      confirmed_at: '2030-01-01T08:30:00.000Z',
      queue_code: 'SYN-01',
    }, 300, {
      name: 'Synthetic Clinic',
      address: 'Synthetic Address',
      mapUrl: 'https://maps.example.invalid/synthetic',
    });

    const [cancelled] = cancelAppointmentInState(
      [refreshed],
      ['refresh-1'],
      'Synthetic Reception',
      '2030-01-01T09:00:00.000Z',
    );

    expect(cancelled).toMatchObject({
      status: 'cancelled',
      confirmed_by: 'Synthetic Reception',
      confirmed_at: '2030-01-01T08:30:00.000Z',
      cancelled_by: 'Synthetic Reception',
      queue_code: 'SYN-01',
    });
  });
});
