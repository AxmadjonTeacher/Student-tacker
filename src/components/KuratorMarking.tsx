import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Inbox } from 'lucide-react';
import type { Student } from '../types';
import { supabase } from '../supabase';
import { weekLabelForDate } from '../utils/weekUtils';

interface KuratorMarkingProps {
  students: Student[]; // already band-filtered by App's activeStudents
  weeksList: string[];
}

// Kurator daily marking: per-date attendance (Davomat) and school-rules
// (Maktab qoidalari) toggles for every student in the kurator's grade band.
// Records go to daily_records with subject = 'KURATOR'; the weekly recalc
// writes attendance % and the violation count into student_weeks.
const KuratorMarking: React.FC<KuratorMarkingProps> = ({ students, weeksList }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [activeClassFilter, setActiveClassFilter] = useState<string>('ALL');

  const kuratorName = localStorage.getItem('teacher_name') || 'Kurator';

  const derivedWeek = weekLabelForDate(selectedDate);
  const weekExists = derivedWeek !== null && weeksList.includes(derivedWeek);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const clsCompare = (a.className || '').localeCompare(b.className || '', undefined, { numeric: true });
      if (clsCompare !== 0) return clsCompare;
      return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`);
    });
  }, [students]);

  const classOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.className?.toUpperCase()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  const visibleStudents = useMemo(() => {
    if (activeClassFilter === 'ALL') return sortedStudents;
    return sortedStudents.filter(s => s.className?.toUpperCase() === activeClassFilter);
  }, [sortedStudents, activeClassFilter]);

  // Dates this kurator has already marked (for prev/next navigation)
  const fetchMarkedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_records')
        .select('date')
        .eq('subject', 'KURATOR')
        .eq('teacher_name', kuratorName);
      if (error) throw error;
      if (data) {
        setMarkedDates(Array.from(new Set(data.map(r => r.date))).sort());
      }
    } catch (err) {
      console.error('Error fetching kurator marked dates:', err);
    }
  };

  const fetchDailyRecords = async () => {
    if (!selectedDate) return;
    try {
      const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('date', selectedDate)
        .eq('subject', 'KURATOR');
      if (error) throw error;
      setDailyRecords(data || []);
    } catch (err) {
      console.error('Error fetching kurator daily records:', err);
    }
  };

  useEffect(() => {
    fetchDailyRecords();
  }, [selectedDate]);

  useEffect(() => {
    fetchMarkedDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyRecords.length]);

  // Weekly attendance % (KURATOR records only) + violation count → student_weeks
  const recalculateWeeklyAttendanceAndRules = async (studentId: string, week: string) => {
    try {
      const { data: records, error: fetchErr } = await supabase
        .from('daily_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('week', week)
        .eq('subject', 'KURATOR');
      if (fetchErr) throw fetchErr;

      const total = records ? records.length : 0;
      const present = records ? records.filter(r => r.attendance === true).length : 0;
      const attendanceVal = total > 0 ? Math.round((present / total) * 100) : 100;
      const schoolRules = records ? records.filter(r => r.school_rule === false).length : 0;

      const { data: weekRecord, error: weekErr } = await supabase
        .from('student_weeks')
        .select('id')
        .eq('student_id', studentId)
        .eq('week', week)
        .eq('is_deleted', false)
        .maybeSingle();
      if (weekErr) throw weekErr;

      if (weekRecord) {
        const { error: updateErr } = await supabase
          .from('student_weeks')
          .update({ attendance: attendanceVal, school_rules: schoolRules })
          .eq('id', weekRecord.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('student_weeks')
          .insert([{
            student_id: studentId,
            week: week,
            attendance: attendanceVal,
            homework: 1,
            school_rules: schoolRules,
            eng_score: null,
            math_score: null,
            starting_level: 'Level 1',
            current_level: 'Level 1',
            is_deleted: false
          }]);
        if (insertErr) throw insertErr;
      }
    } catch (err) {
      console.error('Error recalculating weekly attendance/rules:', err);
    }
  };

  const handleAddDay = async () => {
    if (visibleStudents.length === 0) {
      alert("O'quvchilar mavjud emas!");
      return;
    }
    if (!derivedWeek) {
      alert("Yakshanba dars kuni emas — boshqa sana tanlang.");
      return;
    }
    if (!weekExists) {
      alert(`"${derivedWeek}" haftasi hali ochilmagan — avval hafta yaratilishi kerak.`);
      return;
    }

    setIsAddingDay(true);
    try {
      const existingIds = new Set(dailyRecords.map(r => r.student_id?.toString()));
      const newRecords = visibleStudents
        .filter(s => !existingIds.has(s.id?.toString()))
        .map(student => ({
          student_id: student.id,
          date: selectedDate,
          week: derivedWeek,
          subject: 'KURATOR',
          attendance: true,
          homework: true,
          school_rule: true,
          teacher_name: kuratorName
        }));

      if (newRecords.length === 0) {
        alert('Ushbu kun uchun belgilash allaqachon ochilgan.');
        return;
      }

      const { error } = await supabase.from('daily_records').insert(newRecords);
      if (error) throw error;

      await fetchDailyRecords();
      for (const student of visibleStudents) {
        await recalculateWeeklyAttendanceAndRules(student.id, derivedWeek);
      }
      alert("Kun muvaffaqiyatli ochildi! Endi o'quvchilarni belgilashingiz mumkin.");
    } catch (err) {
      console.error('Error adding kurator day:', err);
      alert("Kunni ochishda xatolik yuz berdi.");
    } finally {
      setIsAddingDay(false);
    }
  };

  const handleToggle = async (studentId: string, field: 'attendance' | 'school_rule') => {
    const record = dailyRecords.find(r => r.student_id?.toString() === studentId?.toString());
    if (!record) return;
    setIsSaving(studentId);
    try {
      const newValue = !record[field];
      const { error } = await supabase
        .from('daily_records')
        .update({ [field]: newValue })
        .eq('id', record.id);
      if (error) throw error;

      setDailyRecords(prev => prev.map(r => r.id === record.id ? { ...r, [field]: newValue } : r));
      await recalculateWeeklyAttendanceAndRules(studentId, record.week);
    } catch (err) {
      console.error('Error toggling kurator record:', err);
    } finally {
      setIsSaving(null);
    }
  };

  const prevDate = [...markedDates].reverse().find(d => d < selectedDate) || null;
  const nextDate = markedDates.find(d => d > selectedDate) || null;

  const navButtonStyle = (enabled: boolean): React.CSSProperties => ({
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1.5px solid var(--border-color)',
    borderRadius: '10px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.4,
    transition: 'all 0.15s ease'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Controls card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '24px',
        padding: '1.25rem 1.5rem',
        boxShadow: 'var(--glass-shadow-soft)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: '1rem'
      }}>
        {/* Date picker + nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Dars kuni</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              disabled={!prevDate}
              onClick={() => prevDate && setSelectedDate(prevDate)}
              title="Oldingi belgilangan kun"
              style={navButtonStyle(!!prevDate)}
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'var(--bg-card-hover)',
                color: 'var(--text-primary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                outline: 'none'
              }}
            />
            <button
              disabled={!nextDate}
              onClick={() => nextDate && setSelectedDate(nextDate)}
              title="Keyingi belgilangan kun"
              style={navButtonStyle(!!nextDate)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Derived week chip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>O'quv haftasi</span>
          <div
            title={derivedWeek === null
              ? 'Yakshanba dars kuni emas'
              : (weekExists ? 'Sanadan avtomatik aniqlanadi' : 'Bu hafta hali ochilmagan')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: weekExists ? 'var(--bg-card-hover)' : 'rgba(245, 158, 11, 0.12)',
              color: weekExists ? 'var(--text-primary)' : '#b45309',
              border: weekExists ? '1.5px solid var(--border-color)' : '1.5px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '10px',
              padding: '0.35rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              lineHeight: 1.2,
              whiteSpace: 'nowrap'
            }}
          >
            <Calendar size={12} style={{ flexShrink: 0 }} />
            {derivedWeek === null ? 'Yakshanba' : derivedWeek}
          </div>
        </div>

        {/* Class filter */}
        {classOptions.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Sinf</span>
            <select
              value={activeClassFilter}
              onChange={(e) => setActiveClassFilter(e.target.value)}
              style={{
                background: 'var(--bg-card-hover)',
                color: 'var(--text-primary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Barcha sinflar</option>
              {classOptions.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        )}

        {/* Add day button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.55rem', opacity: 0, pointerEvents: 'none' }}>Label</span>
          <button
            onClick={handleAddDay}
            disabled={isAddingDay}
            title="Ushbu kun uchun belgilashni ochish"
            style={{
              background: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.35rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: isAddingDay ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => { if (!isAddingDay) e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={14} />
            <span>{isAddingDay ? 'Ochilmoqda...' : "Kun qo'shish"}</span>
          </button>
        </div>
      </div>

      {/* Marking table */}
      <div style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        boxShadow: 'var(--glass-shadow-soft)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-card-hover)',
          fontSize: '0.65rem',
          fontWeight: 800,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          <div>O'quvchi</div>
          <div style={{ textAlign: 'center' }}>Davomat</div>
          <div style={{ textAlign: 'center' }}>Maktab qoidalari</div>
        </div>

        {visibleStudents.length === 0 ? (
          <div style={{ padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Inbox size={32} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>O'quvchilar topilmadi</span>
          </div>
        ) : dailyRecords.length === 0 ? (
          <div style={{ padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📅</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ushbu sana uchun belgilash hali ochilmagan.
            </span>
            <button
              onClick={handleAddDay}
              disabled={isAddingDay}
              style={{
                background: 'transparent',
                border: '1px solid var(--accent-hero)',
                color: 'var(--accent-hero)',
                borderRadius: '9999px',
                padding: '0.45rem 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 750,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Kunni ochish
            </button>
          </div>
        ) : (
          visibleStudents.map((student, sIdx) => {
            const record = dailyRecords.find(r => r.student_id?.toString() === student.id?.toString());
            const saving = isSaving === student.id;
            const isAttended = record ? record.attendance : true;
            const rulesOk = record ? record.school_rule !== false : true;

            return (
              <div
                key={student.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  padding: '0.9rem 1.5rem',
                  alignItems: 'center',
                  borderBottom: sIdx === visibleStudents.length - 1 ? 'none' : '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <span style={{ fontWeight: 750, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {student.name} {student.surname}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--border-subtle)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '6px',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    flexShrink: 0
                  }}>
                    {student.className}
                  </span>
                </div>

                {/* Attendance Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {record ? (
                    <button
                      disabled={saving}
                      onClick={() => handleToggle(student.id, 'attendance')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontWeight: 750,
                        fontSize: '0.75rem',
                        transition: 'all 0.2s ease',
                        background: isAttended ? 'rgba(22, 163, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: isAttended ? '#16a34a' : '#ef4444'
                      }}
                    >
                      <span>{isAttended ? '✅ Keldi' : '❌ Kelmadi'}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>-</span>
                  )}
                </div>

                {/* School Rules Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {record ? (
                    <button
                      disabled={saving}
                      onClick={() => handleToggle(student.id, 'school_rule')}
                      title={rulesOk ? "Qoidabuzarlik belgilash (-2 ball jarima)" : "Qoidabuzarlikni bekor qilish"}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontWeight: 750,
                        fontSize: '0.75rem',
                        transition: 'all 0.2s ease',
                        background: rulesOk ? 'rgba(22, 163, 74, 0.12)' : 'rgba(245, 158, 11, 0.18)',
                        color: rulesOk ? '#16a34a' : '#d97706'
                      }}
                    >
                      <span>{rulesOk ? '✅ Buzilmagan' : '⚠️ Qoidabuzarlik'}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>-</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default KuratorMarking;
