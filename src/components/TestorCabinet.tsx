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
  Trash2
} from 'lucide-react';
import type { Student, Teacher } from '../types';
import StudentTable from './StudentTable';
import iconLight from '../assets/icon-light.png';
import { supabaseTestor } from '../supabase_testor';

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

// Fallback tests in case database has no data yet - REMOVED

interface TestorCabinetProps {
  students: Student[];
  studentWeeks: any[];
  teachers: Teacher[];
  onLogout: (force?: boolean) => void;
}

const TestorCabinet: React.FC<TestorCabinetProps> = ({
  students,
  studentWeeks,
  teachers,
  onLogout
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

  // States for adding a new test
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestSubject, setNewTestSubject] = useState<'Matematika' | 'Ingliz Tili'>('Matematika');
  const [newTestTeacher, setNewTestTeacher] = useState('');
  const [newTestLevel, setNewTestLevel] = useState('5-Sinf');
  const [newTestQuestionsCount, setNewTestQuestionsCount] = useState(15);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  // Filter teachers list based on active subject selection in the modal
  const filteredTeachersForNewTest = useMemo(() => {
    const filterSubject = newTestSubject === 'Matematika' ? 'MATH' : 'ENG';
    return teachers.filter(t => t.subject === filterSubject);
  }, [newTestSubject, teachers]);

  // Set default teacher when filtered list changes or when modal is opened
  useEffect(() => {
    if (filteredTeachersForNewTest.length > 0) {
      if (!filteredTeachersForNewTest.some(t => t.name === newTestTeacher)) {
        setNewTestTeacher(filteredTeachersForNewTest[0].name);
      }
    } else {
      setNewTestTeacher('');
    }
  }, [filteredTeachersForNewTest]);

  const openAddTestModal = () => {
    setNewTestName('');
    setNewTestSubject('Matematika');
    const mathTeachers = teachers.filter(t => t.subject === 'MATH');
    setNewTestTeacher(mathTeachers.length > 0 ? mathTeachers[0].name : '');
    setNewTestLevel('5-Sinf');
    setNewTestQuestionsCount(15);
    setShowAddTestModal(true);
  };

  // States for folder tree expansion in "Papkalar" section
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});

  const toggleSubject = (subj: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subj]: !prev[subj]
    }));
  };

  const toggleTeacher = (subj: string, teacher: string) => {
    const key = `${subj}_${teacher}`;
    setExpandedTeachers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim()) {
      alert("Iltimos, test nomini kiriting!");
      return;
    }
    if (!newTestTeacher) {
      alert("Iltimos, o'qituvchini tanlang!");
      return;
    }
    if (newTestQuestionsCount < 1 || newTestQuestionsCount > 100) {
      alert("Savollar soni 1 va 100 oralig'ida bo'lishi kerak!");
      return;
    }

    setIsCreatingTest(true);
    const questionsArray = Array(newTestQuestionsCount).fill("A");

    const newTestData = {
      name: newTestName.trim(),
      subject: newTestSubject,
      teacher_name: newTestTeacher,
      level: newTestLevel,
      questions_json: questionsArray,
      student_count: 0
    };

    try {
      // 1. Try to insert to database
      const { data, error } = await supabaseTestor
        .from('public_tests')
        .insert([newTestData])
        .select();

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
          student_count: data[0].student_count || 0
        };
        setDbTests(prev => [created, ...prev]);
        alert("Yangi test muvaffaqiyatli yaratildi va ma'lumotlar bazasiga saqlandi!");
      } else {
        // Fallback in case of no returning data but no error
        const localId = 'local_' + Date.now();
        const localCreated = {
          id: localId,
          ...newTestData,
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

          return {
            id: t.id.toString(),
            name: t.name || 'Nomsiz test',
            subject: t.subject || 'Boshqa',
            created_at: t.created_at || new Date().toISOString(),
            teacher_name: t.teacher_name || "O'qituvchi",
            level: t.level || '5-Sinf',
            questions_json: questions,
            student_count: t.student_count || 0
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

  // Sync / local saves for answer key updates
  const handleSaveAnswerKey = async (testId: string, updatedKeys: string[]) => {
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

  // Dynamic grouping computed values
  const subjects = useMemo(() => {
    const set = new Set<string>();
    dbTests.forEach(t => {
      if (t.subject) set.add(t.subject);
    });
    return Array.from(set).sort();
  }, [dbTests]);

  const getTeachersForSubject = (subj: string) => {
    const set = new Set<string>();
    dbTests.forEach(t => {
      if (t.subject === subj && t.teacher_name) {
        set.add(t.teacher_name);
      }
    });
    return Array.from(set).sort();
  };

  const getTestsForTeacher = (subj: string, teacher: string) => {
    return dbTests.filter(t => t.subject === subj && t.teacher_name === teacher);
  };

  // Options views & Camera scanning states
  const [showEditKeyModal, setShowEditKeyModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Camera setup
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanStatus, setScanStatus] = useState<'aligning' | 'scanning' | 'success'>('aligning');
  const [scanProgress, setScanProgress] = useState(0);

  // Scan OMR validation state
  const [scannedOMRSheet, setScannedOMRSheet] = useState<any | null>(null);
  const [selectedStudentForScan, setSelectedStudentForScan] = useState<string>('');
  
  // localStorage persistence of OMR scans
  const [currentTestScans, setCurrentTestScans] = useState<any[]>([]);

  useEffect(() => {
    if (selectedTest) {
      const saved = localStorage.getItem(`testor_scans_${selectedTest.id}`);
      if (saved) {
        setCurrentTestScans(JSON.parse(saved));
      } else {
        setCurrentTestScans([]);
      }
    } else {
      setCurrentTestScans([]);
    }
  }, [selectedTest]);

  // Camera stream trigger
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        setScanStatus('aligning');
        setScanProgress(0);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        activeStream = stream;
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera capture error:', err);
        // Fallback if mediaDevice getUserMedia fails in sandbox / browser blocked permissions
        setScanStatus('aligning');
      }
    };

    if (showScanModal) {
      startCamera();
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showScanModal]);

  // Simulate OMR scan timeline
  useEffect(() => {
    let timer: any = null;
    let progressTimer: any = null;
    
    if (showScanModal && cameraStream) {
      // 1.5 seconds aligning, then 2.5 seconds scanning
      timer = setTimeout(() => {
        setScanStatus('scanning');
        
        progressTimer = setInterval(() => {
          setScanProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressTimer);
              handleTriggerOMRGrade();
              return 100;
            }
            return prev + 8;
          });
        }, 150);

      }, 1500);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [showScanModal, cameraStream]);

  // Perform grading and student association simulation
  const handleTriggerOMRGrade = () => {
    if (!selectedTest) return;

    // Filter students belonging to this class/grade level (e.g. 5-Sinf, etc.)
    const classStudents = students.filter(s => {
      const group = getClassGroup(s.className);
      const testGroup = getClassGroup(selectedTest.level);
      return group === testGroup && !s.isDeleted;
    });

    if (classStudents.length === 0) {
      alert("Ushbu sinfda o'quvchilar topilmadi!");
      setShowScanModal(false);
      return;
    }

    // Pick a random student initially
    const randomIndex = Math.floor(Math.random() * classStudents.length);
    const chosenStudent = classStudents[randomIndex];
    setSelectedStudentForScan(chosenStudent.id);

    // Generate random OMR responses mostly correct (11 - 14 correct keys out of 15)
    const testKeys = selectedTest.questions_json || Array(15).fill("A");
    const numQuestions = testKeys.length;
    const studentAnswers = [...testKeys];
    
    // Intentionally mismatch 1-3 keys
    const wrongCount = Math.floor(Math.random() * 3) + 1;
    const options = ["A", "B", "C", "D"];
    for (let i = 0; i < wrongCount; i++) {
      const wrongIdx = Math.floor(Math.random() * numQuestions);
      const correctOption = testKeys[wrongIdx];
      const wrongOptions = options.filter(o => o !== correctOption);
      studentAnswers[wrongIdx] = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    }

    // Grade OMR
    let correct = 0;
    studentAnswers.forEach((ans, idx) => {
      if (ans === testKeys[idx]) correct++;
    });

    setScannedOMRSheet({
      studentIdCode: (Math.floor(Math.random() * 900) + 100).toString(), // mock OMR bubble 3-digit student ID
      answers: studentAnswers,
      correctCount: correct,
      totalQuestions: numQuestions,
      percentage: Math.round((correct / numQuestions) * 100)
    });

    setScanStatus('success');
  };

  // Save scanned paper sheet results
  const handleSaveScannedSheet = () => {
    if (!selectedTest || !scannedOMRSheet) return;

    const matchedStudent = students.find(s => s.id === selectedStudentForScan);
    if (!matchedStudent) return;

    const newScan = {
      id: Date.now().toString(),
      studentId: selectedStudentForScan,
      studentName: `${matchedStudent.name} ${matchedStudent.surname}`,
      studentIdCode: scannedOMRSheet.studentIdCode,
      scannedAt: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      answers: scannedOMRSheet.answers,
      correctCount: scannedOMRSheet.correctCount,
      totalQuestions: scannedOMRSheet.totalQuestions,
      percentage: scannedOMRSheet.percentage
    };

    // Prevent duplicates for the same student in this session scans
    const updatedScans = [newScan, ...currentTestScans.filter(s => s.studentId !== selectedStudentForScan)];
    setCurrentTestScans(updatedScans);
    localStorage.setItem(`testor_scans_${selectedTest.id}`, JSON.stringify(updatedScans));

    // Update database & local test student count
    handleIncrementStudentCount(selectedTest.id, updatedScans.length);

    // Reset scanner states
    setShowScanModal(false);
    setScannedOMRSheet(null);
    setSelectedStudentForScan('');
  };

  // Remove a scanned sheet
  const handleDeleteScannedSheet = (scanId: string) => {
    if (!selectedTest) return;
    const filtered = currentTestScans.filter(s => s.id !== scanId);
    setCurrentTestScans(filtered);
    localStorage.setItem(`testor_scans_${selectedTest.id}`, JSON.stringify(filtered));
    handleIncrementStudentCount(selectedTest.id, filtered.length);
  };

  // Analysis Tab States
  const [activeClass, setActiveClass] = useState<string>('5-Sinf');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Settings Tab States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Update theme settings
  const handleSelectAccent = (color: 'indigo' | 'teal' | 'emerald' | 'rose') => {
    setAccentColor(color);
    localStorage.setItem('testor_theme_accent', color);
  };

  // ANALYSIS DATA COMPUTATIONS
  const activeStudents = useMemo(() => {
    return students.filter(s => !s.isDeleted);
  }, [students]);

  const weeksList = useMemo(() => {
    const weeksSet = new Set<string>();
    studentWeeks.forEach(sw => {
      if (sw.week && !sw.is_deleted) weeksSet.add(sw.week);
    });
    return Array.from(weeksSet).sort((a, b) => {
      return parseWeekToSortValue(a) - parseWeekToSortValue(b);
    });
  }, [studentWeeks]);

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
        const hist = studentWeeks.find(sw => sw.student_id === student.id && sw.week === selectedWeek);
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
        {/* Back Link Row */}
        <div style={{ alignSelf: 'flex-start', marginBottom: '1.5rem' }}>
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
        </div>

        {/* Sketch phone mockup or screen container */}
        <div style={{
          background: '#0f172a',
          border: `2px solid ${colors.primary}`,
          borderRadius: '32px',
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem 2rem',
          boxShadow: `0 20px 40px -15px ${colors.primary}30`,
          display: 'flex',
          flexDirection: 'column',
          gap: '2.25rem',
          color: '#ffffff',
          boxSizing: 'border-box'
        }}>
          {/* Properties summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontSize: '0.92rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Teacher:</span>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>{test.teacher_name}</span>
            </div>
            <div style={{ fontSize: '0.92rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Form:</span>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>{test.level}</span>
            </div>
            <div style={{ fontSize: '0.92rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Date:</span>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>{formattedDate}</span>
            </div>
            <div style={{ fontSize: '0.92rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Papers:</span>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>{getScannedCount(test.id)} ta varaq</span>
            </div>
            <div style={{ fontSize: '0.92rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Number Of Questions:</span>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>{numQuestions} ta</span>
            </div>
          </div>

          {/* Action Buttons styled like the sketch outlines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => setShowEditKeyModal(true)}
              style={{
                background: 'transparent',
                border: '2px solid #fda4af',
                color: '#fda4af',
                borderRadius: '16px',
                padding: '0.85rem',
                fontSize: '1.05rem',
                fontWeight: 750,
                cursor: 'pointer',
                textAlign: 'center',
                letterSpacing: '0.03em',
                transition: 'all 0.2s',
                textTransform: 'lowercase'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fda4af20';
                e.currentTarget.style.boxShadow = '0 0 15px #fda4af40';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              edit key
            </button>

            <button
              onClick={() => setShowScanModal(true)}
              style={{
                background: 'transparent',
                border: '2px solid #fda4af',
                color: '#fda4af',
                borderRadius: '16px',
                padding: '0.85rem',
                fontSize: '1.05rem',
                fontWeight: 750,
                cursor: 'pointer',
                textAlign: 'center',
                letterSpacing: '0.03em',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fda4af20';
                e.currentTarget.style.boxShadow = '0 0 15px #fda4af40';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Scan the paper
            </button>

            <button
              onClick={() => setShowReviewModal(true)}
              style={{
                background: 'transparent',
                border: '2px solid #fda4af',
                color: '#fda4af',
                borderRadius: '16px',
                padding: '0.85rem',
                fontSize: '1.05rem',
                fontWeight: 750,
                cursor: 'pointer',
                textAlign: 'center',
                letterSpacing: '0.03em',
                transition: 'all 0.2s',
                textTransform: 'lowercase'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fda4af20';
                e.currentTarget.style.boxShadow = '0 0 15px #fda4af40';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              review paper
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
                  }}>{test.level}</span>
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    {test.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem' }}>
                    <Calendar size={12} />
                    <span>{new Date(test.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <Award size={12} />
                    <span>{test.teacher_name}</span>
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
            Fanlar & O'qituvchilar Papkalari
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            Topshiriqlar fayl tizimi ko'rinishida guruhlangan.
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
          ) : subjects.length === 0 ? (
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
            /* Tree View Hierarchy */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {subjects.map((subj, sIdx) => {
                const isSubjExpanded = !!expandedSubjects[subj];
                const subjectTeachers = getTeachersForSubject(subj);
                
                return (
                  <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Subject Folder Row */}
                    <div
                      onClick={() => toggleSubject(subj)}
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
                      
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                        {subjectTeachers.length} ta o'qituvchi
                      </span>
                    </div>

                    {/* Subject Children (Teachers) */}
                    {isSubjExpanded && (
                      <div style={{
                        borderLeft: '2px solid #cbd5e1',
                        marginLeft: '1.25rem',
                        paddingLeft: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        position: 'relative',
                        paddingTop: '0.25rem',
                        paddingBottom: '0.25rem'
                      }}>
                        {subjectTeachers.length === 0 ? (
                          <div style={{ position: 'relative' }}>
                            {/* Horizontal line for empty state */}
                            <div style={{
                              position: 'absolute',
                              left: '-1.5rem',
                              top: '50%',
                              width: '1.25rem',
                              height: '2px',
                              background: '#cbd5e1'
                            }} />
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                              O'qituvchilar mavjud emas
                            </div>
                          </div>
                        ) : (
                          subjectTeachers.map((teacher, tIdx) => {
                            const teacherKey = `${subj}_${teacher}`;
                            const isTeacherExpanded = !!expandedTeachers[teacherKey];
                            const teacherTests = getTestsForTeacher(subj, teacher);

                            return (
                              <div key={tIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                                {/* Horizontal connector branch line to this teacher folder */}
                                <div style={{
                                  position: 'absolute',
                                  left: '-1.5rem',
                                  top: '1.25rem',
                                  width: '1.25rem',
                                  height: '2px',
                                  background: '#cbd5e1'
                                }} />

                                {/* Teacher Folder Row */}
                                <div
                                  onClick={() => toggleTeacher(subj, teacher)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '10px',
                                    border: isTeacherExpanded ? `1.5px solid ${colors.primary}` : '1.5px solid #e2e8f0',
                                    background: isTeacherExpanded ? colors.bg : '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={e => {
                                    if (!isTeacherExpanded) {
                                      e.currentTarget.style.borderColor = colors.border;
                                      e.currentTarget.style.background = colors.bg;
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (!isTeacherExpanded) {
                                      e.currentTarget.style.borderColor = '#e2e8f0';
                                      e.currentTarget.style.background = '#ffffff';
                                    }
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <div style={{
                                      color: colors.primary,
                                      transform: isTeacherExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}>
                                      <ChevronRight size={14} style={{ strokeWidth: 2.5 }} />
                                    </div>
                                    <FolderOpen size={16} color={colors.primary} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 750, color: isTeacherExpanded ? colors.text : '#334155' }}>
                                      {teacher}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>
                                    {teacherTests.length} ta test
                                  </span>
                                </div>

                                {/* Teacher Children (Tests list) */}
                                {isTeacherExpanded && (
                                  <div style={{
                                    borderLeft: '2px solid #cbd5e1',
                                    marginLeft: '1.1rem',
                                    paddingLeft: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.4rem',
                                    position: 'relative',
                                    paddingTop: '0.25rem',
                                    paddingBottom: '0.25rem',
                                    marginTop: '0.1rem'
                                  }}>
                                    {teacherTests.length === 0 ? (
                                      <div style={{ position: 'relative' }}>
                                        <div style={{
                                          position: 'absolute',
                                          left: '-1.5rem',
                                          top: '50%',
                                          width: '1.25rem',
                                          height: '2px',
                                          background: '#cbd5e1'
                                        }} />
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                                          Testlar mavjud emas
                                        </div>
                                      </div>
                                    ) : (
                                      teacherTests.map((test) => (
                                        <div key={test.id} style={{ position: 'relative' }}>
                                          {/* Horizontal connector branch line to this test */}
                                          <div style={{
                                            position: 'absolute',
                                            left: '-1.5rem',
                                            top: '1.1rem',
                                            width: '1.25rem',
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                              <FileText size={16} color="#94a3b8" />
                                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                                {test.name}
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                                              <span>{test.level} · {test.questions_json.length} ta kalit · {getScannedCount(test.id)} topshirildi</span>
                                              <ChevronRight size={12} color="#cbd5e1" />
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={activeClass}
            onChange={(e) => setActiveClass(e.target.value)}
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
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
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
              weeksList.map(wk => (
                <option key={wk} value={wk}>{wk}</option>
              ))
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

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '10px',
                  border: isSelected ? `2px solid ${itemColor}` : '1.5px solid #e2e8f0',
                  background: isSelected ? `${itemColor}10` : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  color: isSelected ? itemColor : '#475569',
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: itemColor }} />
                {color.toUpperCase()}
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
        onClick={() => setShowLogoutConfirm(true)}
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

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: numQuestions }).map((_, idx) => {
              const currentKey = testKeys[idx] || "A";
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '12px', gap: '1rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', minWidth: '40px' }}>
                    {idx + 1}-Savol:
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flex: 1, justifyContent: 'flex-end' }}>
                    {["A", "B", "C", "D"].map(option => {
                      const isActive = currentKey === option;
                      return (
                        <button
                          key={option}
                          onClick={() => {
                            const newKeys = [...testKeys];
                            newKeys[idx] = option;
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
                handleSaveAnswerKey(selectedTest.id, testKeys);
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

  // MODAL B: CAMERA OMR SCANNER MODAL (Including Validation Grading View)
  const renderScanModal = () => {
    if (!selectedTest || !showScanModal) return null;

    // Filter students belonging to this class/grade level (e.g. 5-Sinf, etc.)
    const classStudents = students.filter(s => {
      const group = getClassGroup(s.className);
      const testGroup = getClassGroup(selectedTest.level);
      return group === testGroup && !s.isDeleted;
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
            {/* Real Video Frame */}
            {cameraStream ? (
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
                  top: 0, left: 0
                }}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                gap: '1rem',
                background: '#1e293b'
              }}>
                <RefreshCw size={28} style={{ animation: 'spin 1.5s linear infinite' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Kamera ishga tushirilmoqda...</span>
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
              {/* Header Top Bar */}
              <div style={{
                background: '#15803d',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff'
              }}>
                <button
                  onClick={() => setShowScanModal(false)}
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

                <span style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.05em' }}>SCANNING</span>
                
                <button style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}>
                  <Settings size={18} />
                </button>
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
                <div style={{
                  position: 'relative',
                  width: '80%',
                  maxWidth: '300px',
                  height: '70%',
                  maxHeight: '440px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Top-Left Bracket */}
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '56px', height: '56px',
                    borderTop: '3px solid #000000',
                    borderLeft: '3px solid #000000',
                    borderTopLeftRadius: '16px'
                  }} />
                  
                  {/* Top-Right Bracket */}
                  <div style={{
                    position: 'absolute',
                    top: 0, right: 0,
                    width: '56px', height: '56px',
                    borderTop: '3px solid #000000',
                    borderRight: '3px solid #000000',
                    borderTopRightRadius: '16px'
                  }} />

                  {/* Bottom-Left Bracket */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0,
                    width: '56px', height: '56px',
                    borderBottom: '3px solid #000000',
                    borderLeft: '3px solid #000000',
                    borderBottomLeftRadius: '16px'
                  }} />

                  {/* Bottom-Right Bracket */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0, right: 0,
                    width: '56px', height: '56px',
                    borderBottom: '3px solid #000000',
                    borderRight: '3px solid #000000',
                    borderBottomRightRadius: '16px'
                  }} />

                  {/* Guide instruction card */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    color: '#0f172a',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    lineHeight: 1.4,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    width: '80%',
                    position: 'absolute',
                    top: '20px'
                  }}>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '0.2rem' }}>[1]</div>
                    <div style={{ fontWeight: 900, marginBottom: '0.4rem' }}>{selectedTest.questions_json.length} talik (5427)</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>Align 4 corner squares with viewfinders</div>
                  </div>

                  {/* Glowing Green Scanline */}
                  {scanStatus === 'scanning' && (
                    <div style={{
                      position: 'absolute',
                      left: '5%',
                      width: '90%',
                      height: '3px',
                      background: '#22c55e',
                      boxShadow: '0 0 10px #22c55e, 0 0 20px #22c55e',
                      zIndex: 20,
                      animation: 'scanLineMove 2s linear infinite'
                    }} />
                  )}
                  
                  <style>{`
                    @keyframes scanLineMove {
                      0% { top: 15%; }
                      50% { top: 85%; }
                      100% { top: 15%; }
                    }
                    @keyframes fadeIn {
                      from { opacity: 0; }
                      to { opacity: 1; }
                    }
                    @keyframes slideUp {
                      from { transform: translateY(16px); opacity: 0; }
                      to { transform: translateY(0); opacity: 1; }
                    }
                  `}</style>
                </div>
              </div>

              {/* Bottom control bar */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '1.25rem',
                textAlign: 'center',
                color: '#ffffff'
              }}>
                {scanStatus === 'aligning' && (
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fdba74' }}>
                    Qog'ozni tekislab ko'rsating...
                  </span>
                )}
                {scanStatus === 'scanning' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4ade80' }}>
                      Skanerlanmoqda... {scanProgress}%
                    </span>
                    <div style={{ width: '80%', maxWidth: '240px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${scanProgress}%`, height: '100%', background: '#22c55e', transition: 'width 0.15s ease' }} />
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
            background: '#fcfcf9',
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
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>OMR VARAG'I O'QILDI</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Grading results computed from bubbled marks</p>
                
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

              {/* Student mapper fields */}
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Talaba OMR IDsi (skanerlangan):</label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Tizimdan mos keluvchi talaba:</label>
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
              </div>

              {/* Answers Grid check-sheet list */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '24px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 850, color: '#334155', margin: 0 }}>Skanerlangan javoblar tahlili:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                  {scannedOMRSheet.answers.map((ans: string, idx: number) => {
                    const correctKey = selectedTest.questions_json[idx] || "A";
                    const isCorrect = ans === correctKey;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', background: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '8px', gap: '1rem' }}>
                        <span style={{ fontWeight: 800, color: '#64748b' }}>{idx + 1}-Savol:</span>
                        <div style={{ display: 'flex', gap: '0.85rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <span style={{ textDecoration: !isCorrect ? 'line-through' : 'none', color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 800 }}>
                            Belgilangan: {ans}
                          </span>
                          {!isCorrect && (
                            <span style={{ color: '#10b981', fontWeight: 800 }}>
                              To'g'ri: {correctKey}
                            </span>
                          )}
                          <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 900 }}>
                            {isCorrect ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
                  Qayta skanerlash
                </button>
                <button
                  disabled={!selectedStudentForScan}
                  onClick={handleSaveScannedSheet}
                  style={{
                    flex: 1,
                    background: selectedStudentForScan ? colors.primary : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: selectedStudentForScan ? 'pointer' : 'not-allowed'
                  }}
                >
                  Tizimga saqlash
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // MODAL C: REVIEW PAPER DETAILS ROW VIEW LIST
  const renderReviewModal = () => {
    if (!selectedTest || !showReviewModal) return null;

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
      }} onClick={() => setShowReviewModal(false)}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxSizing: 'border-box'
        }} onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.primary }}>
              <FileText size={18} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: 0 }}>review paper ({currentTestScans.length})</h3>
            </div>
            <button 
              onClick={() => setShowReviewModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* List of scanned papers */}
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {currentTestScans.length === 0 ? (
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
                <span>Hozircha skanerlangan qog'ozlar mavjud emas.</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Scan the paper tugmasi orqali yangi varaqni skanerlang.</span>
              </div>
            ) : (
              currentTestScans.map(scan => (
                <div
                  key={scan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                      {scan.studentName}
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      <span>Skanerlandi: {scan.scannedAt}</span>
                      <span>·</span>
                      <span>ID: {scan.studentIdCode}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#10b981', display: 'block' }}>
                        {scan.correctCount} / {scan.totalQuestions}
                      </strong>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>
                        {scan.percentage}% to'g'ri
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteScannedSheet(scan.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="O'chirish"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Close button */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', textAlign: 'right' }}>
            <button
              onClick={() => setShowReviewModal(false)}
              style={{
                background: colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.65rem 1.5rem',
                fontSize: '0.8rem',
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
                onChange={(e) => setNewTestSubject(e.target.value as 'Matematika' | 'Ingliz Tili')}
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
              </select>
            </div>

            {/* Teacher */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>O'qituvchi:</label>
              {filteredTeachersForNewTest.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
                  Ushbu fan bo'yicha o'qituvchilar topilmadi. Avval o'qituvchilarni qo'shing.
                </div>
              ) : (
                <select
                  value={newTestTeacher}
                  onChange={(e) => setNewTestTeacher(e.target.value)}
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
                  {filteredTeachersForNewTest.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Level/Class */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Sinf / Guruh:</label>
              <select
                value={newTestLevel}
                onChange={(e) => setNewTestLevel(e.target.value)}
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
                {['5-Sinf', '6-Sinf', '7-Sinf', '8-Sinf', '9-Sinf', '10-Sinf', '11-Sinf'].map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Questions count */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Savollar soni:</label>
              <input
                type="number"
                min="1"
                max="100"
                value={newTestQuestionsCount}
                onChange={(e) => setNewTestQuestionsCount(parseInt(e.target.value, 10) || 15)}
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
                disabled={isCreatingTest || filteredTeachersForNewTest.length === 0}
                style={{
                  flex: 1,
                  background: (isCreatingTest || filteredTeachersForNewTest.length === 0) ? '#cbd5e1' : colors.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: (isCreatingTest || filteredTeachersForNewTest.length === 0) ? 'not-allowed' : 'pointer',
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
          padding: '0.85rem 1.25rem',
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
          padding: '1.25rem 1.25rem 5rem 1.25rem', // Pad bottom to clear bottom nav
          overflowY: 'auto'
        }}>
          {currentTabContent()}
        </main>

        {/* Fixed Bottom Navigation Bar */}
        <nav style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '0.5rem 0.25rem',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 100,
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.03)'
        }}>
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
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? colors.primary : '#94a3b8',
                  padding: '0.25rem 0.5rem',
                  gap: '0.2rem',
                  cursor: 'pointer',
                  width: '20%',
                  transition: 'color 0.15s'
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 800 : 600 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {renderLogoutModal()}
        {renderEditKeyModal()}
        {renderScanModal()}
        {renderReviewModal()}
        {renderAddTestModal()}
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
      {renderAddTestModal()}
    </div>
  );
};

export default TestorCabinet;
