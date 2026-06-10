'use client';

import React, { useState } from 'react';
import { useBooking, ScheduleConfig } from '../BookingContext';

export default function ScheduleBuilder() {
  const { language, scheduleConfig, updateScheduleConfig, doctorProfile } = useBooking();
  const isAr = language === 'ar';

  const [startTime, setStartTime] = useState(scheduleConfig.startTime);
  const [endTime, setEndTime] = useState(scheduleConfig.endTime);
  const [slotDuration, setSlotDuration] = useState(scheduleConfig.slotDurationMinutes);
  const [capacity, setCapacity] = useState(scheduleConfig.capacityPerSlot);
  const [workingDays, setWorkingDays] = useState<number[]>(scheduleConfig.workingDays);
  const [success, setSuccess] = useState(false);

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

  return (
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
  );
}
