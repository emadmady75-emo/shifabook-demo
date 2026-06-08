'use client';

import React, { useState, useEffect } from 'react';
import { useBooking } from '../BookingContext';

export default function PatientCRM() {
  const { 
    language, 
    patients, 
    fetchPatients, 
    fetchNotesForPatient, 
    addPatientNote, 
    updatePatientProfile,
    clinicUser
  } = useBooking();

  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('كشف دوري'); // clinical session type
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit Form Fields
  const [editFields, setEditFields] = useState({
    gender: '',
    birth_date: '',
    age: 0,
    blood_type: '',
    chronic_diseases: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    patient_status: 'normal'
  });

  // Load patients list on mount
  useEffect(() => {
    fetchPatients();
  }, []);

  // Load notes when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      loadNotes(selectedPatient.id);
      setEditFields({
        gender: selectedPatient.gender || 'غير محدد',
        birth_date: selectedPatient.birth_date || '',
        age: selectedPatient.age || 0,
        blood_type: selectedPatient.blood_type || '',
        chronic_diseases: selectedPatient.chronic_diseases || 'لا يوجد',
        allergies: selectedPatient.allergies || 'لا يوجد',
        emergency_contact_name: selectedPatient.emergency_contact_name || '',
        emergency_contact_phone: selectedPatient.emergency_contact_phone || '',
        notes: selectedPatient.notes || '',
        patient_status: selectedPatient.patient_status || 'normal'
      });
      setIsEditing(false);
    } else {
      setNotes([]);
    }
  }, [selectedPatient]);

  const loadNotes = async (patientId: string) => {
    const fetchedNotes = await fetchNotesForPatient(patientId);
    setNotes(fetchedNotes);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedPatient) return;

    const success = await addPatientNote(selectedPatient.id, newNote, noteType);
    if (success) {
      setNewNote('');
      loadNotes(selectedPatient.id);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setIsSaving(true);

    const success = await updatePatientProfile(selectedPatient.id, {
      ...editFields,
      age: Number(editFields.age)
    });

    if (success) {
      setSelectedPatient((prev: any) => ({
        ...prev,
        ...editFields,
        age: Number(editFields.age)
      }));
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const filteredPatients = patients.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) || 
      p.phone?.toLowerCase().includes(q)
    );
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'vip':
        return isAr ? '⭐️ مريض VIP' : '⭐️ VIP';
      case 'critical':
        return isAr ? '🚨 حالة حرجة' : '🚨 Critical';
      default:
        return isAr ? '👤 طبيعي' : '👤 Normal';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right" dir="rtl">
      
      {/* ─── Directory List (Left Column) ─── */}
      <div className="lg:col-span-4 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6 flex flex-col max-h-[680px]">
        <div>
          <h3 className="text-lg font-black text-white">
            {isAr ? 'دليل المرضى الفوري' : 'Patient CRM Directory'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? 'البحث في قائمة المرضى المسجلين بالعيادة وتعديل ملفاتهم.' : 'Search medical profiles and view historic patient records.'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={isAr ? 'ابحث باسم المريض أو برقم الهاتف...' : 'Search by name or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pr-10 rounded-2xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors"
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Patients Scroll List */}
        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              {isAr ? 'لم يتم العثور على أي ملفات للمرضى.' : 'No patient profiles matches query.'}
            </div>
          ) : (
            filteredPatients.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`w-full text-right p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                  selectedPatient?.id === p.id 
                    ? 'bg-teal-950/20 border-teal-500/50 shadow-md shadow-teal-500/5' 
                    : 'bg-slate-950/20 border-teal-950/40 hover:border-teal-500/20'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-white text-sm">{p.full_name}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md border ${getStatusColor(p.patient_status)}`}>
                    {getStatusLabel(p.patient_status)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 w-full">
                  <span>{p.phone}</span>
                  <span>{p.age} {isAr ? 'سنة' : 'yrs'} · {p.gender}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ─── Detailed Record Panel (Right Column) ─── */}
      <div className="lg:col-span-8 glass-panel rounded-3xl p-6 border border-teal-500/20 max-h-[680px] overflow-y-auto custom-scrollbar flex flex-col">
        {!selectedPatient ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-teal-500/5 border border-teal-500/10 flex items-center justify-center text-teal-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">
                {isAr ? 'لم يتم تحديد أي مريض' : 'No Patient Selected'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                {isAr 
                  ? 'اختر مريضاً من القائمة الجانبية لعرض السجل الطبي الكامل، كتابة الملاحظات، أو تعديل الملف الطبي الموحد.' 
                  : 'Select a patient from the directory list to inspect clinical timeline records, manage notes, or modify profile tags.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header profile row */}
            <div className="flex justify-between items-start border-b border-teal-950 pb-5">
              <div>
                <h3 className="text-xl font-black text-white">{selectedPatient.full_name}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>{isAr ? 'الهاتف:' : 'Phone:'} <strong className="text-teal-400 font-mono">{selectedPatient.phone}</strong></span>
                  <span>·</span>
                  <span>{isAr ? 'العمر:' : 'Age:'} {selectedPatient.age} {isAr ? 'عاماً' : 'years'} ({selectedPatient.birth_date})</span>
                  <span>·</span>
                  <span>{isAr ? 'فصيلة الدم:' : 'Blood Group:'} <strong className="text-teal-400">{selectedPatient.blood_type || 'A+'}</strong></span>
                </p>
              </div>
              {['admin', 'supervisor', 'reception', 'user'].includes(clinicUser?.role || '') && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3.5 py-1.5 rounded-xl border border-teal-500/35 bg-teal-500/10 text-teal-400 text-xs font-bold hover:bg-teal-500/20 transition-all"
                >
                  {isEditing ? (isAr ? 'إلغاء التعديل' : 'Cancel') : (isAr ? 'تعديل الملف الطبي' : 'Edit Profile')}
                </button>
              )}
            </div>

            {/* Profile Editing Form View */}
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4 bg-slate-950/40 p-5 border border-teal-950/80 rounded-2xl">
                <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest mb-3">
                  {isAr ? 'تعديل السجل الطبي والبيانات الحيوية' : 'Edit Medical Metadata'}
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'الجنس' : 'Gender'}</label>
                    <select
                      value={editFields.gender}
                      onChange={(e) => setEditFields({ ...editFields, gender: e.target.value })}
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
                    >
                      <option value="ذكر">{isAr ? 'ذكر' : 'Male'}</option>
                      <option value="أنثى">{isAr ? 'أنثى' : 'Female'}</option>
                      <option value="غير محدد">{isAr ? 'غير محدد' : 'Not Specified'}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'تاريخ الميلاد' : 'Birth Date'}</label>
                    <input
                      type="date"
                      value={editFields.birth_date}
                      onChange={(e) => setEditFields({ ...editFields, birth_date: e.target.value })}
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'العمر الرقمي' : 'Age'}</label>
                    <input
                      type="number"
                      value={editFields.age}
                      onChange={(e) => setEditFields({ ...editFields, age: Number(e.target.value) })}
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 text-left font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'فصيلة الدم' : 'Blood Group'}</label>
                    <input
                      type="text"
                      value={editFields.blood_type}
                      onChange={(e) => setEditFields({ ...editFields, blood_type: e.target.value })}
                      placeholder="e.g. A+"
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 text-left font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'الأمراض المزمنة' : 'Chronic Diseases'}</label>
                    <input
                      type="text"
                      value={editFields.chronic_diseases}
                      onChange={(e) => setEditFields({ ...editFields, chronic_diseases: e.target.value })}
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'الحساسية والأعراض' : 'Allergies'}</label>
                    <input
                      type="text"
                      value={editFields.allergies}
                      onChange={(e) => setEditFields({ ...editFields, allergies: e.target.value })}
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'جهة الاتصال في الطوارئ' : 'Emergency Contact'}</label>
                    <input
                      type="text"
                      value={editFields.emergency_contact_name}
                      onChange={(e) => setEditFields({ ...editFields, emergency_contact_name: e.target.value })}
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'هاتف الطوارئ' : 'Emergency Phone'}</label>
                    <input
                      type="text"
                      value={editFields.emergency_contact_phone}
                      onChange={(e) => setEditFields({ ...editFields, emergency_contact_phone: e.target.value })}
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs text-left font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'تصنيف المريض' : 'Patient Status'}</label>
                    <select
                      value={editFields.patient_status}
                      onChange={(e) => setEditFields({ ...editFields, patient_status: e.target.value })}
                      className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2.5 text-xs"
                    >
                      <option value="normal">{isAr ? '👤 طبيعي' : '👤 Normal'}</option>
                      <option value="vip">{isAr ? '⭐️ مريض VIP' : '⭐️ VIP'}</option>
                      <option value="critical">{isAr ? '🚨 حالة حرجة' : '🚨 Critical'}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">{isAr ? 'ملاحظات وتوجيهات عامة' : 'General Notes'}</label>
                  <textarea
                    value={editFields.notes}
                    onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                    rows={2}
                    className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-xs hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تأكيد وحفظ بيانات الملف الطبي' : 'Save Profile Details')}
                </button>
              </form>
            ) : (
              /* Normal Static Detailed Card */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/20 border border-teal-950/40 p-4 rounded-2xl">
                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="text-slate-500 block">{isAr ? 'النوع والجنس:' : 'Gender:'}</span>
                    <span className="font-bold text-white">{selectedPatient.gender || 'غير محدد'}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500 block">{isAr ? 'تاريخ الميلاد:' : 'Birth Date:'}</span>
                    <span className="font-bold text-white font-mono">{selectedPatient.birth_date || 'غير محدد'}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500 block">{isAr ? 'الأمراض المزمنة:' : 'Chronic Conditions:'}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/10 text-[11px] font-bold">
                      {selectedPatient.chronic_diseases || 'لا يوجد'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="text-slate-500 block">{isAr ? 'حساسية الأدوية:' : 'Allergies:'}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/10 text-[11px] font-bold">
                      {selectedPatient.allergies || 'لا يوجد'}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500 block">{isAr ? 'جهة الطوارئ:' : 'Emergency Contact:'}</span>
                    <span className="font-bold text-white">
                      {selectedPatient.emergency_contact_name 
                        ? `${selectedPatient.emergency_contact_name} (${selectedPatient.emergency_contact_phone})`
                        : 'غير مسجل'}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500 block">{isAr ? 'التوجيه العام:' : 'General Clinical Notes:'}</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{selectedPatient.notes || 'لا توجد ملاحظات عامة.'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Clinical Notes Section */}
            <div className="space-y-4 pt-4 border-t border-teal-950">
              <h4 className="text-sm font-black text-white">
                {isAr ? 'السجل العلاجي والملاحظات السريرية' : 'Clinical History & Medical Notes'}
              </h4>

              {/* Add Clinical Note Form */}
              {['admin', 'supervisor'].includes(clinicUser?.role || '') ? (
                <form onSubmit={handleAddNote} className="space-y-3 bg-[#09151e] border border-teal-950 p-4 rounded-2xl">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-grow">
                      <input
                        type="text"
                        placeholder={isAr ? 'اكتب الأعراض، التشخيص، أو الخطة العلاجية للمريض...' : 'Write symptoms, diagnoses, or clinical plans...'}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-teal-950 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-xs transition-colors"
                      />
                    </div>
                    <div className="flex gap-2 sm:w-64 flex-shrink-0">
                      <select
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value)}
                        className="w-full bg-slate-950 border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 cursor-pointer"
                      >
                        <option value="كشف دوري">{isAr ? 'كشف دوري' : 'Consultation'}</option>
                        <option value="متابعة ضغط">{isAr ? 'متابعة ضغط' : 'Hypertension Check'}</option>
                        <option value="قسطرة قلبية">{isAr ? 'قسطرة قلبية' : 'Catheterization'}</option>
                        <option value="تعديل دواء">{isAr ? 'تعديل دواء' : 'Medication Adjust'}</option>
                        <option value="طوارئ">{isAr ? 'حالة طارئة' : 'Emergency'}</option>
                      </select>
                      
                      <button
                        type="submit"
                        disabled={!newNote.trim()}
                        className="px-4 py-2 bg-teal-500 text-[#070e12] font-black text-xs rounded-xl hover:bg-teal-400 transition-colors disabled:opacity-50"
                      >
                        {isAr ? 'إضافة ✍️' : 'Add Note'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-teal-950/50 text-center text-xs text-slate-400">
                  {isAr 
                    ? 'إضافة الملاحظات الطبية والتشخيصية مخصصة للأطباء والمشرفين فقط.' 
                    : 'Adding medical notes and diagnoses is restricted to doctors and supervisors only.'}
                </div>
              )}

              {/* Notes Timeline List */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pl-1">
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-teal-950/40 rounded-xl">
                    {isAr ? 'لا توجد ملاحظات مسجلة للمريض حالياً.' : 'No clinical notes recorded for this patient.'}
                  </div>
                ) : (
                  notes.map((note) => (
                    <div 
                      key={note.id} 
                      className="p-3.5 rounded-2xl bg-[#09151e] border border-teal-950/50 space-y-1.5 text-right relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span className="font-mono">{new Date(note.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                        <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-bold border border-teal-500/10">
                          {note.note_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-semibold">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
