'use client';

import React, { useState, useEffect } from 'react';
import { useBooking, ScheduleConfig, TimeSlot, ScheduleException } from '../BookingContext';

const REASONS_AR = [
  { label: 'استراحة', value: 'استراحة' },
  { label: 'تأخير حضور الطبيب', value: 'تأخير حضور الطبيب' },
  { label: 'انصراف مبكر', value: 'انصراف مبكر' },
  { label: 'اجتماع', value: 'اجتماع' },
  { label: 'ظرف طارئ', value: 'ظرف طارئ' },
  { label: 'غير متاح', value: 'غير متاح' },
  { label: 'سبب آخر', value: 'other' }
];

const REASONS_EN = [
  { label: 'Break', value: 'Break' },
  { label: 'Doctor Delay', value: 'Doctor Delay' },
  { label: 'Early Leave', value: 'Early Leave' },
  { label: 'Meeting', value: 'Meeting' },
  { label: 'Emergency', value: 'Emergency' },
  { label: 'Unavailable', value: 'Unavailable' },
  { label: 'Other', value: 'other' }
];

export default function ScheduleBuilder() {
  const { 
    language, 
    scheduleConfig, 
    updateScheduleConfig, 
    doctorProfile,
    scheduleExceptions,
    isExceptionsTableActive,
    createBlockedSlots,
    deleteBlockedSlot,
    generateTimeSlotsForDate
  } = useBooking();
  const isAr = language === 'ar';

  const [startTime, setStartTime] = useState(scheduleConfig.startTime);
  const [endTime, setEndTime] = useState(scheduleConfig.endTime);
  const [slotDuration, setSlotDuration] = useState(scheduleConfig.slotDurationMinutes);
  const [capacity, setCapacity] = useState(scheduleConfig.capacityPerSlot);
  const [workingDays, setWorkingDays] = useState<number[]>(scheduleConfig.workingDays);
  const [success, setSuccess] = useState(false);

  // States for Blocked Slots
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>('استراحة');
  const [customReason, setCustomReason] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');

  const daysOfWeek = [
    { labelAr: 'الأحد', labelEn: 'Sunday', value: 0 },
    { labelAr: 'الإثنين', labelEn: 'Monday', value: 1 },
    { labelAr: 'الثلاثاء', labelEn: 'Tuesday', value: 2 },
    { labelAr: 'الأربعاء', labelEn: 'Wednesday', value: 3 },
    { labelAr: 'الخميس', labelEn: 'Thursday', value: 4 },
    { labelAr: 'الجمعة', labelEn: 'Friday', value: 5 },
    { labelAr: 'السبت', labelEn: 'Saturday', value: 6 },
  ];

  const handleDayToggle = (dayVal: number) => {
    if (workingDays.includes(dayVal)) {
      setWorkingDays(workingDays.filter(d => d !== dayVal));
    } else {
      setWorkingDays([...workingDays, dayVal].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    updateScheduleConfig({
      startTime,
      endTime,
      slotDurationMinutes: Number(slotDuration),
      capacityPerSlot: Number(capacity),
      pricePerAppointment: doctorProfile?.consultationFee ?? scheduleConfig.pricePerAppointment,
      workingDays,
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Safe parsing helper
  const parseDateSafe = (dateStr: string) => {
    const parts = dateStr.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  // Blocked slots slot time format helper
  const formatSlotTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    const suffix = isAr ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
    const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${displayHr}:${m} ${suffix}`;
  };

  // Blocked slots event handlers
  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.isBlocked) {
      const confirmUnblock = window.confirm(
        isAr 
          ? `هل تريد إلغاء إيقاف الموعد ${formatSlotTime(slot.time)}؟` 
          : `Do you want to unblock the slot ${formatSlotTime(slot.time)}?`
      );
      if (confirmUnblock && slot.exceptionId) {
        handleUnblockClick(slot.exceptionId);
      }
      return;
    }

    if (slot.bookings.length > 0) {
      window.alert(
        isAr 
          ? 'هذا الموعد عليه حجز نشط. قم بنقل أو إلغاء الحجز أولاً.' 
          : 'This slot has an active appointment. Please reschedule or cancel it first.'
      );
      return;
    }

    if (selectedSlots.includes(slot.time)) {
      setSelectedSlots(selectedSlots.filter(t => t !== slot.time));
    } else {
      setSelectedSlots([...selectedSlots, slot.time]);
    }
  };

  const handleSaveBlockedSlots = async () => {
    if (selectedSlots.length === 0) return;
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess(false);

    const finalReason = selectedReason === 'other' ? customReason : selectedReason;
    const weekdayVal = parseDateSafe(selectedDate).getDay();

    const slotsToBlock = selectedSlots.map(timeStr => ({
      timeSlot: timeStr,
      reason: finalReason || null,
      isRecurring,
      weekday: isRecurring ? weekdayVal : null
    }));

    try {
      await createBlockedSlots(slotsToBlock, selectedDate);
      setSaveSuccess(true);
      setSelectedSlots([]);
      setCustomReason('');
      setSelectedReason('استراحة');
      setIsRecurring(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || (isAr ? 'حدث خطأ أثناء حفظ الإيقاف.' : 'Failed to block slots.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUnblockClick = async (exceptionId: string) => {
    try {
      await deleteBlockedSlot(exceptionId);
    } catch (err: any) {
      setSaveError(err.message || (isAr ? 'حدث خطأ أثناء إلغاء الإيقاف.' : 'Failed to unblock slot.'));
    }
  };

  // Fetch slots and exceptions for chosen day
  const slots = generateTimeSlotsForDate(selectedDate);
  const weekdayVal = parseDateSafe(selectedDate).getDay();
  const blockedExceptionsForDay = (scheduleExceptions || []).filter(exc => {
    if (exc.is_recurring_weekly) {
      return exc.weekday === weekdayVal;
    } else {
      return exc.exception_date === selectedDate;
    }
  });

  return (
    <div className="space-y-8">
      
      {/* Weekly operating schedule builder form */}
      <div className="glass-panel rounded-3xl p-6 border border-teal-500/20 text-right space-y-6">
        <div>
          <h3 className="text-lg font-black text-white">
            {isAr ? 'تعديل وتحديث جدول العيادة الأسبوعي' : 'Update Clinic Weekly Operating Schedule'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAr 
              ? 'قم بتهيئة مواعيد البدء والانتهاء وسيقوم النظام بتعديل خريطة مقاعد الحجز الفورية للمرضى.' 
              : 'Configure starting times and capacities to update patient-facing seat grids.'}
          </p>
        </div>

        {success && (
          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/25 text-xs text-teal-400 font-bold">
            {isAr ? '✓ تم تحديث جدول العمل وإعادة توليد المقاعد بنجاح!' : '✓ Weekly schedule updated and seat grids regenerated!'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Working Days Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'أيام العمل بالعيادة' : 'Operating Days'}
            </label>
            <div className="flex flex-wrap gap-2 justify-end">
              {daysOfWeek.map((day) => {
                const isActive = workingDays.includes(day.value);
                return (
                  <button
                    type="button"
                    key={day.value}
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      isActive
                        ? 'bg-gradient-to-tr from-teal-500 to-teal-600 border-teal-400 text-[#070e12] font-black'
                        : 'bg-teal-950/10 border-teal-950 text-slate-400 hover:border-teal-500/30'
                    }`}
                  >
                    {isAr ? day.labelAr : day.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Working Hours Input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isAr ? 'ساعة بدء الدوام' : 'Shift Start'}
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isAr ? 'ساعة انتهاء الدوام' : 'Shift End'}
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
          </div>

          {/* Slot Duration and Capacity Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isAr ? 'مدة الجلسة (دقائق)' : 'Slot Duration'}
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-500/30 text-slate-100 focus:outline-none focus:border-teal-500 text-sm"
              >
                <option value="15">15 {isAr ? 'دقيقة' : 'min'}</option>
                <option value="20">20 {isAr ? 'دقيقة' : 'min'}</option>
                <option value="30">30 {isAr ? 'دقيقة' : 'min'}</option>
                <option value="45">45 {isAr ? 'دقيقة' : 'min'}</option>
                <option value="60">60 {isAr ? 'دقيقة' : 'min'}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isAr ? 'السعة لكل فترة' : 'Slot Capacity'}
              </label>
              <input
                type="number"
                min="1"
                max="5"
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-500/30 text-slate-100 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10"
          >
            {isAr ? 'تحديث الجدول الأسبوعي وحساب السعة ⚡' : 'Generate Slots & Apply Schedule ⚡'}
          </button>
        </form>
      </div>

      {/* Blocked Slots Exceptions Management Section */}
      {!isExceptionsTableActive ? (
        <div className="glass-panel rounded-3xl p-6 border border-rose-500/20 text-right space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">
              {isAr ? 'إيقاف مواعيد داخل الجدول' : 'Blocked Slots'}
            </h3>
          </div>
          <div className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 text-xs font-bold text-center">
            ⚠️ {isAr ? 'لم يتم تفعيل إيقاف المواعيد بعد. يرجى تشغيل ملف الهجرة.' : 'Blocked slots are not activated yet. Please run the migration.'}
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-6 border border-teal-500/20 text-right space-y-6">
          <div>
            <h3 className="text-lg font-black text-white">
              {isAr ? 'إيقاف مواعيد داخل الجدول' : 'Blocked Slots'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAr 
                ? 'قم بتحديد موعد وتفاصيل لإيقاف خانات زمنية محددة ومنع حجزها من قبل المرضى.' 
                : 'Select date and slots to temporarily or weekly block patient bookings.'}
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/25 text-xs text-teal-400 font-bold">
              {isAr ? '✓ تم حفظ الإيقاف بنجاح!' : '✓ Blocked slots saved successfully!'}
            </div>
          )}

          {saveError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400 font-bold">
              ⚠️ {saveError}
            </div>
          )}

          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'اختر اليوم / التاريخ' : 'Select Day / Date'}
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlots([]);
                setSaveError('');
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 focus:outline-none focus:border-teal-500 text-sm"
            />
          </div>

          {/* Slots Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'المواعيد المتاحة للتحديد' : 'Select Slots to Block'}
            </label>
            
            {slots.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-[#09151e] rounded-xl border border-teal-950/40">
                {isAr ? 'العيادة مغلقة في هذا اليوم. لا توجد مواعيد لإيقافها.' : 'Clinic is closed on this day. No slots to block.'}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const isBlocked = slot.isBlocked;
                  const isSelected = selectedSlots.includes(slot.time);
                  const hasBooking = slot.bookings.length > 0;
                  
                  let btnCls = '';
                  let badgeText = '';
                  
                  if (isBlocked) {
                    btnCls = 'bg-rose-950/20 border-rose-500/30 text-rose-400 cursor-pointer hover:bg-rose-950/45';
                    badgeText = slot.isRecurring ? (isAr ? 'أسبوعي 🔁' : 'Weekly 🔁') : (isAr ? 'موقوف 🚫' : 'Blocked 🚫');
                  } else if (hasBooking) {
                    btnCls = 'bg-[#0f1d24] border-amber-600/30 text-amber-500/80 cursor-pointer';
                    badgeText = isAr ? 'محجوز 👥' : 'Booked 👥';
                  } else if (isSelected) {
                    btnCls = 'bg-gradient-to-tr from-teal-500 to-teal-600 border-teal-400 text-[#070e12] font-black scale-[1.01]';
                    badgeText = isAr ? '✓ محدد' : '✓ Selected';
                  } else {
                    btnCls = 'bg-[#09151e] border-teal-950/60 text-slate-300 hover:border-teal-500/30';
                    badgeText = isAr ? 'متاح' : 'Available';
                  }

                  return (
                    <button
                      type="button"
                      key={slot.time}
                      onClick={() => handleSlotClick(slot)}
                      title={isBlocked ? `${slot.blockedReason || (isAr ? 'غير متاح' : 'Unavailable')}` : undefined}
                      className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${btnCls}`}
                    >
                      <span className="font-bold text-xs">{formatSlotTime(slot.time)}</span>
                      <span className="text-[9px] opacity-75 mt-0.5 font-bold">{badgeText}</span>
                      {isBlocked && slot.blockedReason && (
                        <span className="text-[8px] opacity-80 text-rose-300 truncate max-w-full px-1">{slot.blockedReason}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save form parameters */}
          {slots.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-teal-950/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {isAr ? 'سبب الإيقاف' : 'Block Reason'}
                  </label>
                  <select
                    value={selectedReason}
                    onChange={(e) => {
                      setSelectedReason(e.target.value);
                      if (e.target.value !== 'other') {
                        setCustomReason('');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-500/30 text-slate-100 focus:outline-none focus:border-teal-500 text-sm"
                  >
                    {(isAr ? REASONS_AR : REASONS_EN).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedReason === 'other' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      {isAr ? 'ادخل السبب بالتفصيل' : 'Enter Custom Reason'}
                    </label>
                    <input
                      type="text"
                      required
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder={isAr ? 'أدخل السبب هنا...' : 'Type reason...'}
                      className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-500/30 text-slate-100 focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Recurring Switch */}
              <div className="flex items-center gap-2.5 justify-end py-1">
                <label htmlFor="isRecurring" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                  {isAr ? 'تكرار أسبوعياً لهذه المواعيد' : 'Repeat weekly for these slots'}
                </label>
                <input
                  id="isRecurring"
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4.5 h-4.5 rounded bg-[#09151e] border border-teal-500/30 text-teal-500 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              {/* Block Action Button */}
              <button
                type="button"
                onClick={handleSaveBlockedSlots}
                disabled={selectedSlots.length === 0 || saveLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-md shadow-rose-500/10"
              >
                {saveLoading
                  ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                  : `${isAr ? 'حفظ الإيقاف' : 'Save Blocked Slots'} (${selectedSlots.length}) 🚫`}
              </button>
            </div>
          )}

          {/* List of currently blocked slots */}
          {blockedExceptionsForDay.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-teal-950/50">
              <h4 className="text-xs font-black text-slate-300">
                {isAr ? 'المواعيد الموقوفة حالياً' : 'Currently Blocked Slots'}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {blockedExceptionsForDay.map((exc) => (
                  <div key={exc.id} className="flex items-center justify-between p-3 rounded-xl bg-rose-950/10 border border-rose-950/30 text-xs">
                    <button
                      type="button"
                      onClick={() => handleUnblockClick(exc.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-colors font-bold"
                    >
                      {isAr ? 'إلغاء الإيقاف' : 'Unblock'}
                    </button>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">
                        {formatSlotTime(exc.slot_time)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 max-w-[200px] truncate">
                        {exc.is_recurring_weekly 
                          ? (isAr ? 'تكرار أسبوعي' : 'Weekly Repeat') 
                          : (isAr ? `في ${exc.exception_date}` : `on ${exc.exception_date}`)}
                        {exc.reason && ` · ${exc.reason}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
