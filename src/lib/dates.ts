export function formatDateOnly(date: Date): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnlySafe(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function isAppointmentInFutureOrNow(appointmentDate: string, appointmentTime: string): boolean {
  if (!appointmentDate || !appointmentTime) return false;

  // 1. Parse date (YYYY-MM-DD)
  const dateParts = appointmentDate.split('-');
  if (dateParts.length !== 3) return false;
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // 0-indexed month
  const day = parseInt(dateParts[2], 10);

  // 2. Parse time (HH:mm or with AM/PM)
  const timeStr = appointmentTime.trim();
  let hour = 0;
  let minute = 0;

  const isPM = /م|PM/i.test(timeStr);
  const isAM = /ص|AM/i.test(timeStr);

  const numbersOnly = timeStr.replace(/[^\d:]/g, '');
  const timeParts = numbersOnly.split(':');
  if (timeParts.length >= 2) {
    let parsedHour = parseInt(timeParts[0], 10);
    minute = parseInt(timeParts[1], 10);

    if (isPM || isAM) {
      if (isPM && parsedHour < 12) {
        parsedHour += 12;
      }
      if (isAM && parsedHour === 12) {
        parsedHour = 0;
      }
    }
    hour = parsedHour;
  } else {
    return false;
  }

  // Construct local date/time objects matching the clinic's local timezone (system local timezone)
  const apptDate = new Date(year, month, day, hour, minute, 0, 0);
  const now = new Date();

  return apptDate.getTime() >= now.getTime();
}

