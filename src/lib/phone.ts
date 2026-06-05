export function translateDigits(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
  }
  return result;
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Convert Arabic/Persian digits first
  let cleaned = translateDigits(phone);
  
  // Remove spaces, dashes, parentheses, or any non-numeric character except '+'
  cleaned = cleaned.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('0')) {
    // Replace leading '0' with '+20' (Egypt's country code)
    cleaned = '+20' + cleaned.substring(1);
  } else if (cleaned.startsWith('20') && !cleaned.startsWith('+') && cleaned.length === 12) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10 && cleaned.startsWith('1')) {
      cleaned = '+20' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}
