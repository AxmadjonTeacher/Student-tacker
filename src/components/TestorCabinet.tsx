import React, { useState, useEffect, useMemo } from 'react';
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
  Download, 
  Eye, 
  Calendar, 
  Clock, 
  Award, 
  Info, 
  ShieldAlert, 
  X
} from 'lucide-react';
import type { Student, Teacher } from '../types';
import StudentTable from './StudentTable';
import iconLight from '../assets/icon-light.png';

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

// Mock weekly test entries
const MOCK_TESTS = [
  { id: '1', title: 'Matematika - 1-test', subject: 'Matematika', date: '2026-05-10', duration: '45 daqiqa', questions: 20, className: '5-Sinf', status: 'Faol' },
  { id: '2', title: 'Ingliz tili - Grand Test 1', subject: 'Ingliz Tili', date: '2026-05-15', duration: '90 daqiqa', questions: 40, className: '6-Sinf', status: 'Faol' },
  { id: '3', title: 'Matematika - Choraqlik Imtihon', subject: 'Matematika', date: '2026-05-20', duration: '60 daqiqa', questions: 25, className: '7-Sinf', status: 'Faol' },
  { id: '4', title: 'Ingliz tili - Grammatika Quiz', subject: 'Ingliz Tili', date: '2026-05-25', duration: '30 daqiqa', questions: 15, className: '5-Sinf', status: 'Faol' },
  { id: '5', title: 'Matematika - Geometriya Test', subject: 'Matematika', date: '2026-05-26', duration: '45 daqiqa', questions: 20, className: '8-Sinf', status: 'Yopilgan' },
  { id: '6', title: 'Ingliz tili - Listening Test 2', subject: 'Ingliz Tili', date: '2026-05-28', duration: '40 daqiqa', questions: 20, className: '7-Sinf', status: 'Faol' }
];

// File browser types
interface MockFileNode {
  name: string;
  type: 'file';
  size: string;
}

interface MockFolderNode {
  name: string;
  type: 'folder';
  children: (MockFolderNode | MockFileNode)[];
}

const MOCK_FOLDERS: MockFolderNode = {
  name: 'Root',
  type: 'folder',
  children: [
    {
      name: 'Matematika',
      type: 'folder',
      children: [
        {
          name: 'Mr. Alisher',
          type: 'folder',
          children: [
            { name: '5-sinf Algebra_Haftalik.pdf', type: 'file', size: '1.2 MB' },
            { name: '6-sinf Geometriya_Test.pdf', type: 'file', size: '850 KB' }
          ]
        },
        {
          name: 'Mrs. Nodira',
          type: 'folder',
          children: [
            { name: '7-sinf Matematika_Chorak.pdf', type: 'file', size: '2.4 MB' },
            { name: '8-sinf Algebra_Nazorat.pdf', type: 'file', size: '1.5 MB' }
          ]
        }
      ]
    },
    {
      name: 'Ingliz Tili',
      type: 'folder',
      children: [
        {
          name: 'Mrs. Elena',
          type: 'folder',
          children: [
            { name: '5-sinf Grammar_Level1.pdf', type: 'file', size: '920 KB' },
            { name: '6-sinf Vocabulary_Week3.pdf', type: 'file', size: '1.1 MB' }
          ]
        },
        {
          name: 'Mr. Jasur',
          type: 'folder',
          children: [
            { name: 'Grand_Test_English_2026.pdf', type: 'file', size: '3.1 MB' },
            { name: 'IELTS_Mock_Reading.pdf', type: 'file', size: '1.8 MB' }
          ]
        }
      ]
    }
  ]
};

interface TestorCabinetProps {
  students: Student[];
  studentWeeks: any[];
  teachers: Teacher[];
  onLogout: () => void;
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

  // Weekly Tests Tab States
  const [testsSearch, setTestsSearch] = useState('');
  const [testsClassFilter, setTestsClassFilter] = useState('ALL');
  const [selectedTest, setSelectedTest] = useState<any | null>(null);

  // Folders Tab States
  const [currentFolder, setCurrentFolder] = useState<MockFolderNode>(MOCK_FOLDERS);
  const [folderHistory, setFolderHistory] = useState<MockFolderNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<MockFileNode | null>(null);

  // Analysis Tab States
  const [activeClass, setActiveClass] = useState<string>('5-Sinf');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Settings Tab States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sync isMobile on resizing
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update theme settings
  const handleSelectAccent = (color: 'indigo' | 'teal' | 'emerald' | 'rose') => {
    setAccentColor(color);
    localStorage.setItem('testor_theme_accent', color);
  };

  // ANALYSIS DATAS
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

  // Set default selectors
  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.includes(activeClass)) {
      setActiveClass(availableClasses[0]);
    }
  }, [availableClasses, activeClass]);

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

  // FOLDERS NAVIGATION LOGIC
  const handleOpenFolder = (node: MockFolderNode) => {
    setFolderHistory(prev => [...prev, currentFolder]);
    setCurrentFolder(node);
  };

  const handleGoBackFolder = () => {
    if (folderHistory.length === 0) return;
    const previous = folderHistory[folderHistory.length - 1];
    setFolderHistory(prev => prev.slice(0, -1));
    setCurrentFolder(previous);
  };

  // MOCK TESTS SEARCH
  const filteredTests = useMemo(() => {
    return MOCK_TESTS.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(testsSearch.toLowerCase()) || 
                            t.subject.toLowerCase().includes(testsSearch.toLowerCase());
      const matchesClass = testsClassFilter === 'ALL' || t.className === testsClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [testsSearch, testsClassFilter]);

  // Breadcrumbs representation
  const folderPath = useMemo(() => {
    return ['Root', ...folderHistory.slice(1).map(f => f.name), currentFolder.name].filter(n => n !== 'Root');
  }, [folderHistory, currentFolder]);

  // RENDER VIEWS
  const renderTestsView = () => (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Haftalik Test Topshiriqlari
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
          Maktab tizimidagi barcha testlar ro'yxati va yangilanishlar tarixi.
        </p>
      </div>

      {/* Filters card */}
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
        <select
          value={testsClassFilter}
          onChange={(e) => setTestsClassFilter(e.target.value)}
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '10px',
            border: '1.5px solid #e2e8f0',
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#475569',
            outline: 'none',
            background: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <option value="ALL">Barcha sinflar</option>
          <option value="5-Sinf">5-sinf</option>
          <option value="6-Sinf">6-sinf</option>
          <option value="7-Sinf">7-sinf</option>
          <option value="8-Sinf">8-sinf</option>
        </select>
      </div>

      {/* Tests list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filteredTests.length === 0 ? (
          <div style={{
            gridColumn: '1/-1',
            padding: '3rem',
            textAlign: 'center',
            background: '#ffffff',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '18px',
            color: '#64748b'
          }}>
            Yozuvlar topilmadi. Qidiruv so'zini o'zgartirib ko'ring.
          </div>
        ) : (
          filteredTests.map(test => (
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
                  background: test.subject === 'Matematika' ? '#f0fdfa' : '#f5f3ff',
                  color: test.subject === 'Matematika' ? '#0f766e' : '#5b21b6',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px'
                }}>{test.subject.toUpperCase()}</span>
                
                <span style={{
                  background: test.status === 'Faol' ? '#ecfdf5' : '#f1f5f9',
                  color: test.status === 'Faol' ? '#065f46' : '#475569',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px'
                }}>{test.status}</span>
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                  {test.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem' }}>
                  <Calendar size={12} />
                  <span>{test.date}</span>
                  <span>·</span>
                  <Award size={12} />
                  <span>{test.className}</span>
                </div>
              </div>

              <div style={{ height: '1px', background: '#f1f5f9', width: '100%' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} />
                  <span>{test.duration}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <BookOpen size={12} />
                  <span>{test.questions} ta savol</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Test details Modal */}
      {selectedTest && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setSelectedTest(null)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            width: '100%',
            maxWidth: '500px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedTest(null)}
              style={{
                position: 'absolute',
                top: '1.25rem', right: '1.25rem',
                background: '#f1f5f9', color: '#64748b',
                border: 'none', width: '30px', height: '30px',
                borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={15} />
            </button>

            <div>
              <span style={{
                background: colors.bg,
                color: colors.text,
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                display: 'inline-block',
                marginBottom: '0.5rem'
              }}>HAFTALIK TEST MA'LUMOTI</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 850, color: '#0f172a', margin: 0 }}>
                {selectedTest.title}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Fan yo'nalishi:</span>
                <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800 }}>{selectedTest.subject}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Ulashilgan sinf:</span>
                <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800 }}>{selectedTest.className}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Sana:</span>
                <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800 }}>{selectedTest.date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Davomiyligi:</span>
                <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800 }}>{selectedTest.duration}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Savollar soni:</span>
                <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800 }}>{selectedTest.questions} ta topshiriq</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  alert("Hozirda topshiriq PDF faylini yuklash o'rnatilmagan (Placeholder).");
                }}
                style={{
                  flex: 1,
                  background: colors.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Download size={14} />
                Yuklab olish (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFoldersView = () => (
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
        padding: '1.25rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        minHeight: '340px'
      }}>
        {/* Navigation / Path header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {folderHistory.length > 0 && (
              <button
                onClick={handleGoBackFolder}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                <ArrowLeft size={14} />
              </button>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>
              <span 
                onClick={() => {
                  setCurrentFolder(MOCK_FOLDERS);
                  setFolderHistory([]);
                }} 
                style={{ cursor: 'pointer', color: colors.primary }}
              >ROOT</span>
              {folderPath.map((folderName, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight size={12} color="#cbd5e1" />
                  <span style={{ color: idx === folderPath.length - 1 ? '#1e293b' : '#64748b' }}>
                    {folderName.toUpperCase()}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
            {currentFolder.children.length} ta element
          </div>
        </div>

        {/* Directory browser list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {currentFolder.children.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              Papkada hech narsa yo'q
            </div>
          ) : (
            currentFolder.children.map((child, idx) => {
              const isFolder = child.type === 'folder';
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isFolder) {
                      handleOpenFolder(child as MockFolderNode);
                    } else {
                      setSelectedFile(child as MockFileNode);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.background = colors.bg;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#f1f5f9';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isFolder ? (
                      <FolderOpen size={18} color={colors.primary} />
                    ) : (
                      <FileText size={18} color="#94a3b8" />
                    )}
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      {child.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      {isFolder ? 'Papka' : (child as MockFileNode).size}
                    </span>
                    {isFolder && <ChevronRight size={14} color="#cbd5e1" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* File details popup modal */}
      {selectedFile && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setSelectedFile(null)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            width: '100%',
            maxWidth: '440px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedFile(null)}
              style={{
                position: 'absolute',
                top: '1.25rem', right: '1.25rem',
                background: '#f1f5f9', color: '#64748b',
                border: 'none', width: '30px', height: '30px',
                borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={15} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={28} color={colors.primary} />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 850, color: '#0f172a', margin: 0 }}>
                  {selectedFile.name}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>PDF hujjat ({selectedFile.size})</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => alert("Hujjat ko'rish rejimi faollashtirilmoqda (Placeholder).")}
                style={{
                  background: colors.bg,
                  color: colors.text,
                  border: `1.5px solid ${colors.border}`,
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Eye size={14} />
                Faylni ochish
              </button>
              <button
                onClick={() => alert("Yuklab olish jarayoni (Placeholder).")}
                style={{
                  background: colors.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Download size={14} />
                Yuklab olish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

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
          <span>Versiya: 2.1.0 (Testor build)</span>
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
        zIndex: 1000,
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
                onLogout();
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
                onClick={() => setAllActiveTabToTab(item.id)}
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
                onClick={() => setActiveTab(item.id)}
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
    </div>
  );

  // Helper function to set tab
  function setAllActiveTabToTab(tabId: 'tests' | 'folders' | 'analysis' | 'settings') {
    setActiveTab(tabId);
  }
};

export default TestorCabinet;
