import type { PatientBooking } from '@/components/BookingContext';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'attended' | 'no_show';

export interface DoctorAppointmentRow {
  id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
  consultation_fee_at_booking?: number | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
}

export interface RefreshedDoctorAppointmentRow extends DoctorAppointmentRow {
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  rescheduled_by?: string | null;
  rescheduled_at?: string | null;
  queue_code?: string | null;
  appointment_type?: string | null;
  parent_appointment_id?: string | null;
}

export interface AppointmentFacilitySnapshot {
  name: string;
  address: string;
  mapUrl: string;
}

export function getTodayAppointments<
  T extends { date: string; status: AppointmentStatus },
>(appointments: T[], today: string): T[] {
  return appointments.filter(
    appointment => appointment.status !== 'cancelled' && appointment.date === today,
  );
}

export function cancelAppointmentInState<
  T extends { id: string; status: AppointmentStatus },
>(
  appointments: T[],
  targetIds: string | readonly string[],
  cancelledBy: string,
  cancelledAt: string,
): T[] {
  const ids = new Set(typeof targetIds === 'string' ? [targetIds] : targetIds);
  return appointments.map(appointment =>
    ids.has(appointment.id)
      ? {
          ...appointment,
          status: 'cancelled' as const,
          cancelled_by: cancelledBy,
          cancelled_at: cancelledAt,
        }
      : appointment,
  );
}

export function reconcileDoctorAppointments(
  previous: PatientBooking[],
  rows: DoctorAppointmentRow[],
  fallbackPrice: number,
): PatientBooking[] {
  const next: PatientBooking[] = rows.map(row => mapDoctorAppointment(row, fallbackPrice));
  const unchanged = previous.length === next.length && next.every((appointment, index) => {
    const existing = previous[index];
    return existing && Object.keys(appointment).every(key =>
      appointment[key as keyof typeof appointment] === existing[key as keyof typeof existing],
    );
  });

  return unchanged ? previous : next;
}

export function mapDoctorAppointment(row: DoctorAppointmentRow, fallbackPrice: number) {
  return {
    id: row.id,
    patientName: row.patient_name,
    mobileNumber: row.patient_phone,
    date: row.appointment_date,
    timeSlot: row.appointment_time,
    status: row.status as AppointmentStatus,
    price: row.consultation_fee_at_booking ?? fallbackPrice,
    createdAt: row.created_at,
    confirmed_by: row.confirmed_by ?? null,
    confirmed_at: row.confirmed_at ?? null,
  };
}

export function mapRefreshedDoctorAppointment(
  row: RefreshedDoctorAppointmentRow,
  fallbackPrice: number,
  facility: AppointmentFacilitySnapshot,
): PatientBooking {
  return {
    ...mapDoctorAppointment(row, fallbackPrice),
    cancelled_by: row.cancelled_by ?? null,
    cancelled_at: row.cancelled_at ?? null,
    rescheduled_by: row.rescheduled_by ?? null,
    rescheduled_at: row.rescheduled_at ?? null,
    queue_code: row.queue_code ?? null,
    appointment_type: (row.appointment_type || 'regular') as PatientBooking['appointment_type'],
    parent_appointment_id: row.parent_appointment_id || null,
    facilityName: facility.name,
    facilityAddress: facility.address,
    facilityMapUrl: facility.mapUrl,
  };
}
