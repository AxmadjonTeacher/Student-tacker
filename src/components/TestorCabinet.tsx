import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LogOut, 
  BookOpen, 
  FolderOpen, 
  BarChart2, 
  Settings, 
  Search, 
  ArrowLeft, 
  FileText, 
  ChevronRight, 
  Calendar, 
  Award, 
  Info, 
  ShieldAlert, 
  X, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Key,
  Trash2,
  Download,
  Pencil
} from 'lucide-react';
import type { Student, Teacher, SubjectScore } from '../types';
import StudentTable from './StudentTable';
import iconLight from '../assets/icon-light.png';
import { supabaseTestor } from '../supabase_testor';
import { 
  findMarkerCentroid, 
  warpQuadrilateral, 
  parseOMRSheet, 
  QUESTIONS_LEFT_X,
  QUESTIONS_LEFT_Y_START,
  QUESTIONS_LEFT_Y_STEP,
  QUESTIONS_RIGHT_X,
  QUESTIONS_RIGHT_Y_START,
  QUESTIONS_RIGHT_Y_STEP,
  STUDENT_ID_X,
  STUDENT_ID_Y_START,
  STUDENT_ID_Y_STEP,
  BUBBLE_RADIUS,
  SUPPORTED_SCAN_COUNTS,
  SELECTABLE_QUESTION_COUNTS
} from '../utils/omrScanner';
import type { Point } from '../utils/omrScanner';
import { applyRulesPenaltyPercent, violationsForWeek } from '../utils/penalty';
import { normalizeKeys, normalizeKeyEntry, scoreAnswers, keyEntryToStorage } from '../utils/answerKey';
import { downloadAnswerSheetPNG } from '../utils/sheetGenerator';

// Normalization and sorting helpers
const getClassGroup = (cls: string): string => {
  if (!cls) return '5-Sinf';
  const num = parseInt(cls, 10);
  if (isNaN(num)) return cls;
  return `${num}-Sinf`;
};

const parseWeekToSortValue = (weekStr: string): number => {
  if (!weekStr) return 0;
  if (weekStr.toLowerCase().endsWith('hafta')) {
    const num = parseInt(weekStr, 10);
    return isNaN(num) ? 0 : num;
  }
  const parts = weekStr.split('-');
  if (parts.length !== 2) return 9999;
  const day = parseInt(parts[0], 10);
  if (isNaN(day)) return 9999;
  const monthStr = parts[1].toLowerCase();
  
  const academicMonths = ['sen', 'okt', 'noy', 'dek', 'yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg'];
  const monthIdx = academicMonths.indexOf(monthStr);
  if (monthIdx === -1) return 1000 + day;
  
  return 1000 + monthIdx * 100 + day;
};

// Sentinel group for tests that have no week assigned in the testor DB
const UNASSIGNED_WEEK = '__unassigned__';

// Fallback tests in case database has no data yet - REMOVED

const SAMPLE_OMR_SHEETS = [
  {
    id: '557',
    name: 'Maxmudjonov Muhammadiso',
    correctCount: 11,
    percentage: 73.3,
    answers: ['D', 'C', 'C', 'C', 'B', 'D', 'A', 'B', 'B', 'A', 'D', 'D', 'D', 'B', 'B'],
    signatureImg: '/media__1780067393687.jpg',
    label: 'Muhammad iso (Math - 11/15, ID 557)'
  },
  {
    id: '105',
    name: 'Abdurahmonov MuhammadMustafo',
    correctCount: 14,
    percentage: 93.3,
    answers: ['A', 'A', 'C', 'C', 'B', 'D', 'A', 'B', 'C', 'A', 'D', 'D', 'D', 'B', 'B'],
    signatureImg: '',
    label: 'Abdurahmonov M. (Eng - 14/15, ID 105)'
  },
  {
    id: '120',
    name: 'Omadullayev Muhammadqodir',
    correctCount: 12,
    percentage: 80.0,
    answers: ['D', 'C', 'C', 'C', 'B', 'D', 'A', 'B', 'A', 'A', 'D', 'D', 'D', 'B', 'B'],
    signatureImg: '',
    label: 'Omadullayev M. (Math - 12/15, ID 120)'
  },
  {
    id: '110',
    name: 'Sobitxanov Nurmuhammad',
    correctCount: 8,
    percentage: 53.3,
    answers: ['A', 'B', 'B', 'C', 'B', 'D', 'A', 'B', 'C', 'A', 'C', 'A', 'D', 'B', 'C'],
    signatureImg: '',
    label: 'Sobitxanov N. (Eng - 8/15, ID 110)'
  }
];

interface OMRSheetMockupProps {
  studentIdCode: string;
  answers: string[];
  // Raw questions_json entries — may be "A", "AC" or legacy {correct_answer}
  testKeys: any[];
  students: Student[];
}

const OMRSheetMockup: React.FC<OMRSheetMockupProps> = ({ studentIdCode, answers, testKeys, students }) => {
  const options = ['A', 'B', 'C', 'D'];
  
  // Find mapped student name
  const student = students.find(s => {
    const match = s.id.match(/^(BR|AL)(\d{3})$/);
    return match && match[2] === studentIdCode;
  });
  const studentName = student ? `${student.name} ${student.surname}` : 'Noma’lum talaba';

  return (
    <div style={{
      background: '#fcfcf9',
      border: '1.5px solid #cbd5e1',
      borderRadius: '24px',
      padding: '1.25rem',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01), 0 8px 24px -10px rgba(0,0,0,0.05)',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      width: '100%',
      maxWidth: '380px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      {/* Corner markers */}
      <div style={{ position: 'absolute', top: '8px', left: '8px', width: '10px', height: '10px', background: '#0f172a' }} />
      <div style={{ position: 'absolute', top: '8px', right: '8px', width: '10px', height: '10px', background: '#0f172a' }} />
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '10px', height: '10px', background: '#0f172a' }} />
      <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '10px', height: '10px', background: '#0f172a' }} />

      {/* Name signature field */}
      <div style={{ marginBottom: '1.2rem', marginTop: '0.25rem' }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem', textAlign: 'center' }}>
          Ism va familiya (To`rtburchak tashqarisiga yozmang)
        </div>
        <div style={{
          height: '46px',
          border: '1.5px solid #0f172a',
          background: '#ffffff',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {studentIdCode === '557' ? (
            <img 
              src="/media__1780067393687.jpg" 
              style={{
                position: 'absolute',
                top: '-32px',
                left: '-15px',
                width: '420px',
                height: 'auto',
                opacity: 0.95
              }}
              alt="Muhammad iso"
            />
          ) : (
            <span className="handwritten-signature" style={{
              fontSize: '1.65rem',
              color: '#1e3a8a',
              letterSpacing: '0.03em'
            }}>
              {studentName}
            </span>
          )}
        </div>
      </div>

      {/* Grid container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '0.75rem' }}>
        
        {/* Left Column: Questions 1 to 13 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Array.from({ length: 13 }).map((_, i) => {
            const qNum = i + 1;
            const acceptedKeys = normalizeKeyEntry(testKeys[qNum - 1] || 'A');
            const studentAns = answers[qNum - 1] || '';
            const isCorrect = acceptedKeys.includes(studentAns);

            return (
              <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '22px' }}>
                <span style={{ 
                  fontSize: '0.62rem', 
                  fontWeight: 900, 
                  color: isCorrect ? '#22c55e' : '#ef4444', 
                  width: '10px',
                  textAlign: 'center'
                }}>
                  {isCorrect ? 'C' : 'X'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', minWidth: '12px' }}>{qNum}</span>
                
                {/* Bubble set */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {options.map(opt => {
                    const isSelected = studentAns === opt;
                    const isCorrectOpt = acceptedKeys.includes(opt);
                    let bubbleBg = '#ffffff';
                    let bubbleColor = '#475569';
                    let bubbleBorder = '1px solid #94a3b8';
                    
                    if (isSelected) {
                      bubbleBg = '#1e293b'; // filled pencil color
                      bubbleColor = '#ffffff';
                      bubbleBorder = '1px solid #1e293b';
                    }

                    return (
                      <div 
                        key={opt}
                        style={{
                          width: '17px',
                          height: '17px',
                          borderRadius: '50%',
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: bubbleBg,
                          color: bubbleColor,
                          border: bubbleBorder,
                          position: 'relative'
                        }}
                      >
                        {opt}
                        {isCorrectOpt && (
                          <div style={{
                            position: 'absolute',
                            top: '-2.5px', left: '-2.5px', right: '-2.5px', bottom: '-2.5px',
                            border: '1.5px solid #22c55e',
                            borderRadius: '50%'
                          }} />
                        )}
                        {isSelected && !isCorrect && (
                          <div style={{
                            position: 'absolute',
                            top: '-2.5px', left: '-2.5px', right: '-2.5px', bottom: '-2.5px',
                            border: '1.5px solid #ef4444',
                            borderRadius: '50%'
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Questions 14, 15 and Student ID Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* Questions 14 & 15 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[14, 15].map(qNum => {
              const acceptedKeys = normalizeKeyEntry(testKeys[qNum - 1] || 'A');
              const studentAns = answers[qNum - 1] || '';
              const isCorrect = acceptedKeys.includes(studentAns);

              return (
                <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '22px' }}>
                  <span style={{ 
                    fontSize: '0.62rem', 
                    fontWeight: 900, 
                    color: isCorrect ? '#22c55e' : '#ef4444', 
                    width: '10px',
                    textAlign: 'center'
                  }}>
                    {isCorrect ? 'C' : 'X'}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', minWidth: '12px' }}>{qNum}</span>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {options.map(opt => {
                      const isSelected = studentAns === opt;
                      const isCorrectOpt = acceptedKeys.includes(opt);
                      let bubbleBg = '#ffffff';
                      let bubbleColor = '#475569';
                      let bubbleBorder = '1px solid #94a3b8';
                      
                      if (isSelected) {
                        bubbleBg = '#1e293b';
                        bubbleColor = '#ffffff';
                        bubbleBorder = '1px solid #1e293b';
                      }

                      return (
                        <div 
                          key={opt}
                          style={{
                            width: '17px',
                            height: '17px',
                            borderRadius: '50%',
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: bubbleBg,
                            color: bubbleColor,
                            border: bubbleBorder,
                            position: 'relative'
                          }}
                        >
                          {opt}
                          {isCorrectOpt && (
                            <div style={{
                              position: 'absolute',
                              top: '-2.5px', left: '-2.5px', right: '-2.5px', bottom: '-2.5px',
                              border: '1.5px solid #22c55e',
                              borderRadius: '50%'
                            }} />
                          )}
                          {isSelected && !isCorrect && (
                            <div style={{
                              position: 'absolute',
                              top: '-2.5px', left: '-2.5px', right: '-2.5px', bottom: '-2.5px',
                              border: '1.5px solid #ef4444',
                              borderRadius: '50%'
                            }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Student ID Bubble Grid */}
          <div style={{ 
            border: '1.5px solid #475569', 
            borderRadius: '10px', 
            padding: '0.45rem 0.35rem',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem'
          }}>
            <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#334155', textAlign: 'center', marginBottom: '0.1rem' }}>
              O`quvchi IDsi
            </div>
            
            {/* 3 Header digit boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', marginBottom: '2px' }}>
              {Array.from({ length: 3 }).map((_, colIdx) => {
                const digit = studentIdCode.charAt(colIdx) || '0';
                return (
                  <div key={colIdx} style={{
                    border: '1px solid #475569',
                    borderRadius: '3px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    background: '#f8fafc'
                  }}>
                    {digit}
                  </div>
                );
              })}
            </div>

            {/* Bubble columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
              {Array.from({ length: 3 }).map((_, colIdx) => {
                const activeDigit = parseInt(studentIdCode.charAt(colIdx) || '0', 10);
                return (
                  <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center' }}>
                    {Array.from({ length: 10 }).map((_, rowIdx) => {
                      const isBubbled = rowIdx === activeDigit;
                      return (
                        <div key={rowIdx} style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: '1px solid #94a3b8',
                          background: isBubbled ? '#1e293b' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.45rem',
                          fontWeight: 800,
                          color: isBubbled ? '#ffffff' : '#64748b'
                        }}>
                          {rowIdx}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TestorCabinetProps {
  students: Student[];
  studentWeeks: any[];
  subjectScores?: SubjectScore[];
  teachers: Teacher[];
  onLogout: (force?: boolean) => void;
  onUpdateStudentScore?: (studentId: string, subject: string, score: number, week: string) => Promise<void>;
  onClearStudentScore?: (studentId: string, subject: string, week: string) => Promise<void>;
}

const TestorCabinet: React.FC<TestorCabinetProps> = ({
  students,
  studentWeeks,
  subjectScores = [],
  teachers,
  onLogout,
  onUpdateStudentScore,
  onClearStudentScore
}) => {
  // Mobile UI vs Desktop UI states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'tests' | 'folders' | 'analysis' | 'settings'>('tests');

  // Accent color state
  const [accentColor, setAccentColor] = useState<'indigo' | 'teal' | 'emerald' | 'rose'>(() => {
    const saved = localStorage.getItem('testor_theme_accent');
    return (saved as any) || 'indigo';
  });

  const colors = {
    indigo: { primary: '#4f46e5', bg: '#f5f3ff', border: '#ddd6fe', text: '#4c1d95', hover: '#c7d2fe' },
    teal: { primary: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', text: '#115e59', hover: '#ccfbf1' },
    emerald: { primary: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', hover: '#d1fae5' },
    rose: { primary: '#f43f5e', bg: '#fff1f2', border: '#fecdd3', text: '#881337', hover: '#ffe4e6' }
  }[accentColor];

  // Database tests state
  const [dbTests, setDbTests] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Available weeks from the main DB (used by the add-test modal, scan-save
  // defaulting, and the Tahlil week dropdown) — declared early on purpose
  const weeksList = useMemo(() => {
    const weeksSet = new Set<string>();
    studentWeeks.forEach(sw => {
      if (sw.week && !sw.is_deleted) weeksSet.add(sw.week);
    });
    return Array.from(weeksSet).sort((a, b) => {
      return parseWeekToSortValue(a) - parseWeekToSortValue(b);
    });
  }, [studentWeeks]);

  // Week dropdowns show the last 4 weeks; "Eski haftalar…" expands the full list
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const weekOptionsFor = (selected: string) => {
    if (showAllWeeks || weeksList.length <= 4) return weeksList;
    const last4 = weeksList.slice(-4);
    if (selected && !last4.includes(selected)) return [selected, ...last4];
    return last4;
  };

  // States for adding a new test
  // newTestSubject holds 'Matematika' | 'Ingliz Tili' | an existing custom subject
  // name | 'CUSTOM' (sentinel for the "new subject" text input).
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestSubject, setNewTestSubject] = useState<string>('Matematika');
  const [newCustomSubjectName, setNewCustomSubjectName] = useState('');
  const [newTestQuestionsCount, setNewTestQuestionsCount] = useState(15);
  const [newTestWeek, setNewTestWeek] = useState('');
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  // Custom subjects already present among tests (offered for reuse in the modal)
  const existingCustomSubjects = useMemo(() => {
    return Array.from(new Set(
      dbTests
        .map(t => t.subject)
        .filter(s => s && s !== 'Matematika' && s !== 'Ingliz Tili' && s !== 'Boshqa')
    )).sort() as string[];
  }, [dbTests]);

  const openAddTestModal = () => {
    setNewTestName('');
    setNewTestSubject('Matematika');
    setNewCustomSubjectName('');
    setNewTestQuestionsCount(15);
    setNewTestWeek('');
    setShowAddTestModal(true);
  };

  // Test actions modal: move the test to another week folder, or delete it
  const [showTestActionsModal, setShowTestActionsModal] = useState(false);
  const [moveTargetWeek, setMoveTargetWeek] = useState('');
  const [isDeletingTest, setIsDeletingTest] = useState(false);

  // States for folder tree expansion in "Papkalar" section
  // Hierarchy: Week → Subject → Tests; subject keys are week-prefixed
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const toggleWeek = (week: string) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [week]: !prev[week]
    }));
  };

  const toggleSubject = (week: string, subj: string) => {
    const key = `${week}__${subj}`;
    setExpandedSubjects(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSubject = newTestSubject === 'CUSTOM' ? newCustomSubjectName.trim() : newTestSubject;
    if (!newTestName.trim()) {
      alert("Iltimos, test nomini kiriting!");
      return;
    }
    if (!effectiveSubject) {
      alert("Iltimos, yangi fan nomini kiriting!");
      return;
    }
    if (newTestQuestionsCount < 1 || newTestQuestionsCount > 100) {
      alert("Savollar soni 1 va 100 oralig'ida bo'lishi kerak!");
      return;
    }

    setIsCreatingTest(true);
    const questionsArray = Array(newTestQuestionsCount).fill("A");

    // Tests are no longer bound to a teacher or class — student matching is
    // school-wide by the unique 3-digit ID code.
    const newTestData = {
      name: newTestName.trim(),
      subject: effectiveSubject,
      teacher_name: '',
      level: '',
      questions_json: questionsArray,
      student_count: 0
    };

    // week/question_count columns may not exist yet in the testor DB
    // (TEST_GENERATOR_INTEGRATION.md SQL not run) — sent separately so the
    // insert can be retried without them on a 42703 undefined-column error.
    const newColumnsData = {
      week: newTestWeek || null,
      question_count: newTestQuestionsCount
    };

    try {
      // 1. Try to insert to database (with new columns, retry without on 42703)
      let { data, error } = await supabaseTestor
        .from('public_tests')
        .insert([{ ...newTestData, ...newColumnsData }])
        .select();

      if (error && (error.code === '42703' || (error.message || '').includes('column'))) {
        ({ data, error } = await supabaseTestor
          .from('public_tests')
          .insert([newTestData])
          .select());
      }

      if (error) {
        throw error;
      }

      // If database insert succeeded:
      if (data && data.length > 0) {
        const created = {
          id: data[0].id.toString(),
          name: data[0].name || newTestData.name,
          subject: data[0].subject || newTestData.subject,
          created_at: data[0].created_at || new Date().toISOString(),
          teacher_name: data[0].teacher_name || newTestData.teacher_name,
          level: data[0].level || newTestData.level,
          questions_json: Array.isArray(data[0].questions_json)
            ? data[0].questions_json
            : newTestData.questions_json,
          student_count: data[0].student_count || 0,
          week: data[0].week || newTestWeek || null
        };
        setDbTests(prev => [created, ...prev]);
        alert("Yangi test muvaffaqiyatli yaratildi va ma'lumotlar bazasiga saqlandi!");
      } else {
        // Fallback in case of no returning data but no error
        const localId = 'local_' + Date.now();
        const localCreated = {
          id: localId,
          ...newTestData,
          ...newColumnsData,
          created_at: new Date().toISOString()
        };
        setDbTests(prev => [localCreated, ...prev]);
        alert("Yangi test muvaffaqiyatli yaratildi!");
      }
    } catch (err: any) {
      console.warn("DB insert failed, falling back to local session memory:", err.message || err);
      // Fallback: create locally
      const localId = 'local_' + Date.now();
      const localCreated = {
        id: localId,
        ...newTestData,
        ...newColumnsData,
        created_at: new Date().toISOString()
      };
      setDbTests(prev => [localCreated, ...prev]);
      alert("Eslatma: Ma'lumotlar bazasiga yozish imkoni bo'lmadi (RLS ruxsati). Test vaqtinchalik xotiraga saqlandi va ushbu seans davomida ishlatilishi mumkin!");
    } finally {
      setIsCreatingTest(false);
      setShowAddTestModal(false);
    }
  };

  // Sync isMobile on resizing
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch tests from secondary database
  const fetchTests = async () => {
    try {
      setDbLoading(true);
      const { data, error } = await supabaseTestor
        .from('public_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Parse database rows to format
        const formatted = data.map((t: any) => {
          let questions = [];
          if (Array.isArray(t.questions_json)) {
            questions = t.questions_json;
          } else if (typeof t.questions_json === 'string') {
            try {
              questions = JSON.parse(t.questions_json);
            } catch {
              questions = Array(15).fill("A");
            }
          } else {
            questions = Array(15).fill("A");
          }

          // question_count column (when present) is authoritative over key array length
          if (typeof t.question_count === 'number' && t.question_count > 0 && questions.length !== t.question_count) {
            questions = questions.length > t.question_count
              ? questions.slice(0, t.question_count)
              : [...questions, ...Array(t.question_count - questions.length).fill("A")];
          }

          return {
            id: t.id.toString(),
            name: t.name || 'Nomsiz test',
            subject: t.subject || 'Boshqa',
            created_at: t.created_at || new Date().toISOString(),
            teacher_name: t.teacher_name || '',
            level: t.level || '',
            questions_json: questions,
            student_count: t.student_count || 0,
            week: t.week || null
          };
        });
        setDbTests(formatted);
      } else {
        setDbTests([]);
      }
    } catch (err) {
      console.error('Error fetching tests from secondary DB:', err);
      setDbTests([]);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const getScannedCount = (testId: string) => {
    const saved = localStorage.getItem(`testor_scans_${testId}`);
    if (saved) {
      try {
        const scans = JSON.parse(saved);
        if (Array.isArray(scans)) return scans.length;
      } catch {}
    }
    return 0;
  };

  // ---- test_scans mirror (testor DB) ----
  // Raw per-question answers are mirrored to the testor DB so answer-key
  // edits can re-score committed results from any device (sql/testor_test_scans.sql).
  // Every call degrades silently to the localStorage buffer when the table
  // is missing or the device is offline.
  interface TestorScan {
    id: string;
    studentId: string;
    studentName: string;
    studentIdCode: string;
    scannedAt: string;
    answers: (string | null)[];
    correctCount: number;
    totalQuestions: number;
    percentage: number;
    week: string;
  }

  interface TestScanDbRow {
    id: string;
    student_id: string | null;
    student_id_code: string | null;
    student_name: string | null;
    answers: unknown;
    correct_count: number | null;
    total_questions: number | null;
    percentage: number | null;
    week: string | null;
    scanned_at: string | null;
  }

  const scanToDbRow = (testId: string, scan: TestorScan) => ({
    test_id: testId,
    student_id: scan.studentId || null,
    student_id_code: scan.studentIdCode || null,
    student_name: scan.studentName || null,
    answers: scan.answers || [],
    correct_count: scan.correctCount ?? 0,
    total_questions: scan.totalQuestions ?? 0,
    percentage: scan.percentage ?? 0,
    week: scan.week || null,
    updated_at: new Date().toISOString()
  });

  const dbRowToScan = (row: TestScanDbRow): TestorScan => ({
    id: `db_${row.id}`,
    studentId: row.student_id || '',
    studentName: row.student_name || '',
    studentIdCode: row.student_id_code || '',
    scannedAt: row.scanned_at
      ? new Date(row.scanned_at).toLocaleTimeString() + ' ' + new Date(row.scanned_at).toLocaleDateString()
      : '',
    answers: Array.isArray(row.answers) ? row.answers : [],
    correctCount: row.correct_count ?? 0,
    totalQuestions: row.total_questions ?? 0,
    percentage: row.percentage ?? 0,
    week: row.week || ''
  });

  const upsertScansToDb = async (testId: string, scans: TestorScan[]) => {
    if (!scans.length) return;
    try {
      await supabaseTestor
        .from('test_scans')
        .upsert(scans.map(s => scanToDbRow(testId, s)), { onConflict: 'test_id,student_id' });
    } catch (err) {
      console.warn('test_scans upsert skipped (table missing/offline):', err);
    }
  };

  const deleteScanFromDb = async (testId: string, studentId: string) => {
    if (!studentId) return;
    try {
      await supabaseTestor
        .from('test_scans')
        .delete()
        .eq('test_id', testId)
        .eq('student_id', studentId);
    } catch (err) {
      console.warn('test_scans delete skipped (table missing/offline):', err);
    }
  };

  const fetchScansFromDb = async (testId: string): Promise<TestorScan[] | null> => {
    try {
      const { data, error } = await supabaseTestor
        .from('test_scans')
        .select('*')
        .eq('test_id', testId);
      if (error) throw error;
      return ((data || []) as TestScanDbRow[]).map(dbRowToScan);
    } catch (err) {
      console.warn('test_scans fetch skipped (table missing/offline):', err);
      return null;
    }
  };

  // Sync / local saves for answer key updates, then re-score every committed
  // scan of this test against the new key (raw answers come from the
  // test_scans mirror, falling back to this device's localStorage buffer).
  const handleSaveAnswerKey = async (testId: string, updatedKeys: any[]) => {
    const test = dbTests.find(t => t.id === testId);
    // Update local state first
    const updated = dbTests.map(t => {
      if (t.id === testId) {
        return { ...t, questions_json: updatedKeys };
      }
      return t;
    });
    setDbTests(updated);

    try {
      // Attempt database update
      const { error } = await supabaseTestor
        .from('public_tests')
        .update({ questions_json: updatedKeys })
        .eq('id', testId);

      if (error) {
        console.warn('DB update failed, fell back to local memory:', error.message);
      }
    } catch (err) {
      console.error('Failed to update DB keys:', err);
    }

    try {
      const newKeys = normalizeKeys(updatedKeys);

      // Merge the local buffer with scans synced from other devices
      let scans: TestorScan[] = [];
      const saved = localStorage.getItem(`testor_scans_${testId}`);
      if (saved) {
        try { scans = JSON.parse(saved) || []; } catch { /* corrupted buffer — start empty */ }
      }
      const dbScans = await fetchScansFromDb(testId);
      if (dbScans && dbScans.length) {
        const byStudent = new Map<string, TestorScan>();
        scans.forEach(s => { if (s.studentId) byStudent.set(s.studentId, s); });
        dbScans.forEach(s => { if (s.studentId) byStudent.set(s.studentId, s); });
        scans = Array.from(byStudent.values());
      }
      if (!scans.length) return;

      const rescored = scans.map(s => {
        const answers = Array.isArray(s.answers) ? s.answers : [];
        const { correctCount, percentage } = scoreAnswers(answers, newKeys);
        return { ...s, correctCount, totalQuestions: newKeys.length, percentage };
      });
      const changed = rescored.filter((s, i) =>
        s.percentage !== scans[i].percentage || s.correctCount !== scans[i].correctCount
      );

      localStorage.setItem(`testor_scans_${testId}`, JSON.stringify(rescored));
      if (selectedTest && selectedTest.id === testId) setCurrentTestScans(rescored);
      upsertScansToDb(testId, rescored);

      // Push changed percentages into student records (student_weeks / subject_scores)
      const subject = test?.subject || selectedTest?.subject;
      const pushable = changed.filter(s => s.studentId && s.week && subject);
      if (pushable.length && onUpdateStudentScore) {
        setRescoreProgress({ done: 0, total: pushable.length });
        let done = 0;
        let failed = 0;
        for (const s of pushable) {
          try {
            await onUpdateStudentScore(s.studentId, subject, s.percentage, s.week);
          } catch (err) {
            failed++;
            console.error('Re-score push failed for', s.studentId, err);
          }
          done++;
          setRescoreProgress({ done, total: pushable.length });
        }
        setRescoreProgress(null);
        alert(
          `Kalit yangilandi: ${rescored.length} ta skan qayta hisoblandi, ` +
          `${pushable.length - failed} ta o'quvchi bahosi yangilandi` +
          (failed ? `, ${failed} ta xatolik.` : '.')
        );
      } else {
        alert(`Kalit yangilandi: ${rescored.length} ta skan qayta hisoblandi (baholar o'zgarmadi).`);
      }
    } catch (err) {
      setRescoreProgress(null);
      console.error('Re-scoring failed:', err);
      alert("Kalit saqlandi, lekin natijalarni qayta hisoblashda xatolik yuz berdi.");
    }
  };

  // Move a test into another week folder (Papkalar hierarchy is Week → Subject → Tests)
  const handleMoveTestToWeek = async (testId: string, week: string) => {
    const newWeek = week || null;
    setDbTests(prev => prev.map(t => t.id === testId ? { ...t, week: newWeek } : t));
    if (selectedTest && selectedTest.id === testId) {
      setSelectedTest({ ...selectedTest, week: newWeek });
    }
    try {
      const { error } = await supabaseTestor
        .from('public_tests')
        .update({ week: newWeek })
        .eq('id', testId);
      if (error) console.warn('Week move DB update failed, kept locally:', error.message);
    } catch (err) {
      console.error('Failed to move test week:', err);
    }
    setShowTestActionsModal(false);
  };

  // Delete a test together with its scans (DB + local buffer)
  const handleDeleteTest = async (testId: string) => {
    setIsDeletingTest(true);
    try {
      if (!testId.startsWith('local_')) {
        try {
          await supabaseTestor.from('test_scans').delete().eq('test_id', testId);
        } catch (err) {
          console.warn('test_scans cleanup skipped:', err);
        }
        const { data, error } = await supabaseTestor
          .from('public_tests')
          .delete()
          .eq('id', testId)
          .select('id');
        if (error) throw error;
        // RLS-blocked deletes "succeed" with 0 rows — surface that honestly
        if (!data || data.length === 0) {
          throw new Error('Delete blocked by RLS (run sql/testor_public_tests_policy.sql)');
        }
      }
      localStorage.removeItem(`testor_scans_${testId}`);
      setDbTests(prev => prev.filter(t => t.id !== testId));
      setSelectedTest(null);
      setShowTestActionsModal(false);
    } catch (err) {
      console.error('Failed to delete test:', err);
      alert("Testni o'chirishda xatolik yuz berdi.");
    } finally {
      setIsDeletingTest(false);
    }
  };

  // Sync / local saves for student counts
  const handleIncrementStudentCount = async (testId: string, newCount: number) => {
    // Update local state
    const updated = dbTests.map(t => {
      if (t.id === testId) {
        return { ...t, student_count: newCount };
      }
      return t;
    });
    setDbTests(updated);

    try {
      // Attempt database update
      await supabaseTestor
        .from('public_tests')
        .update({ student_count: newCount })
        .eq('id', testId);
    } catch (err) {
      console.error('Failed to update student count in DB:', err);
    }
  };

  // Weekly Tests Tab States
  const [testsSearch, setTestsSearch] = useState('');
  const testsClassFilter = 'ALL';
  const [selectedTest, setSelectedTest] = useState<any | null>(null);

  // Dynamic grouping computed values.
  // Tree hierarchy: Week → Subject → Teacher → Tests. Tests without a week
  // are grouped under the UNASSIGNED_WEEK sentinel, rendered last.
  const testWeekOf = (t: { week?: string | null }) => t.week || UNASSIGNED_WEEK;

  const testWeeks = useMemo(() => {
    const set = new Set<string>();
    dbTests.forEach(t => set.add(testWeekOf(t)));
    return Array.from(set).sort((a, b) => {
      if (a === UNASSIGNED_WEEK) return 1;
      if (b === UNASSIGNED_WEEK) return -1;
      return parseWeekToSortValue(a) - parseWeekToSortValue(b);
    });
  }, [dbTests]);

  const getSubjectsForWeek = (week: string) => {
    const set = new Set<string>();
    dbTests.forEach(t => {
      if (testWeekOf(t) === week && t.subject) set.add(t.subject);
    });
    return Array.from(set).sort();
  };

  const getTestsForSubject = (week: string, subj: string) => {
    return dbTests.filter(t => testWeekOf(t) === week && t.subject === subj);
  };

  // Options views & Camera scanning states
  const [showEditKeyModal, setShowEditKeyModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Camera setup
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanStatus, setScanStatus] = useState<'aligning' | 'scanning' | 'saving' | 'success'>('aligning');
  const [scanProgress, setScanProgress] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [lastScannedStudent, setLastScannedStudent] = useState<{
    name: string;
    surname: string;
    studentId: string;
    studentIdCode: string;
    correctCount: number;
    totalQuestions: number;
    percentage: number;
    saved: boolean;
  } | null>(null);

  // Corner markers detection feedback
  const [detectedCorners, setDetectedCorners] = useState<{
    tl: Point | null;
    tr: Point | null;
    bl: Point | null;
    br: Point | null;
  }>({ tl: null, tr: null, bl: null, br: null });

  // Scan OMR validation state
  const [scannedOMRSheet, setScannedOMRSheet] = useState<any | null>(null);
  const [selectedStudentForScan, setSelectedStudentForScan] = useState<string>('');
  
  // localStorage persistence of OMR scans
  const [currentTestScans, setCurrentTestScans] = useState<any[]>([]);

  // Key-edit re-scoring progress ("34/70") shown as a global toast
  const [rescoreProgress, setRescoreProgress] = useState<{ done: number; total: number } | null>(null);
  // Guards the per-test test_scans fetch (selectedTest object identity churns
  // on every key toggle in the edit modal)
  const lastScansFetchRef = useRef<string | null>(null);

  // OMR scan helper states
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedWeekForSaving, setSelectedWeekForSaving] = useState<string>('');
  const [syncingScore, setSyncingScore] = useState<boolean>(false);
  const [selectedScanDetail, setSelectedScanDetail] = useState<any | null>(null);
  const [reviewFilterTab, setReviewFilterTab] = useState<'Last' | 'First' | 'ID' | 'Ext'>('Last');
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');
  const [selectedSampleSheet, setSelectedSampleSheet] = useState<any>(SAMPLE_OMR_SHEETS[0]);

  // Sync selectedWeekForSaving with selectedWeek
  useEffect(() => {
    if (selectedWeek) {
      setSelectedWeekForSaving(selectedWeek);
    }
  }, [selectedWeek]);

  useEffect(() => {
    if (selectedTest) {
      const saved = localStorage.getItem(`testor_scans_${selectedTest.id}`);
      let local: TestorScan[] = [];
      if (saved) {
        try { local = JSON.parse(saved) || []; } catch { /* corrupted buffer — start empty */ }
      }
      setCurrentTestScans(local);
      // Merge in scans synced from other devices (test_scans mirror) once per test
      if (lastScansFetchRef.current !== selectedTest.id) {
        lastScansFetchRef.current = selectedTest.id;
        const testId = selectedTest.id;
        fetchScansFromDb(testId).then(dbScans => {
          if (!dbScans || !dbScans.length) return;
          const byStudent = new Map<string, TestorScan>();
          local.forEach(s => { if (s.studentId) byStudent.set(s.studentId, s); });
          dbScans.forEach(s => { if (s.studentId) byStudent.set(s.studentId, s); });
          const merged = Array.from(byStudent.values());
          setCurrentTestScans(merged);
          localStorage.setItem(`testor_scans_${testId}`, JSON.stringify(merged));
        });
      }
      // Tests linked to a week pre-select that week for scan saving
      // (the review dropdown still allows manual override)
      if (selectedTest.week && selectedTest.week !== UNASSIGNED_WEEK && weeksList.includes(selectedTest.week)) {
        setSelectedWeek(selectedTest.week);
        setSelectedWeekForSaving(selectedTest.week);
      }
    } else {
      setCurrentTestScans([]);
      lastScansFetchRef.current = null;
    }
  }, [selectedTest]);

  // Camera stream trigger
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        setScanStatus('aligning');
        setScanProgress(0);
        setDetectedCorners({ tl: null, tr: null, bl: null, br: null });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        activeStream = stream;
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Camera video play error:", e));
        }
      } catch (err) {
        console.error('Camera capture error:', err);
        // Fallback: Camera not allowed, keep cameraStream null
        setScanStatus('aligning');
        setCameraStream(null);
      }
    };

    if (showScanModal) {
      setLastScannedStudent(null);
      setShowFlash(false);
      startCamera();
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setDetectedCorners({ tl: null, tr: null, bl: null, br: null });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showScanModal]);

  // Real-time camera frames loop using RequestAnimationFrame
  useEffect(() => {
    if (!showScanModal || !cameraStream || scanStatus !== 'aligning') {
      setDetectedCorners({ tl: null, tr: null, bl: null, br: null });
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let active = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // Only need 2 consecutive frames for instant scanning (ZipGrade-style)
    let consecutiveSuccessFrames = 0;
    let lastCorners: [Point, Point, Point, Point] | null = null;

    const processFrame = () => {
      if (!active) return;
      try {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Use actual video dimensions for high-res warping
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const cw = video.clientWidth || 640;
        const ch = video.clientHeight || 480;

        // 1. Create downscaled canvas for super fast marker detection (CPU-friendly BFS)
        const detW = 800;
        const detH = 600;
        const detCanvas = document.createElement('canvas');
        detCanvas.width = detW;
        detCanvas.height = detH;
        const detCtx = detCanvas.getContext('2d', { willReadFrequently: true })!;

        // Draw video frame onto downscaled detection canvas
        detCtx.drawImage(video, 0, 0, detW, detH);

        // Aspect Ratio Scale & offset calculations to map video coords to screen overlay
        const scaleFit = Math.max(cw / vw, ch / vh);
        const scaledW = vw * scaleFit;
        const scaledH = vh * scaleFit;
        const offsetX = (cw - scaledW) / 2;
        const offsetY = (ch - scaledH) / 2;

        const mapToScreen = (pt: Point) => ({
          x: (pt.x / detW) * scaledW + offsetX,
          y: (pt.y / detH) * scaledH + offsetY
        });

        // 2. ZipGrade-style hover scanning: search each FULL quadrant of the
        // frame instead of tight windows around viewfinder guides, so the
        // sheet locks on wherever it sits in the frame — no manual alignment.
        const qx = detW * 0.25;
        const qy = detH * 0.25;
        const qRadius = Math.max(qx, qy); // window covers the whole quadrant

        // Corner hints bias each quadrant search toward the outermost square
        // (the actual fiducial), so a stray dark blob nearer the frame center
        // can't win over the real corner marker.
        let tlDet = findMarkerCentroid(detCtx, qx, qy, qRadius, { x: 0, y: 0 });
        let trDet = findMarkerCentroid(detCtx, detW - qx, qy, qRadius, { x: detW, y: 0 });
        let blDet = findMarkerCentroid(detCtx, qx, detH - qy, qRadius, { x: 0, y: detH });
        let brDet = findMarkerCentroid(detCtx, detW - qx, detH - qy, qRadius, { x: detW, y: detH });

        // Geometry sanity check: the four blobs must form a sensibly sized,
        // correctly ordered quadrilateral (guards against false positives now
        // that the search covers the full frame)
        if (tlDet && trDet && blDet && brDet) {
          const topW = trDet.x - tlDet.x;
          const botW = brDet.x - blDet.x;
          const leftH = blDet.y - tlDet.y;
          const rightH = brDet.y - trDet.y;
          if (topW < detW * 0.18 || botW < detW * 0.18 || leftH < detH * 0.22 || rightH < detH * 0.22) {
            tlDet = trDet = blDet = brDet = null;
          }
        }

        // Store detected corners mapped to absolute screen pixels for UI feedback (snapping dots)
        setDetectedCorners({
          tl: tlDet ? mapToScreen(tlDet) : null,
          tr: trDet ? mapToScreen(trDet) : null,
          bl: blDet ? mapToScreen(blDet) : null,
          br: brDet ? mapToScreen(brDet) : null
        });

        if (tlDet && trDet && blDet && brDet) {
          // Scale detected markers back to the native video resolution
          const scaleX = vw / detW;
          const scaleY = vh / detH;
          const tl = { x: tlDet.x * scaleX, y: tlDet.y * scaleY };
          const tr = { x: trDet.x * scaleX, y: trDet.y * scaleY };
          const bl = { x: blDet.x * scaleX, y: blDet.y * scaleY };
          const br = { x: brDet.x * scaleX, y: brDet.y * scaleY };

          // Jitter and stability check: compare current corners with the previous frame's corners
          let isStable = true;
          if (lastCorners) {
            const distTL = Math.hypot(tl.x - lastCorners[0].x, tl.y - lastCorners[0].y);
            const distTR = Math.hypot(tr.x - lastCorners[1].x, tr.y - lastCorners[1].y);
            const distBL = Math.hypot(bl.x - lastCorners[2].x, bl.y - lastCorners[2].y);
            const distBR = Math.hypot(br.x - lastCorners[3].x, br.y - lastCorners[3].y);
            
            // Tolerance scales with native resolution (≈3% of frame width) so
            // normal handheld shake doesn't keep resetting the lock-on.
            const maxJitter = Math.max(24, vw * 0.03);
            if (distTL > maxJitter || distTR > maxJitter || distBL > maxJitter || distBR > maxJitter) {
              isStable = false;
            }
          }

          if (isStable) {
            consecutiveSuccessFrames++;
          } else {
            // Jitter detected, reset counter to 1 to start stabilizing again
            consecutiveSuccessFrames = 1;
          }

          lastCorners = [tl, tr, bl, br];

          // 2 consecutive stable frames is enough for an instant lock-on
          if (consecutiveSuccessFrames >= 2) {
            // Success! Stop loop, perform warp and parse
            active = false;
            
            // Draw video frame at full native resolution on the main canvas
            canvas.width = vw;
            canvas.height = vh;
            ctx.drawImage(video, 0, 0, vw, vh);

            handleGradeOMRFrame(ctx, lastCorners);
            return;
          }
        } else {
          consecutiveSuccessFrames = 0;
          lastCorners = null;
        }
      }
      } catch (err) {
        // A single bad frame must never kill the scan loop — log and keep going
        console.warn('OMR frame processing error (continuing):', err);
        consecutiveSuccessFrames = 0;
        lastCorners = null;
      }

      if (active) requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);

    return () => {
      active = false;
    };
  }, [showScanModal, cameraStream, scanStatus]);

  // Trigger OMR parser simulation if camera stream is not available
  useEffect(() => {
    let timer: any = null;
    let progressTimer: any = null;
    
    if (showScanModal && !cameraStream && scanStatus === 'aligning') {
      timer = setTimeout(() => {
        setScanStatus('scanning');
        
        progressTimer = setInterval(() => {
          setScanProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressTimer);
              handleTriggerOMRGrade();
              return 100;
            }
            return prev + 10;
          });
        }, 150);

      }, 1500);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [showScanModal, cameraStream, scanStatus, selectedSampleSheet]);

  // Dynamic grading frame processor
  const handleGradeOMRFrame = (ctx: CanvasRenderingContext2D, corners: [Point, Point, Point, Point]) => {
    if (!selectedTest) return;

    // 1. Create a 750 x 1000 destination canvas
    const warpCanvas = document.createElement('canvas');
    warpCanvas.width = 750;
    warpCanvas.height = 1000;
    
    // 2. Warp the frame to the destination canvas
    warpQuadrilateral(ctx, corners, warpCanvas);
    
    // 3. Grade against the selected test key (entries may hold several
    //    accepted letters, e.g. "AC")
    const rawKeys = selectedTest.questions_json || Array(15).fill("A");
    const testKeys = normalizeKeys(rawKeys);
    const numQuestions = testKeys.length;

    // 4. Parse the bubbled answers & ID using the layout for this question count
    const parsed = parseOMRSheet(warpCanvas, numQuestions);

    let studentAnswers = [...parsed.answers];
    if (studentAnswers.length < numQuestions) {
      studentAnswers = [...studentAnswers, ...Array(numQuestions - studentAnswers.length).fill("A")];
    } else if (studentAnswers.length > numQuestions) {
      studentAnswers = studentAnswers.slice(0, numQuestions);
    }

    const { correctCount: correct } = scoreAnswers(studentAnswers, testKeys);

    // 5. Crop the signature region from the warped canvas
    const sigCanvas = document.createElement('canvas');
    sigCanvas.width = 597;
    sigCanvas.height = 39;
    const sigCtx = sigCanvas.getContext('2d')!;
    sigCtx.drawImage(warpCanvas, 77, 35, 597, 39, 0, 0, 597, 39);
    const signatureDataURL = sigCanvas.toDataURL('image/jpeg', 0.85);

    const omrData = {
      studentIdCode: parsed.studentIdCode,
      answers: studentAnswers,
      correctCount: correct,
      totalQuestions: numQuestions,
      percentage: Math.round((correct / numQuestions) * 100),
      signatureImg: signatureDataURL
    };

    setScannedOMRSheet(omrData);

    // 7. Auto-map student in class list: AL + 3 digit code (e.g. AL557)
    const matchingStudent = students.find(s => {
      const matchNum = s.id.match(/^(BR|AL)(\d{3})$/);
      return matchNum && matchNum[2] === parsed.studentIdCode;
    });

    if (matchingStudent) {
      setSelectedStudentForScan(matchingStudent.id);
      
      // Trigger camera flash
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 150);

      // Auto-save instantly!
      setScanStatus('saving');
      
      // Play beep
      playSuccessBeep();

      // Update persistent last scanned student info state
      setLastScannedStudent({
        name: matchingStudent.name,
        surname: matchingStudent.surname,
        studentId: matchingStudent.id,
        studentIdCode: parsed.studentIdCode,
        correctCount: omrData.correctCount,
        totalQuestions: omrData.totalQuestions,
        percentage: omrData.percentage,
        saved: true
      });

      // Save to database asynchronously
      saveOMRDataCore(matchingStudent.id, omrData).then(() => {
        // Automatically resume scanning after brief delay
        setTimeout(() => {
          // If the user hasn't manually closed the scanner or changed state
          setScanStatus('aligning');
          setScanProgress(0);
        }, 1200);
      });

    } else {
      // Unrecognized student - fallback to manual review screen
      setSelectedStudentForScan('');
      setScanStatus('success');
    }
  };

  // Perform grading and student association simulation using real OMR Canvas Parser
  const handleTriggerOMRGrade = (sample?: any) => {
    if (!selectedTest) return;

    const sheet = sample || selectedSampleSheet || SAMPLE_OMR_SHEETS[0];
    const rawKeys = selectedTest.questions_json || Array(15).fill("A");
    const testKeys = normalizeKeys(rawKeys);
    const numQuestions = testKeys.length;

    // Load OMR template image, draw mock answers onto it, then parse
    const img = new Image();
    img.src = '/omr_sheet_template.svg';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 750;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Draw bubbles
      ctx.fillStyle = '#1e293b';
      const options = ['A', 'B', 'C', 'D'];

      // Draw answers
      const numQs = Math.min(sheet.answers.length, 15);
      for (let i = 0; i < numQs; i++) {
        const ans = sheet.answers[i];
        if (!ans) continue;
        
        const colIdx = options.indexOf(ans);
        if (colIdx === -1) continue;
        
        let cx = 0;
        let cy = 0;
        if (i < 13) {
          cx = QUESTIONS_LEFT_X[colIdx];
          cy = QUESTIONS_LEFT_Y_START + i * QUESTIONS_LEFT_Y_STEP;
        } else {
          cx = QUESTIONS_RIGHT_X[colIdx];
          cy = QUESTIONS_RIGHT_Y_START + (i - 13) * QUESTIONS_RIGHT_Y_STEP;
        }
        
        ctx.beginPath();
        ctx.arc(cx, cy, BUBBLE_RADIUS - 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw student ID digits
      const digits = sheet.id.split('');
      for (let col = 0; col < Math.min(digits.length, 3); col++) {
        const digit = parseInt(digits[col], 10);
        if (isNaN(digit)) continue;
        
        const cx = STUDENT_ID_X[col];
        const cy = STUDENT_ID_Y_START + digit * STUDENT_ID_Y_STEP;
        
        ctx.beginPath();
        ctx.arc(cx, cy, BUBBLE_RADIUS - 2, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Parse with the real OMR Scanner!
      const parsed = parseOMRSheet(canvas);

      let studentAnswers = [...parsed.answers];
      if (studentAnswers.length < numQuestions) {
        studentAnswers = [...studentAnswers, ...Array(numQuestions - studentAnswers.length).fill("A")];
      } else if (studentAnswers.length > numQuestions) {
        studentAnswers = studentAnswers.slice(0, numQuestions);
      }

      const { correctCount: correct } = scoreAnswers(studentAnswers, testKeys);

      // Crop the signature area or generate text-drawn signature
      const sigCanvas = document.createElement('canvas');
      sigCanvas.width = 597;
      sigCanvas.height = 39;
      const sigCtx = sigCanvas.getContext('2d')!;

      // Render simulated signature
      sigCtx.fillStyle = '#ffffff';
      sigCtx.fillRect(0, 0, 597, 39);
      sigCtx.font = '24px Caveat, cursive';
      sigCtx.fillStyle = '#1e3a8a';
      sigCtx.textAlign = 'center';
      sigCtx.textBaseline = 'middle';
      sigCtx.fillText(sheet.name || 'Simulated Signature', 298, 19);

      // If the template image is loaded and it's a specific student, crop signature from a signature region if possible
      if (sheet.id === '557') {
        const sigImg = new Image();
        sigImg.src = '/omr_sheet_template.svg';
        sigImg.onload = () => {
          sigCtx.drawImage(sigImg, 77, 35, 597, 39, 0, 0, 597, 39);
          setScannedOMRSheet((prev: any) => prev ? { ...prev, signatureImg: sigCanvas.toDataURL('image/jpeg', 0.85) } : prev);
        };
      }

      const omrData = {
        studentIdCode: parsed.studentIdCode,
        answers: studentAnswers,
        correctCount: correct,
        totalQuestions: numQuestions,
        percentage: Math.round((correct / numQuestions) * 100),
        signatureImg: sigCanvas.toDataURL('image/jpeg', 0.85)
      };

      setScannedOMRSheet(omrData);

      // Auto-map student in class list
      const matchingStudent = students.find(s => {
        const matchNum = s.id.match(/^(BR|AL)(\d{3})$/);
        return matchNum && matchNum[2] === parsed.studentIdCode;
      });

      if (matchingStudent) {
        setSelectedStudentForScan(matchingStudent.id);
        
        // Trigger simulated flash
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 150);

        // Auto-save instantly!
        setScanStatus('saving');
        
        // Play beep
        playSuccessBeep();

        // Update persistent last scanned student info state
        setLastScannedStudent({
          name: matchingStudent.name,
          surname: matchingStudent.surname,
          studentId: matchingStudent.id,
          studentIdCode: parsed.studentIdCode,
          correctCount: omrData.correctCount,
          totalQuestions: omrData.totalQuestions,
          percentage: omrData.percentage,
          saved: true
        });

        // Save to database asynchronously
        saveOMRDataCore(matchingStudent.id, omrData).then(() => {
          setTimeout(() => {
            setScanStatus('aligning');
            setScanProgress(0);
          }, 1500);
        });

      } else {
        setSelectedStudentForScan('');
        setScanStatus('success');
      }
    };
  };

  // Core background save logic
  const saveOMRDataCore = async (studentId: string, omrData: any, closeScanner: boolean = false) => {
    if (!selectedTest || !omrData) return;

    const matchedStudent = students.find(s => s.id === studentId);
    if (!matchedStudent) return;

    setSyncingScore(true);
    try {
      // Call onUpdateStudentScore to sync with Supabase
      if (onUpdateStudentScore) {
        const weekName = selectedWeekForSaving || selectedWeek || '1-Hafta';
        await onUpdateStudentScore(
          matchedStudent.id,
          selectedTest.subject,
          omrData.percentage,
          weekName
        );
      }

      const newScan = {
        id: Date.now().toString(),
        studentId: studentId,
        studentName: `${matchedStudent.name} ${matchedStudent.surname}`,
        studentIdCode: omrData.studentIdCode,
        scannedAt: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
        answers: omrData.answers,
        correctCount: omrData.correctCount,
        totalQuestions: omrData.totalQuestions,
        percentage: omrData.percentage,
        week: selectedWeekForSaving || selectedWeek || '1-Hafta'
      };

      // Prevent duplicates for the same student in this session scans
      const updatedScans = [newScan, ...currentTestScans.filter(s => s.studentId !== studentId)];
      setCurrentTestScans(updatedScans);
      localStorage.setItem(`testor_scans_${selectedTest.id}`, JSON.stringify(updatedScans));

      // Mirror raw answers to the testor DB so key edits can re-score later
      upsertScansToDb(selectedTest.id, [newScan]);

      // Update database & local test student count
      handleIncrementStudentCount(selectedTest.id, updatedScans.length);

      // Only close scanner if explicitly requested (e.g. manual mode)
      if (closeScanner) {
        setShowScanModal(false);
        setScannedOMRSheet(null);
        setSelectedStudentForScan('');
      }
    } catch (err) {
      console.error("Failed to save OMR scan score:", err);
    } finally {
      setSyncingScore(false);
    }
  };

  // Manual save from review screen
  const handleSaveScannedSheet = async () => {
    await saveOMRDataCore(selectedStudentForScan, scannedOMRSheet, true);
  };

  // Success Beep
  const playSuccessBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Ignore audio errors
    }
  };

  // Remove a scanned sheet
  const handleDeleteScannedSheet = (scanId: string) => {
    if (!selectedTest) return;
    const removed = currentTestScans.find(s => s.id === scanId);
    const filtered = currentTestScans.filter(s => s.id !== scanId);
    setCurrentTestScans(filtered);
    localStorage.setItem(`testor_scans_${selectedTest.id}`, JSON.stringify(filtered));
    handleIncrementStudentCount(selectedTest.id, filtered.length);
    if (removed?.studentId) deleteScanFromDb(selectedTest.id, removed.studentId);
  };

  // Reassign a saved scan to a different student: the wrong student's score is
  // cleared, the right student's score is written, and the buffer is updated.
  const [reassignTargetId, setReassignTargetId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  interface ScanRecord {
    id: string;
    studentId: string;
    studentName: string;
    percentage: number;
    week?: string;
    [key: string]: unknown;
  }

  const handleReassignScan = async (scan: ScanRecord, newStudentId: string) => {
    if (!selectedTest || !newStudentId || newStudentId === scan.studentId) return;
    const newStudent = students.find(s => s.id === newStudentId);
    if (!newStudent) return;

    setIsReassigning(true);
    try {
      const week = scan.week || selectedWeekForSaving || selectedWeek || '1-Hafta';
      await onClearStudentScore?.(scan.studentId, selectedTest.subject, week);
      await onUpdateStudentScore?.(newStudentId, selectedTest.subject, scan.percentage, week);

      const updatedScan = {
        ...scan,
        studentId: newStudentId,
        studentName: `${newStudent.name} ${newStudent.surname}`
      };
      // Keep the dedupe-by-student rule: drop any existing scan of the new student
      const remaining = currentTestScans.filter(s => s.id !== scan.id && s.studentId !== newStudentId);
      const updatedScans = [updatedScan, ...remaining];
      setCurrentTestScans(updatedScans);
      localStorage.setItem(`testor_scans_${selectedTest.id}`, JSON.stringify(updatedScans));
      handleIncrementStudentCount(selectedTest.id, updatedScans.length);
      deleteScanFromDb(selectedTest.id, scan.studentId);
      upsertScansToDb(selectedTest.id, [updatedScan as unknown as TestorScan]);
      setSelectedScanDetail(updatedScan);
      setReassignTargetId('');
    } catch (err) {
      console.error('Failed to reassign scan:', err);
      alert("Natijani boshqa o'quvchiga o'tkazishda xatolik yuz berdi.");
    } finally {
      setIsReassigning(false);
    }
  };

  // Analysis Tab States
  const [activeClass, setActiveClass] = useState<string>('5-Sinf');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Settings Tab States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [generatingSheet, setGeneratingSheet] = useState<number | null>(null);

  const handleDownloadSheet = async (count: number) => {
    setGeneratingSheet(count);
    try {
      await downloadAnswerSheetPNG(count);
    } catch (err) {
      console.error('Sheet generation failed:', err);
      alert('Varaqani yaratishda xatolik yuz berdi.');
    } finally {
      setGeneratingSheet(null);
    }
  };

  // Update theme settings
  const handleSelectAccent = (color: 'indigo' | 'teal' | 'emerald' | 'rose') => {
    setAccentColor(color);
    localStorage.setItem('testor_theme_accent', color);
  };

  // ANALYSIS DATA COMPUTATIONS
  const activeStudents = useMemo(() => {
    return students.filter(s => !s.isDeleted);
  }, [students]);

  const availableClasses = useMemo(() => {
    const groups = new Set([
      '5-Sinf', '6-Sinf', '7-Sinf', '8-Sinf', '9-Sinf', '10-Sinf', '11-Sinf',
      ...activeStudents.map(s => getClassGroup(s.className.toUpperCase()))
    ]);
    return Array.from(groups).sort((a, b) => {
      const intA = parseInt(a);
      const intB = parseInt(b);
      if (!isNaN(intA) && !isNaN(intB)) return intA - intB;
      return a.localeCompare(b);
    });
  }, [activeStudents]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach(cls => counts[cls] = 0);
    activeStudents.forEach(s => {
      const group = getClassGroup(s.className.toUpperCase());
      if (counts[group] !== undefined) {
        counts[group]++;
      }
    });
    return counts;
  }, [activeStudents, availableClasses]);

  // Custom-subject (non Eng/Math) averages for the Tahlil strip:
  // per-subject avg % and student count for the selected week + active class
  const customSubjectStats = useMemo(() => {
    if (!subjectScores || subjectScores.length === 0 || !selectedWeek) return [];
    const classStudentIds = new Set(
      activeStudents
        .filter(s => getClassGroup(s.className.toUpperCase()) === activeClass)
        .map(s => s.id?.toString())
    );
    const map: Record<string, { sum: number; count: number }> = {};
    subjectScores.forEach(ss => {
      if (ss.week !== selectedWeek) return;
      if (!classStudentIds.has(ss.student_id?.toString())) return;
      if (typeof ss.score !== 'number') return;
      if (!map[ss.subject]) map[ss.subject] = { sum: 0, count: 0 };
      // Average reflects the displayed (rules-penalized) score
      const violations = violationsForWeek(studentWeeks, ss.student_id, ss.week);
      map[ss.subject].sum += applyRulesPenaltyPercent(ss.score, violations) ?? ss.score;
      map[ss.subject].count++;
    });
    return Object.entries(map)
      .map(([subject, v]) => ({ subject, avg: Math.round(v.sum / v.count), count: v.count }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [subjectScores, activeStudents, activeClass, selectedWeek, studentWeeks]);

  // Set default class selector
  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.includes(activeClass)) {
      setActiveClass(availableClasses[0]);
    }
  }, [availableClasses, activeClass]);

  // Set default week selector
  useEffect(() => {
    if (weeksList.length > 0 && !selectedWeek) {
      setSelectedWeek(weeksList[weeksList.length - 1]);
    }
  }, [weeksList, selectedWeek]);

  const projectedStudents = useMemo(() => {
    return activeStudents.map(student => {
      let startingLevel = student.startingLevel;
      let currentLevel = student.currentLevel;
      let grandTests = student.grandTests;
      let mathStartingLevel = student.mathStartingLevel;
      let mathCurrentLevel = student.mathCurrentLevel;
      let mathGrandTests = student.mathGrandTests;
      let engScore = student.engScore;
      let mathScore = student.mathScore;
      let attendance = student.attendance;
      let homework = student.homework;

      if (selectedWeek) {
        const hist = studentWeeks.find(sw => sw.student_id?.toString() === student.id?.toString() && sw.week === selectedWeek);
        if (hist) {
          startingLevel = hist.starting_level ?? student.startingLevel;
          currentLevel = hist.current_level ?? student.currentLevel;
          grandTests = hist.grand_tests ?? student.grandTests;
          mathStartingLevel = hist.math_starting_level ?? student.mathStartingLevel;
          mathCurrentLevel = hist.math_current_level ?? student.mathCurrentLevel;
          mathGrandTests = hist.math_grand_tests ?? student.mathGrandTests;
          engScore = hist.eng_score ?? student.engScore;
          mathScore = hist.math_score ?? student.mathScore;
          attendance = hist.attendance ?? student.attendance;
          homework = hist.homework ?? student.homework;
        } else {
          startingLevel = student.startingLevel;
          currentLevel = student.currentLevel || student.startingLevel;
          grandTests = student.grandTests || [];
          mathStartingLevel = student.mathStartingLevel || 'Level 1';
          mathCurrentLevel = student.mathCurrentLevel || 'Level 1';
          mathGrandTests = student.mathGrandTests || [];
          engScore = student.engScore ?? 0;
          mathScore = student.mathScore ?? 0;
          attendance = student.attendance ?? 1;
          homework = student.homework ?? 1;
        }
      } else {
        startingLevel = student.startingLevel;
        currentLevel = student.currentLevel || student.startingLevel;
        grandTests = student.grandTests || [];
        mathStartingLevel = student.mathStartingLevel || 'Level 1';
        mathCurrentLevel = student.mathCurrentLevel || 'Level 1';
        mathGrandTests = student.mathGrandTests || [];
        engScore = student.engScore ?? 0;
        mathScore = student.mathScore ?? 0;
        attendance = student.attendance ?? 1;
        homework = student.homework ?? 1;
      }

      return {
        ...student,
        engScore,
        mathScore,
        attendance,
        homework,
        englishTeacher: student.teacher,
        englishStartingLevel: startingLevel,
        englishCurrentLevel: currentLevel,
        englishGrandTests: grandTests,
        mathStartingLevel,
        mathCurrentLevel,
        mathGrandTests
      };
    });
  }, [activeStudents, selectedWeek, studentWeeks]);

  const filteredStudents = useMemo(() => {
    return projectedStudents.filter(s => {
      const group = getClassGroup(s.className.toUpperCase());
      const matchesClass = group === activeClass;
      const matchesSearch = `${s.name} ${s.surname}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [projectedStudents, activeClass, searchTerm]);

  // Dynamic tests search filter list
  const filteredTests = useMemo(() => {
    return dbTests.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(testsSearch.toLowerCase()) || 
                            t.subject.toLowerCase().includes(testsSearch.toLowerCase());
      const matchesClass = testsClassFilter === 'ALL' || getClassGroup(t.level) === getClassGroup(testsClassFilter);
      return matchesSearch && matchesClass;
    });
  }, [dbTests, testsSearch, testsClassFilter]);

  // DYNAMIC OPTIONS SCREEN (Teacher, Form, Date, Papers, Number Of Questions)
  const renderTestOptionsView = (test: any) => {
    const formattedDate = test.created_at ? new Date(test.created_at).toLocaleDateString() : '';
    const numQuestions = test.questions_json ? test.questions_json.length : 15;
    
    return (
      <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {/* Back Link Row + test actions */}
        <div style={{ alignSelf: 'stretch', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setSelectedTest(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 850,
              cursor: 'pointer',
              padding: 0
            }}
          >
            <ArrowLeft size={16} />
            <span>Ortga qaytish</span>
          </button>

          <button
            onClick={() => {
              setMoveTargetWeek(test.week && test.week !== UNASSIGNED_WEEK ? test.week : '');
              setShowTestActionsModal(true);
            }}
            title="Testni boshqarish: papkasini o'zgartirish yoki o'chirish"
            style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '9999px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              padding: '0.4rem 0.85rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
          >
            <Pencil size={13} />
            <span>Tahrirlash</span>
          </button>
        </div>

        {/* Sketch phone mockup or screen container */}
        <div style={{
          background: '#ffffff',
          border: `1.5px solid #cbd5e1`,
          borderRadius: '24px',
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
          color: '#0f172a',
          boxSizing: 'border-box'
        }}>
          {/* Properties summary (teacher/class rows only for legacy tests that have them) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontSize: '0.92rem', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Fan:</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{test.subject}</span>
            </div>
            <div style={{ fontSize: '0.92rem', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Hafta:</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{test.week && test.week !== UNASSIGNED_WEEK ? test.week : 'Haftasiz'}</span>
            </div>
            {test.teacher_name && (
              <div style={{ fontSize: '0.92rem', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>O'qituvchi:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{test.teacher_name}</span>
              </div>
            )}
            {test.level && (
              <div style={{ fontSize: '0.92rem', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Sinf:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{test.level}</span>
              </div>
            )}
            <div style={{ fontSize: '0.92rem', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Sana:</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{formattedDate}</span>
            </div>
            <div style={{ fontSize: '0.92rem', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Skanerlangan varaqlar:</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{getScannedCount(test.id)} ta varaq</span>
            </div>
            <div style={{ fontSize: '0.92rem', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Savollar soni:</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{numQuestions} ta</span>
            </div>
          </div>

          {/* Action Buttons styled like the sketch outlines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => setShowEditKeyModal(true)}
              style={{
                background: 'transparent',
                border: `2.5px solid ${colors.primary}`,
                color: colors.primary,
                borderRadius: '14px',
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                textAlign: 'center',
                letterSpacing: '0.02em',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${colors.primary}10`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Javoblarni tahrirlash
            </button>

            {SUPPORTED_SCAN_COUNTS.includes(numQuestions) ? (
              <button
                onClick={() => setShowScanModal(true)}
                style={{
                  background: colors.primary,
                  border: `2.5px solid ${colors.primary}`,
                  color: '#ffffff',
                  borderRadius: '14px',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'center',
                  letterSpacing: '0.02em',
                  boxShadow: `0 4px 12px ${colors.primary}20`,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${colors.primary}dd`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = colors.primary;
                }}
              >
                Varaqni skanerlash
              </button>
            ) : (
              <div>
                <button
                  disabled
                  title={`${numQuestions} savollik varaqlar uchun skaner tez orada qo'shiladi`}
                  style={{
                    width: '100%',
                    background: '#e2e8f0',
                    border: '2.5px solid #e2e8f0',
                    color: '#94a3b8',
                    borderRadius: '14px',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: 'not-allowed',
                    textAlign: 'center',
                    letterSpacing: '0.02em'
                  }}
                >
                  Varaqni skanerlash
                </button>
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textAlign: 'center', marginTop: '0.4rem' }}>
                  {numQuestions} savollik varaqlar uchun skaner tez orada qo'shiladi
                </div>
              </div>
            )}

            <button
              onClick={() => setShowReviewModal(true)}
              style={{
                background: 'transparent',
                border: `2.5px solid ${colors.primary}`,
                color: colors.primary,
                borderRadius: '14px',
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                textAlign: 'center',
                letterSpacing: '0.02em',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${colors.primary}10`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Natijalarni ko'rish
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 1. RENDER TESTS VIEW TAB
  const renderTestsView = () => {
    if (selectedTest) {
      return renderTestOptionsView(selectedTest);
    }

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Haftalik Testlar (Live DB)
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            Maktab testor nazorati tizimidagi barcha testlar va javoblar ro'yxati.
          </p>
        </div>

        {/* Filters bar */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '18px',
          padding: '1rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-with-icon"
              placeholder="Test nomi yoki fanni kiriting..."
              value={testsSearch}
              onChange={(e) => setTestsSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#f8fafc'
              }}
            />
          </div>
          <button
            onClick={openAddTestModal}
            style={{
              background: colors.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background 0.2s',
              boxShadow: `0 4px 12px ${colors.primary}20`
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${colors.primary}dd`}
            onMouseLeave={e => e.currentTarget.style.background = colors.primary}
          >
            <span>+ Yangi test</span>
          </button>
        </div>

        {/* Tests grid list */}
        {dbLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: colors.primary, gap: '0.5rem' }}>
            <RefreshCw size={20} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
            <span style={{ fontWeight: 800 }}>Ma'lumotlar yuklanmoqda...</span>
          </div>
        ) : dbTests.length === 0 ? (
          <div style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '24px',
            color: '#475569',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: colors.bg,
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 850, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
                Hozircha testlar mavjud emas
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, maxWidth: '320px', lineHeight: 1.4 }}>
                Ma'lumotlar bazasida hech qanday test topilmadi. OMR varaqlarini skanerlashdan oldin yangi test yarating.
              </p>
            </div>
            <button
              onClick={openAddTestModal}
              style={{
                background: colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.7rem 1.5rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background 0.2s',
                boxShadow: `0 4px 12px ${colors.primary}20`
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${colors.primary}dd`}
              onMouseLeave={e => e.currentTarget.style.background = colors.primary}
            >
              <span>+ Yangi test yaratish</span>
            </button>
          </div>
        ) : filteredTests.length === 0 ? (
          <div style={{
            padding: '3.5rem',
            textAlign: 'center',
            background: '#ffffff',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '18px',
            color: '#64748b'
          }}>
            Filter bo'yicha hech qanday test topilmadi. Qidiruv so'zini yoki sinfni o'zgartirib ko'ring.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredTests.map(test => (
              <div
                key={test.id}
                onClick={() => setSelectedTest(test)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0,0,0,0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.01)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    background: test.subject.toLowerCase().includes('matem') ? '#f0fdfa' : '#f5f3ff',
                    color: test.subject.toLowerCase().includes('matem') ? '#0f766e' : '#5b21b6',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px'
                  }}>{test.subject.toUpperCase()}</span>
                  
                  <span style={{
                    background: colors.bg,
                    color: colors.text,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px'
                  }}>{test.level || (test.week && test.week !== UNASSIGNED_WEEK ? test.week : 'Haftasiz')}</span>
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    {test.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem' }}>
                    <Calendar size={12} />
                    <span>{new Date(test.created_at).toLocaleDateString()}</span>
                    {test.teacher_name && (
                      <>
                        <span>·</span>
                        <Award size={12} />
                        <span>{test.teacher_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9', width: '100%' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FileText size={12} />
                    <span>{getScannedCount(test.id)} ta topshirildi</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <BookOpen size={12} />
                    <span>{test.questions_json ? test.questions_json.length : 15} ta kalit</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 2. RENDER PAPKALAR (FOLDERS) VIEW TAB
  const renderFoldersView = () => {
    if (selectedTest) {
      return renderTestOptionsView(selectedTest);
    }

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Haftalik Papkalar
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            Testlar hafta va fan bo'yicha guruhlangan.
          </p>
        </div>

        {/* Browser Card */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '24px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          minHeight: '340px'
        }}>
          {dbLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: colors.primary, gap: '0.5rem' }}>
              <RefreshCw size={20} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
              <span style={{ fontWeight: 800 }}>Mundarija yangilanmoqda...</span>
            </div>
          ) : dbTests.length === 0 ? (
            <div style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              color: '#475569',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <FolderOpen size={48} color="#cbd5e1" style={{ strokeWidth: 1.5 }} />
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  Papka mundarijasi bo'sh
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, maxWidth: '280px', lineHeight: 1.4 }}>
                  Tizimda testlar yo'qligi sababli papkalar yaratilmadi. Dastlab "Testlar" bo'limida yangi test qo'shing.
                </p>
              </div>
            </div>
          ) : (
            /* Tree View Hierarchy: Week → Subject → Teacher → Tests */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {testWeeks.map((week, wIdx) => {
                const isWeekExpanded = !!expandedWeeks[week];
                const weekSubjects = getSubjectsForWeek(week);
                const weekLabel = week === UNASSIGNED_WEEK ? 'Haftaga biriktirilmagan' : week;

                return (
                  <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Week Folder Row */}
                    <div
                      onClick={() => toggleWeek(week)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.8rem 1rem',
                        borderRadius: '14px',
                        border: isWeekExpanded ? `1.5px solid ${colors.primary}` : '1.5px solid #e2e8f0',
                        background: isWeekExpanded ? colors.bg : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                      }}
                      onMouseEnter={e => {
                        if (!isWeekExpanded) {
                          e.currentTarget.style.borderColor = colors.border;
                          e.currentTarget.style.background = colors.bg;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isWeekExpanded) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                        <div style={{
                          color: colors.primary,
                          transform: isWeekExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}>
                          <ChevronRight size={16} style={{ strokeWidth: 2.5 }} />
                        </div>
                        <Calendar size={18} color={colors.primary} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 850, color: isWeekExpanded ? colors.text : '#0f172a', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {weekLabel}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '0.5rem' }}>
                        {weekSubjects.length} ta fan
                      </span>
                    </div>

                    {/* Week Children (Subjects) */}
                    {isWeekExpanded && (
                      <div style={{
                        borderLeft: '2px solid #cbd5e1',
                        marginLeft: isMobile ? '0.6rem' : '1.25rem',
                        paddingLeft: isMobile ? '0.85rem' : '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        position: 'relative',
                        paddingTop: '0.25rem',
                        paddingBottom: '0.25rem'
                      }}>
              {weekSubjects.map((subj, sIdx) => {
                const isSubjExpanded = !!expandedSubjects[`${week}__${subj}`];
                const subjectTests = getTestsForSubject(week, subj);

                return (
                  <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                    {/* Horizontal connector branch line to this subject folder */}
                    <div style={{
                      position: 'absolute',
                      left: isMobile ? '-0.85rem' : '-1.5rem',
                      top: '1.25rem',
                      width: isMobile ? '0.6rem' : '1.25rem',
                      height: '2px',
                      background: '#cbd5e1'
                    }} />

                    {/* Subject Folder Row */}
                    <div
                      onClick={() => toggleSubject(week, subj)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: isSubjExpanded ? `1.5px solid ${colors.primary}` : '1.5px solid #e2e8f0',
                        background: isSubjExpanded ? colors.bg : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                      }}
                      onMouseEnter={e => {
                        if (!isSubjExpanded) {
                          e.currentTarget.style.borderColor = colors.border;
                          e.currentTarget.style.background = colors.bg;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSubjExpanded) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = '#ffffff';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          color: colors.primary,
                          transform: isSubjExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <ChevronRight size={16} style={{ strokeWidth: 2.5 }} />
                        </div>
                        <FolderOpen size={18} color={colors.primary} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isSubjExpanded ? colors.text : '#1e293b', letterSpacing: '0.01em' }}>
                          {subj.toLowerCase()}
                        </span>
                      </div>
                      
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '0.5rem' }}>
                        {subjectTests.length} ta test
                      </span>
                    </div>

                    {/* Subject Children (Tests list) */}
                    {isSubjExpanded && (
                      <div style={{
                        borderLeft: '2px solid #cbd5e1',
                        marginLeft: isMobile ? '0.6rem' : '1.25rem',
                        paddingLeft: isMobile ? '0.85rem' : '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        position: 'relative',
                        paddingTop: '0.25rem',
                        paddingBottom: '0.25rem'
                      }}>
                        {subjectTests.length === 0 ? (
                          <div style={{ position: 'relative' }}>
                            {/* Horizontal line for empty state */}
                            <div style={{
                              position: 'absolute',
                              left: isMobile ? '-0.85rem' : '-1.5rem',
                              top: '50%',
                              width: isMobile ? '0.6rem' : '1.25rem',
                              height: '2px',
                              background: '#cbd5e1'
                            }} />
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                              Testlar mavjud emas
                            </div>
                          </div>
                        ) : (
                          subjectTests.map((test) => (
                            <div key={test.id} style={{ position: 'relative' }}>
                              {/* Horizontal connector branch line to this test */}
                              <div style={{
                                position: 'absolute',
                                left: isMobile ? '-0.85rem' : '-1.5rem',
                                top: '1.1rem',
                                width: isMobile ? '0.6rem' : '1.25rem',
                                height: '2px',
                                background: '#cbd5e1'
                              }} />

                              {/* Test File Row */}
                              <div
                                onClick={() => setSelectedTest(test)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem',
                                  padding: '0.6rem 0.85rem',
                                  borderRadius: '10px',
                                  border: '1.5px solid #e2e8f0',
                                  background: '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = colors.border;
                                  e.currentTarget.style.background = colors.bg;
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                  e.currentTarget.style.background = '#ffffff';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                  <FileText size={16} color="#94a3b8" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {test.name}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {[test.teacher_name, test.level, `${test.questions_json.length} ta kalit`, `${getScannedCount(test.id)} topshirildi`].filter(Boolean).join(' · ')}
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight size={12} color="#cbd5e1" style={{ flexShrink: 0 }} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 3. RENDER ANALYSIS VIEW TAB
  const renderAnalysisView = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Haftalik Natijalar Tahlili
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            O'quvchilarning umumiy foizlari, davomati va uy vazifalari topshiriqlari.
          </p>
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : undefined }}>
          <div className="class-selector" style={{
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            flex: '1 1 auto',
            maxWidth: '450px',
            padding: '0.25rem 0.1rem',
            boxSizing: 'border-box',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            {availableClasses.map(cls => {
              const isActive = activeClass === cls;
              return (
                <button
                  key={cls}
                  onClick={() => setActiveClass(cls)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: isActive ? colors.primary : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? `1.5px solid ${colors.primary}` : '1.5px solid #e2e8f0',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontWeight: isActive ? 800 : 650,
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: isActive ? `0 4px 12px ${colors.primary}30` : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cls}
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '9999px'
                  }}>
                    {classCounts[cls] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <select
            value={selectedWeek}
            onChange={(e) => {
              if (e.target.value === '__more__') { setShowAllWeeks(true); return; }
              setSelectedWeek(e.target.value);
            }}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              border: '1.5px solid #e2e8f0',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#334155',
              background: '#ffffff',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {weeksList.length === 0 ? (
              <option value="">Haftalar yo'q</option>
            ) : (
              weekOptionsFor(selectedWeek).map(wk => (
                <option key={wk} value={wk}>{wk}</option>
              ))
            )}
            {!showAllWeeks && weeksList.length > 4 && (
              <option value="__more__">Eski haftalar…</option>
            )}
          </select>
        </div>
      </div>

      {/* Search Filter row */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '18px',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-with-icon"
            placeholder="O'quvchining ismi yoki familiyasi bo'yicha qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.25rem',
              borderRadius: '10px',
              border: '1.5px solid #e2e8f0',
              fontSize: '0.8rem',
              fontWeight: 600,
              outline: 'none',
              background: '#f8fafc'
            }}
          />
        </div>
      </div>

      {/* Custom-subject results strip (hidden when there are none for this week/class) */}
      {customSubjectStats.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto',
          marginBottom: '1rem',
          paddingBottom: '0.25rem',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }}>
          {customSubjectStats.map(stat => (
            <div
              key={stat.subject}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '0.85rem 1.1rem',
                minWidth: '150px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BookOpen size={14} color={colors.primary} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stat.subject}
                </span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 850, color: colors.primary }}>
                {stat.avg}%
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>
                {stat.count} ta o'quvchi · {selectedWeek}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render view-only StudentTable */}
      <div className="tab-admin-settings-hide">
        <StudentTable
          students={filteredStudents}
          isAdminMode={false}
          activeSubject="ALL"
          studentWeeks={studentWeeks}
          teachers={teachers}
          authRole="testor"
        />
      </div>
    </div>
  );

  // 4. RENDER SETTINGS VIEW TAB
  const renderSettingsView = () => (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Kabinet Sozlamalari
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
          Shaxsiy hisob sozlamalari, interfeys ranglari va tizimdan chiqish.
        </p>
      </div>

      {/* Profile summary card */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: colors.primary,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: '1.25rem'
        }}>
          TS
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.15rem 0' }}>
            Testor Foydalanuvchisi
          </h3>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, background: colors.bg, color: colors.text, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
            TEST VA FOLDERS NAZORATCHISI
          </span>
        </div>
      </div>

      {/* Theme customization */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 850, color: '#334155', margin: '0 0 0.25rem 0' }}>
            Kabinet mavzusi ranglari
          </h4>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
            Ilova interfeysi urg'u rangini tanlang.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['indigo', 'teal', 'emerald', 'rose'] as const).map(color => {
            const isSelected = accentColor === color;
            const itemColor = {
              indigo: '#4f46e5',
              teal: '#0d9488',
              emerald: '#10b981',
              rose: '#f43f5e'
            }[color];

            return (
              <button
                key={color}
                onClick={() => handleSelectAccent(color)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.25rem',
                  borderRadius: '9999px',
                  border: isSelected ? `2px solid ${itemColor}` : '1.5px solid #e2e8f0',
                  background: isSelected ? `${itemColor}10` : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  color: isSelected ? itemColor : '#475569',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: itemColor, flexShrink: 0 }} />
                {color.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Answer Sheets (generated PNG) Section */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 850, color: '#334155', margin: '0 0 0.25rem 0' }}>
            Javob varaqalari (PNG)
          </h4>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
            Har bir savollar soni uchun chop etishga tayyor javob varaqasi. Varaqlar skaner koordinatalari bilan bir manbadan yaratiladi, shuning uchun 10, 15, 20 va 30 savollik testlarning barchasini skanerlash mumkin. A4 qog'ozga 100% masshtabda chop eting.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {SELECTABLE_QUESTION_COUNTS.map(count => {
            const busy = generatingSheet === count;
            return (
              <button
                key={count}
                onClick={() => handleDownloadSheet(count)}
                disabled={generatingSheet !== null}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  background: busy ? '#f8fafc' : '#ffffff',
                  color: '#475569',
                  cursor: generatingSheet !== null ? 'wait' : 'pointer',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (generatingSheet === null) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = busy ? '#f8fafc' : '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {busy
                  ? <RefreshCw size={16} style={{ animation: 'spin 1.2s linear infinite' }} />
                  : <Download size={16} />}
                {count}.png — {count} savol
              </button>
            );
          })}
        </div>
      </div>

      {/* About Section */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
          <Info size={16} />
          <h4 style={{ fontSize: '0.85rem', fontWeight: 850, margin: 0 }}>Tizim haqida</h4>
        </div>
        
        <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
          Ushbu Al-Xorazmiy o'quvchilar tahlili platformasida har bir fan bo'yicha choraklik testlar, haftalik natijalar ko'rsatkichi va ota-onalarga beriladigan shaffof hisobotlar jamlangan. Testor kabineti orqali topshiriqlarni yuklash va sinflar tahlilini tezda ko'rish mumkin.
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
          <span>Versiya: 2.2.0 (Testor build)</span>
          <span>© Al-Xorazmiy School</span>
        </div>
      </div>

      {/* Logout button */}
      <button
        style={{
          background: '#fef2f2',
          border: '1.5px solid #fee2e2',
          color: '#ef4444',
          borderRadius: '16px',
          padding: '0.9rem',
          fontSize: '0.82rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s',
          marginTop: '1rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#fee2e2';
          e.currentTarget.style.borderColor = '#ef4444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#fef2f2';
          e.currentTarget.style.borderColor = '#fee2e2';
        }}
        onClick={() => setShowLogoutConfirm(true)}
      >
        <LogOut size={16} />
        TIZIMDAN CHIQISH
      </button>

    </div>
  );

  // GLOBAL SYSTEM LOGOUT CONFIRMATION MODAL
  const renderLogoutModal = () => {
    if (!showLogoutConfirm) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000, // Higher than any inner modal
        padding: '1rem'
      }} onClick={() => setShowLogoutConfirm(false)}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          width: '100%',
          maxWidth: '380px',
          padding: '1.75rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          textAlign: 'center'
        }} onClick={e => e.stopPropagation()}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <ShieldAlert size={22} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              Tizimdan chiqish
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Haqiqatan ham testor kabinetidan chiqmoqchimisiz? Kirish uchun parolni qayta kiritishingiz kerak bo'ladi.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              style={{
                flex: 1,
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '12px',
                padding: '0.7rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Bekor qilish
            </button>
            <button
              onClick={() => {
                setShowLogoutConfirm(false);
                onLogout(true);
              }}
              style={{
                flex: 1,
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.7rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  };

  // MODAL A: EDIT ANSWER KEYS MODAL
  const renderEditKeyModal = () => {
    if (!selectedTest || !showEditKeyModal) return null;
    const testKeys = selectedTest.questions_json || Array(15).fill("A");
    const numQuestions = testKeys.length;

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem'
      }} onClick={() => setShowEditKeyModal(false)}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxSizing: 'border-box'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.primary }}>
              <Key size={18} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: 0 }}>Javoblar Kaliti</h3>
            </div>
            <button 
              onClick={() => setShowEditKeyModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
            Bir savolda bir nechta to'g'ri javob bo'lishi mumkin — kerakli harflarni yoqib/o'chirib belgilang.
            Kalit saqlanganda barcha skanerlangan natijalar avtomatik qayta hisoblanadi.
          </p>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: numQuestions }).map((_, idx) => {
              const selectedLetters = normalizeKeyEntry(testKeys[idx]);
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '12px', gap: '1rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', minWidth: '40px' }}>
                    {idx + 1}-Savol:
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flex: 1, justifyContent: 'flex-end' }}>
                    {["A", "B", "C", "D"].map(option => {
                      const isActive = selectedLetters.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => {
                            let letters = normalizeKeyEntry(testKeys[idx]);
                            if (letters.includes(option)) {
                              // A question must keep at least one correct answer
                              if (letters.length === 1) return;
                              letters = letters.filter(l => l !== option);
                            } else {
                              letters = [...letters, option].sort();
                            }
                            const newKeys = [...testKeys];
                            newKeys[idx] = keyEntryToStorage(letters);
                            // Update local state temporarily
                            setSelectedTest({ ...selectedTest, questions_json: newKeys });
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: isActive ? `2px solid ${colors.primary}` : '1.5px solid #cbd5e1',
                            background: isActive ? colors.primary : '#ffffff',
                            color: isActive ? '#ffffff' : '#475569',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
            <button
              onClick={() => {
                // Restore test from state (cancel changes)
                const originalTest = dbTests.find(t => t.id === selectedTest.id);
                if (originalTest) {
                  setSelectedTest(originalTest);
                }
                setShowEditKeyModal(false);
              }}
              style={{
                flex: 1,
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Bekor qilish
            </button>
            <button
              onClick={() => {
                const storageKeys = testKeys.map((k: any) => keyEntryToStorage(normalizeKeyEntry(k)));
                handleSaveAnswerKey(selectedTest.id, storageKeys);
                setShowEditKeyModal(false);
              }}
              style={{
                flex: 1,
                background: colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Kalitni saqlash
            </button>
          </div>
        </div>
      </div>
    );
  };

  // MODAL: TEST ACTIONS (move between week folders / delete)
  const renderTestActionsModal = () => {
    if (!selectedTest || !showTestActionsModal) return null;
    const currentWeek = selectedTest.week && selectedTest.week !== UNASSIGNED_WEEK ? selectedTest.week : '';

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem'
      }} onClick={() => setShowTestActionsModal(false)}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '380px',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxSizing: 'border-box'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.primary }}>
              <Pencil size={18} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: 0 }}>Testni boshqarish</h3>
            </div>
            <button
              onClick={() => setShowTestActionsModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
            {selectedTest.name} <span style={{ color: '#94a3b8', fontWeight: 600 }}>({selectedTest.subject})</span>
          </div>

          {/* Move between week folders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Papkasi (hafta):</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={moveTargetWeek}
                onChange={(e) => setMoveTargetWeek(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#334155',
                  background: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Haftasiz</option>
                {weeksList.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <button
                onClick={() => handleMoveTestToWeek(selectedTest.id, moveTargetWeek)}
                disabled={moveTargetWeek === currentWeek}
                style={{
                  background: moveTargetWeek === currentWeek ? '#e2e8f0' : colors.primary,
                  color: moveTargetWeek === currentWeek ? '#94a3b8' : '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: moveTargetWeek === currentWeek ? 'not-allowed' : 'pointer'
                }}
              >
                Ko'chirish
              </button>
            </div>
          </div>

          {/* Delete */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <button
              onClick={() => {
                if (window.confirm(`"${selectedTest.name}" testini o'chirishni tasdiqlaysizmi? Skanerlangan natijalar ham o'chiriladi.`)) {
                  handleDeleteTest(selectedTest.id);
                }
              }}
              disabled={isDeletingTest}
              style={{
                width: '100%',
                background: '#fef2f2',
                border: '1.5px solid #fee2e2',
                color: '#ef4444',
                borderRadius: '12px',
                padding: '0.7rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: isDeletingTest ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem'
              }}
            >
              <Trash2 size={15} />
              {isDeletingTest ? "O'chirilmoqda..." : "Testni o'chirish"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Global toast shown while a key edit is pushing re-scored results
  const renderRescoreToast = () => {
    if (!rescoreProgress) return null;
    return (
      <div style={{
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#0f172a',
        color: '#ffffff',
        borderRadius: '9999px',
        padding: '0.6rem 1.25rem',
        fontSize: '0.8rem',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        zIndex: 1500,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35)'
      }}>
        <RefreshCw size={15} style={{ animation: 'spin 1.2s linear infinite' }} />
        Natijalar qayta hisoblanmoqda… {rescoreProgress.done}/{rescoreProgress.total}
      </div>
    );
  };

  // MODAL B: CAMERA OMR SCANNER MODAL (Including Validation Grading View)
  const renderScanModal = () => {
    if (!selectedTest || !showScanModal) return null;

    // Tests without a class binding (the default now) match the whole school;
    // legacy tests with a level keep their class-scoped candidate list.
    const classStudents = students.filter(s => {
      if (s.isDeleted) return false;
      if (!selectedTest.level) return true;
      return getClassGroup(s.className) === getClassGroup(selectedTest.level);
    });

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#000000',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Render Scanner Viewfinder View */}
        {scanStatus !== 'success' && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Real Video Frame (always mounted to guarantee Ref is bound correctly) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0, left: 0,
                display: cameraStream ? 'block' : 'none'
              }}
            />

            {/* Camera Flash overlay */}
            {showFlash && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: '#ffffff',
                opacity: 0.85,
                zIndex: 1000,
                pointerEvents: 'none',
                transition: 'opacity 0.1s ease-out'
              }} />
            )}

            {/* Dynamic Snapping Indicators overlay */}
            {detectedCorners.tl && (
              <div style={{
                position: 'absolute',
                left: `${detectedCorners.tl.x}px`,
                top: `${detectedCorners.tl.y}px`,
                width: '20px', height: '20px',
                borderRadius: '50%',
                background: colors.primary,
                border: '3px solid #ffffff',
                boxShadow: `0 0 12px ${colors.primary}`,
                transform: 'translate(-50%, -50%)',
                zIndex: 900,
                pointerEvents: 'none',
                transition: 'left 0.08s ease-out, top 0.08s ease-out'
              }} />
            )}
            {detectedCorners.tr && (
              <div style={{
                position: 'absolute',
                left: `${detectedCorners.tr.x}px`,
                top: `${detectedCorners.tr.y}px`,
                width: '20px', height: '20px',
                borderRadius: '50%',
                background: colors.primary,
                border: '3px solid #ffffff',
                boxShadow: `0 0 12px ${colors.primary}`,
                transform: 'translate(-50%, -50%)',
                zIndex: 900,
                pointerEvents: 'none',
                transition: 'left 0.08s ease-out, top 0.08s ease-out'
              }} />
            )}
            {detectedCorners.bl && (
              <div style={{
                position: 'absolute',
                left: `${detectedCorners.bl.x}px`,
                top: `${detectedCorners.bl.y}px`,
                width: '20px', height: '20px',
                borderRadius: '50%',
                background: colors.primary,
                border: '3px solid #ffffff',
                boxShadow: `0 0 12px ${colors.primary}`,
                transform: 'translate(-50%, -50%)',
                zIndex: 900,
                pointerEvents: 'none',
                transition: 'left 0.08s ease-out, top 0.08s ease-out'
              }} />
            )}
            {detectedCorners.br && (
              <div style={{
                position: 'absolute',
                left: `${detectedCorners.br.x}px`,
                top: `${detectedCorners.br.y}px`,
                width: '20px', height: '20px',
                borderRadius: '50%',
                background: colors.primary,
                border: '3px solid #ffffff',
                boxShadow: `0 0 12px ${colors.primary}`,
                transform: 'translate(-50%, -50%)',
                zIndex: 900,
                pointerEvents: 'none',
                transition: 'left 0.08s ease-out, top 0.08s ease-out'
              }} />
            )}

            {!cameraStream && (
              // Camera fallback simulation panel
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                padding: '2rem',
                gap: '1.5rem',
                background: '#0f172a',
                textAlign: 'center',
                zIndex: 5
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8'
                }}>
                  <RefreshCw size={32} style={{ animation: 'spin 4s linear infinite' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Kamera aniqlanmadi</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, maxWidth: '280px', lineHeight: 1.4 }}>
                    Kamera ruxsati berilmagan yoki qurilmada kamera topilmadi. Skanerlashni simulyatsiya qilish uchun quyidagi namuna varaqlaridan birini tanlang:
                  </p>
                </div>

                {/* Sample selection list */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  width: '100%',
                  maxWidth: '320px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '1rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  {SAMPLE_OMR_SHEETS.map(sheet => {
                    const isSelected = selectedSampleSheet?.id === sheet.id;
                    return (
                      <button
                        key={sheet.id}
                        onClick={() => {
                          setSelectedSampleSheet(sheet);
                          setScanStatus('aligning');
                          setScanProgress(0);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: isSelected ? `${colors.primary}20` : 'transparent',
                          border: isSelected ? `1.5px solid ${colors.primary}` : '1.5px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          padding: '0.65rem 1rem',
                          color: isSelected ? '#ffffff' : '#94a3b8',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>{sheet.name}</span>
                        <span style={{ fontSize: '0.7rem', color: isSelected ? colors.primary : '#64748b' }}>
                          ID: {sheet.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scanning Overlay Visual UI */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              zIndex: 10
            }}>
              {/* Header Top Bar — glass, clears the iOS status bar via safe-area inset */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                padding: 'calc(env(safe-area-inset-top, 0px) + 0.85rem) 1.25rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff'
              }}>
                <button
                  onClick={() => setShowScanModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '9999px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: '0.4rem 0.9rem'
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>Orqaga</span>
                </button>

                <span style={{ fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.9)' }}>SKANERLASH</span>

                {/* spacer to keep the title centered */}
                <div style={{ width: '86px' }} />
              </div>

              {/* Viewfinder Squares Overlay */}
              <div style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* 4 Viewfinder Corner Brackets */}
                <div 
                  ref={viewfinderRef}
                  style={{
                    position: 'relative',
                    width: '78vw',
                    maxWidth: '305px',
                    aspectRatio: '680 / 930', // Exact aspect ratio of physical corner markers spacing (680px horizontally to 930px vertically)
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                  {/* Top-Left Bracket */}
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '56px', height: '56px',
                    border: `2.5px solid ${detectedCorners.tl ? colors.primary : 'rgba(255, 255, 255, 0.4)'}`,
                    borderRadius: '14px',
                    background: detectedCorners.tl ? `${colors.primary}26` : 'transparent',
                    boxShadow: detectedCorners.tl ? `0 0 15px ${colors.primary}66` : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '6px', height: '6px',
                      borderRadius: '50%',
                      background: detectedCorners.tl ? colors.primary : 'rgba(255, 255, 255, 0.55)',
                    }} />
                  </div>
                  
                  {/* Top-Right Bracket */}
                  <div style={{
                    position: 'absolute',
                    top: 0, right: 0,
                    width: '56px', height: '56px',
                    border: `2.5px solid ${detectedCorners.tr ? colors.primary : 'rgba(255, 255, 255, 0.4)'}`,
                    borderRadius: '14px',
                    background: detectedCorners.tr ? `${colors.primary}26` : 'transparent',
                    boxShadow: detectedCorners.tr ? `0 0 15px ${colors.primary}66` : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '6px', height: '6px',
                      borderRadius: '50%',
                      background: detectedCorners.tr ? colors.primary : 'rgba(255, 255, 255, 0.55)',
                    }} />
                  </div>

                  {/* Bottom-Left Bracket */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0,
                    width: '56px', height: '56px',
                    border: `2.5px solid ${detectedCorners.bl ? colors.primary : 'rgba(255, 255, 255, 0.4)'}`,
                    borderRadius: '14px',
                    background: detectedCorners.bl ? `${colors.primary}26` : 'transparent',
                    boxShadow: detectedCorners.bl ? `0 0 15px ${colors.primary}66` : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '6px', height: '6px',
                      borderRadius: '50%',
                      background: detectedCorners.bl ? colors.primary : 'rgba(255, 255, 255, 0.55)',
                    }} />
                  </div>

                  {/* Bottom-Right Bracket */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0, right: 0,
                    width: '56px', height: '56px',
                    border: `2.5px solid ${detectedCorners.br ? colors.primary : 'rgba(255, 255, 255, 0.4)'}`,
                    borderRadius: '14px',
                    background: detectedCorners.br ? `${colors.primary}26` : 'transparent',
                    boxShadow: detectedCorners.br ? `0 0 15px ${colors.primary}66` : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '6px', height: '6px',
                      borderRadius: '50%',
                      background: detectedCorners.br ? colors.primary : 'rgba(255, 255, 255, 0.55)',
                    }} />
                  </div>

                  {/* Guide instruction card */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#ffffff',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '20px',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    lineHeight: 1.4,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35)',
                    width: '80%',
                    position: 'absolute',
                    top: '20px',
                    zIndex: 50
                  }}>
                    <div style={{ fontWeight: 900, marginBottom: '0.25rem' }}>{selectedTest.name} ({selectedTest.subject})</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.65)' }}>
                      {cameraStream ? "Varaqni kadrga tuting — avtomatik skanerlanadi" : `Simulyatsiya: ${selectedSampleSheet?.name}`}
                    </div>
                  </div>

                  {/* Persistent last scanned student info pop-up in the middle */}
                  {lastScannedStudent && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(12px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      padding: '1rem 1.25rem',
                      borderRadius: '20px',
                      textAlign: 'center',
                      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
                      width: '80%',
                      maxWidth: '240px',
                      zIndex: 120,
                      animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      position: 'absolute',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#4ade80',
                        marginBottom: '0.1rem'
                      }}>
                        <CheckCircle size={18} />
                      </div>
                      
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Muvaffaqiyatli saqlandi
                      </div>
                      
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.25, wordBreak: 'break-word', maxLines: 2 }}>
                        {lastScannedStudent.name} {lastScannedStudent.surname}
                      </div>

                      <div style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 600 }}>
                        Student ID: <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#ffffff' }}>{lastScannedStudent.studentId}</span>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.25rem',
                        marginTop: '0.2rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4ade80' }}>
                          {lastScannedStudent.correctCount}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                          / {lastScannedStudent.totalQuestions}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 800, marginLeft: '0.5rem' }}>
                          ({lastScannedStudent.percentage}%)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Glowing accent scanline */}
                  {(scanStatus === 'scanning' || scanStatus === 'aligning' || scanStatus === 'saving') && (
                    <div style={{
                      position: 'absolute',
                      left: '5%',
                      width: '90%',
                      height: '2.5px',
                      borderRadius: '9999px',
                      background: scanStatus === 'saving' ? 'transparent' : colors.primary,
                      boxShadow: scanStatus === 'saving' ? 'none' : `0 0 10px ${colors.primary}, 0 0 20px ${colors.primary}`,
                      opacity: 0.85,
                      zIndex: 20,
                      animation: scanStatus === 'saving' ? 'none' : 'scanLineMove 2s linear infinite'
                    }} />
                  )}
                  
                  <style>{`
                    @keyframes scanLineMove {
                      0% { top: 15%; }
                      50% { top: 85%; }
                      100% { top: 15%; }
                    }
                    @keyframes pulse {
                      0% { transform: scale(0.85); opacity: 0.5; }
                      50% { transform: scale(1.15); opacity: 1; }
                      100% { transform: scale(0.85); opacity: 0.5; }
                    }
                    @keyframes slideDown {
                      0% { transform: translateY(-20px); opacity: 0; }
                      100% { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes scaleIn {
                      0% { transform: scale(0.9); opacity: 0; }
                      100% { transform: scale(1); opacity: 1; }
                    }
                  `}</style>
                </div>
              </div>

              {/* Bottom control bar */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1.1rem 1.25rem calc(env(safe-area-inset-bottom, 0px) + 1.1rem)',
                textAlign: 'center',
                color: '#ffffff'
              }}>
                {scanStatus === 'aligning' && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)' }}>
                    Varaq qidirilmoqda…
                  </span>
                )}
                {scanStatus === 'scanning' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                      Skanerlanmoqda... {scanProgress}%
                    </span>
                    <div style={{ width: '80%', maxWidth: '240px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${scanProgress}%`, height: '100%', background: colors.primary, transition: 'width 0.15s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Validation Review Page view (when Scan succeeds) */}
        {scanStatus === 'success' && scannedOMRSheet && (
          <div style={{
            flex: 1,
            background: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '1.5rem',
            boxSizing: 'border-box'
          }}>
            <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Grading top card summary */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '24px',
                padding: '1.5rem',
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: '0.25rem'
                }}>
                  <CheckCircle size={28} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>OMR VARAG'I GRADOVKA QILINDI</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Javoblar varaqasidan o'qilgan natijalar</p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>{scannedOMRSheet.correctCount} / {scannedOMRSheet.totalQuestions}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>TO'G'RI JAVOBLAR</div>
                  </div>
                  <div style={{ width: '1px', background: '#f1f5f9' }} />
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3b82f6' }}>{scannedOMRSheet.percentage}%</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>NATIJA FOIZI</div>
                  </div>
                </div>
              </div>

              {/* Dynamic OMR sheet preview component */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <OMRSheetMockup
                  studentIdCode={scannedOMRSheet.studentIdCode}
                  answers={scannedOMRSheet.answers}
                  testKeys={selectedTest.questions_json || Array(15).fill("A")}
                  students={students}
                />
              </div>

              {/* Unreadable/unshaded ID warning */}
              {(scannedOMRSheet.studentIdCode || '').includes('?') && !selectedStudentForScan && (
                <div style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fcd34d',
                  borderRadius: '14px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  color: '#b45309',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  lineHeight: 1.4
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <span>O'quvchi IDsi belgilanmagan yoki o'qilmadi — o'quvchini quyidan qo'lda tanlang.</span>
                </div>
              )}

              {/* Student and Week mapper fields */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '24px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 850, color: '#475569' }}>OMR ID (o'qilgan):</label>
                  <input
                    type="text"
                    disabled
                    value={scannedOMRSheet.studentIdCode}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      background: '#f8fafc',
                      color: '#0f172a'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 850, color: '#475569' }}>Tizimdagi o'quvchi:</label>
                  <select
                    value={selectedStudentForScan}
                    onChange={(e) => setSelectedStudentForScan(e.target.value)}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${colors.primary}`,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="">O'quvchini tanlang...</option>
                    {classStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} {student.surname} ({student.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 850, color: '#475569' }}>Natija yoziladigan hafta:</label>
                  <select
                    value={selectedWeekForSaving}
                    onChange={(e) => {
                      if (e.target.value === '__more__') { setShowAllWeeks(true); return; }
                      setSelectedWeekForSaving(e.target.value);
                    }}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${colors.primary}`,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {weeksList.length > 0 ? (
                      weekOptionsFor(selectedWeekForSaving).map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))
                    ) : (
                      ['1-Hafta', '2-Hafta', '3-Hafta', '4-Hafta'].map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))
                    )}
                    {!showAllWeeks && weeksList.length > 4 && (
                      <option value="__more__">Eski haftalar…</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Control buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '2rem' }}>
                <button
                  onClick={() => {
                    setScannedOMRSheet(null);
                    setScanStatus('aligning');
                    setScanProgress(0);
                  }}
                  style={{
                    flex: 1,
                    background: '#ffffff',
                    color: '#475569',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Qayta skanerlash
                </button>
                <button
                  disabled={!selectedStudentForScan || syncingScore}
                  onClick={handleSaveScannedSheet}
                  style={{
                    flex: 1,
                    background: selectedStudentForScan ? colors.primary : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: selectedStudentForScan ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {syncingScore && <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite' }} />}
                  <span>{syncingScore ? "Saqlanmoqda..." : "Tizimga saqlash"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // MODAL C: REVIEW PAPERS MODAL
  const renderReviewModal = () => {
    if (!showReviewModal) return null;

    // Filter and sort currentTestScans based on search term and filter tab
    const filteredAndSortedScans = useMemo(() => {
      let list = [...currentTestScans];
      
      // Apply search filter
      if (reviewSearchTerm.trim()) {
        const term = reviewSearchTerm.toLowerCase();
        list = list.filter(s => s.studentName.toLowerCase().includes(term));
      }

      // Apply sorting/filtering based on active tab: Last, First, ID, Ext
      list.sort((a, b) => {
        switch (reviewFilterTab) {
          case 'Last':
            return parseInt(b.id) - parseInt(a.id); // scanned timestamp desc
          case 'First':
            return parseInt(a.id) - parseInt(b.id); // scanned timestamp asc
          case 'ID':
            return a.studentIdCode.localeCompare(b.studentIdCode); // Student ID order
          case 'Ext':
            return b.percentage - a.percentage; // Score order desc
          default:
            return parseInt(b.id) - parseInt(a.id);
        }
      });

      return list;
    }, [currentTestScans, reviewFilterTab, reviewSearchTerm]);

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: isMobile ? 0 : '1rem'
      }} onClick={() => setShowReviewModal(false)}>
        <div style={{
          background: '#ffffff',
          borderRadius: isMobile ? 0 : '28px',
          width: '100%',
          maxWidth: '430px',
          height: isMobile ? '100vh' : '88vh',
          maxHeight: isMobile ? '100vh' : '720px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }} onClick={e => e.stopPropagation()}>
          
          {/* Header Bar styled exactly like media__1780072237712.jpg */}
          <div style={{
            background: '#15803d', // Green bar
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <button
              onClick={() => setShowReviewModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0
              }}
            >
              <ArrowLeft size={16} />
              <span>Done Scanning</span>
            </button>

            <span style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.05em' }}>GRADED PAPERS</span>
            
            <button 
              onClick={() => setShowReviewModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Sub-header Filter tab pills and search bar */}
          <div style={{
            padding: '0.85rem 1.25rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              {/* Tab Pills */}
              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px', flex: 1 }}>
                {(['Last', 'First', 'ID', 'Ext'] as const).map(tab => {
                  const isActive = reviewFilterTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setReviewFilterTab(tab)}
                      style={{
                        flex: 1,
                        background: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? '#0f172a' : '#64748b',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.35rem 0',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <input
                type="text"
                placeholder="Qidirish..."
                value={reviewSearchTerm}
                onChange={e => setReviewSearchTerm(e.target.value)}
                style={{
                  width: '100px',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
            </div>

            {/* Paper Not in Class sub-banner exactly like mockup */}
            <div style={{
              border: '2px solid #15803d',
              borderRadius: '8px',
              padding: '0.4rem 0.85rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#15803d',
              background: '#ecfdf5'
            }}>
              <span>Paper Not in Class</span>
              <span>{filteredAndSortedScans.length} papers</span>
            </div>
          </div>

          {/* List of scanned papers rows */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {filteredAndSortedScans.length === 0 ? (
              <div style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={24} color="#94a3b8" />
                <span>Mos keluvchi OMR varaqlar topilmadi.</span>
              </div>
            ) : (
              filteredAndSortedScans.map(scan => (
                <div
                  key={scan.id}
                  onClick={() => { setReassignTargetId(''); setSelectedScanDetail(scan); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  {/* Left: Handwritten Crop box */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    {scan.studentIdCode === '557' ? (
                      <div style={{
                        width: '140px',
                        height: '24px',
                        overflow: 'hidden',
                        position: 'relative',
                        borderRadius: '2px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff'
                      }}>
                        <img 
                          src="/media__1780067393687.jpg" 
                          style={{
                            position: 'absolute',
                            top: '-18px',
                            left: '-10px',
                            width: '240px',
                            height: 'auto'
                          }}
                          alt="Signature"
                        />
                      </div>
                    ) : (
                      <div className="handwritten-signature" style={{
                        fontSize: '1.25rem',
                        color: '#1e3b8b',
                        width: '140px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {scan.studentName}
                      </div>
                    )}
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>
                      ID: {scan.studentIdCode}
                    </span>
                  </div>

                  {/* Right: Metrics and Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 800 }}>
                        {scan.correctCount}/{scan.totalQuestions}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                        {scan.percentage}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Ushbu skanerlangan varaqni o'chirmoqchimisiz?")) {
                          handleDeleteScannedSheet(scan.id);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.35rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title="O'chirish"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer close bar */}
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0', textAlign: 'right', flexShrink: 0 }}>
            <button
              onClick={() => setShowReviewModal(false)}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.5rem 1.5rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    );
  };

  // MODAL E: SCAN DETAIL VIEW MODAL
  const renderScanDetailModal = () => {
    if (!selectedScanDetail) return null;
    const testKeys = selectedTest?.questions_json || Array(15).fill("A");

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }} onClick={() => setSelectedScanDetail(null)}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '420px',
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxSizing: 'border-box'
        }} onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>VARAQ TAFSILOTI</h3>
            <button
              onClick={() => setSelectedScanDetail(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Graded Sheet Replica */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '55vh', paddingRight: '0.2rem' }}>
            <OMRSheetMockup
              studentIdCode={selectedScanDetail.studentIdCode}
              answers={selectedScanDetail.answers}
              testKeys={testKeys}
              students={students}
            />
          </div>

          {/* Reassign to another student */}
          {selectedTest && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 850, color: '#475569' }}>
                O'quvchini o'zgartirish ({selectedScanDetail.studentName}):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '0.55rem 0.65rem',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">Boshqa o'quvchini tanlang...</option>
                  {students
                    .filter(s => !s.isDeleted && (!selectedTest.level || getClassGroup(s.className) === getClassGroup(selectedTest.level)) && s.id !== selectedScanDetail.studentId)
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.surname} ({s.id})
                      </option>
                    ))}
                </select>
                <button
                  disabled={!reassignTargetId || isReassigning}
                  onClick={() => handleReassignScan(selectedScanDetail, reassignTargetId)}
                  style={{
                    background: (!reassignTargetId || isReassigning) ? '#cbd5e1' : '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: (!reassignTargetId || isReassigning) ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {isReassigning ? '...' : "O'tkazish"}
                </button>
              </div>
            </div>
          )}

          {/* Close button */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setSelectedScanDetail(null)}
              style={{
                flex: 1,
                background: colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    );
  };

  // MODAL D: ADD NEW TEST MODAL
  const renderAddTestModal = () => {
    if (!showAddTestModal) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }} onClick={() => setShowAddTestModal(false)}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxSizing: 'border-box',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.primary }}>
              <BookOpen size={18} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: 0 }}>Yangi test qo'shish</h3>
            </div>
            <button 
              onClick={() => setShowAddTestModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {/* Test nomi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Test nomi:</label>
              <input
                type="text"
                placeholder="Masalan: Algebra - 2-Haftalik Test"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                required
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  background: '#f8fafc'
                }}
                onFocus={e => e.target.style.borderColor = colors.primary}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Subject */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Fan yo'nalishi:</label>
              <select
                value={newTestSubject}
                onChange={(e) => setNewTestSubject(e.target.value)}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#334155',
                  background: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="Matematika">Matematika</option>
                <option value="Ingliz Tili">Ingliz Tili</option>
                {existingCustomSubjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="CUSTOM">+ Yangi fan...</option>
              </select>
              {newTestSubject === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Yangi fan nomi (masalan: Fizika)"
                  value={newCustomSubjectName}
                  onChange={(e) => setNewCustomSubjectName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: `1.5px solid ${colors.border}`,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    background: colors.bg,
                    marginTop: '0.35rem'
                  }}
                  onFocus={e => e.target.style.borderColor = colors.primary}
                  onBlur={e => e.target.style.borderColor = colors.border}
                />
              )}
            </div>

            {/* Week */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Hafta:</label>
              <select
                value={newTestWeek}
                onChange={(e) => {
                  if (e.target.value === '__more__') { setShowAllWeeks(true); return; }
                  setNewTestWeek(e.target.value);
                }}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#334155',
                  background: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Hafta tanlanmagan</option>
                {weekOptionsFor(newTestWeek).map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
                {!showAllWeeks && weeksList.length > 4 && (
                  <option value="__more__">Eski haftalar…</option>
                )}
              </select>
            </div>

            {/* Questions count */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Savollar soni:</label>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                {SELECTABLE_QUESTION_COUNTS.map(cnt => {
                  const isActive = newTestQuestionsCount === cnt;
                  return (
                    <button
                      type="button"
                      key={cnt}
                      onClick={() => setNewTestQuestionsCount(cnt)}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0',
                        borderRadius: '9999px',
                        border: isActive ? `1.5px solid ${colors.primary}` : '1.5px solid #e2e8f0',
                        background: isActive ? colors.primary : '#f8fafc',
                        color: isActive ? '#ffffff' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {cnt}
                    </button>
                  );
                })}
              </div>
              {!SUPPORTED_SCAN_COUNTS.includes(newTestQuestionsCount) && (
                <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>
                  {newTestQuestionsCount} savollik varaqlar uchun skaner tez orada qo'shiladi — kalitlarni hozir kiritish mumkin.
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowAddTestModal(false)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isCreatingTest}
                style={{
                  flex: 1,
                  background: isCreatingTest ? '#cbd5e1' : colors.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: isCreatingTest ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isCreatingTest ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Yaratilmoqda...</span>
                  </>
                ) : (
                  <span>Yaratish</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const currentTabContent = () => {
    switch (activeTab) {
      case 'tests': return renderTestsView();
      case 'folders': return renderFoldersView();
      case 'analysis': return renderAnalysisView();
      case 'settings': return renderSettingsView();
      default: return renderTestsView();
    }
  };

  const navItems = [
    { id: 'tests' as const, label: 'Testlar', icon: BookOpen },
    { id: 'folders' as const, label: 'Papkalar', icon: FolderOpen },
    { id: 'analysis' as const, label: 'Tahlil', icon: BarChart2 },
    { id: 'settings' as const, label: 'Sozlamalar', icon: Settings }
  ];

  // MOBILE BOTTOM NAVIGATION LAYOUT
  if (isMobile) {
    return (
      <div style={{
        background: '#fcfcf9',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Mobile Header Banner */}
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: 'calc(0.85rem + env(safe-area-inset-top, 0px)) 1.25rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={iconLight} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
            <div>
              <h1 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>AL-XORAZMIY</h1>
              <p style={{ fontSize: '0.62rem', color: colors.text, fontWeight: 800, margin: 0 }}>TESTOR KABINETI</p>
            </div>
          </div>
          
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '50%',
            background: colors.bg,
            color: colors.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 900
          }}>
            T
          </div>
        </header>

        {/* Scrollable View Content */}
        <main style={{
          flex: 1,
          padding: '1.25rem 1.25rem calc(104px + env(safe-area-inset-bottom, 0px)) 1.25rem', // Pad bottom to clear floating tab bar
          overflowY: 'auto'
        }}>
          {currentTabContent()}
        </main>

        {/* Floating Liquid Glass Tab Bar (shared design) */}
        <div className="mobile-tab-bar" style={{ display: 'flex' }}>
          <div className="tab-capsule" style={{ left: `calc((100% - 16px) * ${(navItems.findIndex(n => n.id === activeTab) + 0.5) / navItems.length} + 8px)`, background: colors.primary }} />
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedTest(null); // Reset detail views when tab changes
                  setActiveTab(item.id);
                }}
                className={`tab-item ${isActive ? 'active' : ''}`}
                style={isActive ? { color: colors.primary } : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        {renderLogoutModal()}
        {renderEditKeyModal()}
        {renderScanModal()}
        {renderReviewModal()}
        {renderScanDetailModal()}
        {renderAddTestModal()}
        {renderTestActionsModal()}
        {renderRescoreToast()}
      </div>
    );
  }

  // DESKTOP WEB SIDEBAR LAYOUT
  return (
    <div style={{
      background: '#fcfcf9',
      minHeight: '100vh',
      display: 'flex',
      boxSizing: 'border-box'
    }}>
      {/* Sidebar Nav panel */}
      <aside style={{
        width: '240px',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box'
      }}>
        {/* Brand logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
          <img src={iconLight} alt="Logo" style={{ width: '34px', height: '34px', borderRadius: '8px' }} />
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>AL-XORAZMIY</h1>
            <p style={{ fontSize: '0.68rem', color: colors.text, fontWeight: 800, margin: 0 }}>TESTOR KABINETI</p>
          </div>
        </div>

        {/* Tab switchers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedTest(null); // Reset detail views when tab changes
                  setActiveTab(item.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: isActive ? colors.bg : 'transparent',
                  color: isActive ? colors.text : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: isActive ? 800 : 700,
                  fontSize: '0.82rem',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} color={isActive ? colors.primary : '#64748b'} />
                <span>{item.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Logout at bottom */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: 'transparent',
              color: '#ef4444',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.82rem',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={18} />
            CHIQISH
          </button>
        </div>
      </aside>

      {/* Main dashboard content area */}
      <main style={{
        flex: 1,
        padding: '2.5rem',
        overflowY: 'auto'
      }}>
        {currentTabContent()}
      </main>
      {renderLogoutModal()}
      {renderEditKeyModal()}
      {renderScanModal()}
      {renderReviewModal()}
      {renderScanDetailModal()}
      {renderAddTestModal()}
      {renderTestActionsModal()}
      {renderRescoreToast()}
    </div>
  );
};

export default TestorCabinet;
