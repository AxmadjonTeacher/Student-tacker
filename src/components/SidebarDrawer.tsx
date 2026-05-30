import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  UploadCloud, X, Download, Trash2, UserPlus, Settings,
  Calendar, AlertCircle, Tag, Image as ImageIcon, Plus, 
  ChevronDown, ChevronUp, Clock, Eye, Send, Bell, LogOut
} from 'lucide-react';
import Papa from 'papaparse';
import type { Student, ActiveSubject, Teacher } from '../types';
import AddStudentModal from './AddStudentModal';
import { supabase } from '../supabase';
import CustomDialog from './CustomDialog';
import { generateRandomId } from '../utils/idGenerator';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: ActiveSubject;
  onSubjectChange: (subj: ActiveSubject) => void;
  isAdminMode: boolean;
  onToggleAdmin: () => void;
  students: Student[];
  deletedStudents: Student[];
  onRestoreStudent: (studentId: string) => void;
  onPermanentDeleteStudent: (studentId: string) => void;
  activeClass: string;
  onStudentsUploaded: (students: Student[]) => void;
  onBulkDeleteClass: () => void;
  onAddStudent: (studentData: Partial<Student>) => void;
  deletedWeeks: string[];
  onRestoreWeek: (weekName: string) => void;
  onPermanentDeleteWeek: (weekName: string) => void;
  isInline?: boolean;
  onLogout?: () => void;
  teachers: Teacher[];
  onAddTeacher: (name: string, subject: 'ENG' | 'MATH') => Promise<void>;
  onDeleteTeacher: (id: number) => Promise<void>;
  authRole?: string | null;
}

const getClassGroupLocal = (clsName: string): string => {
  const trimmed = clsName?.toString().trim() || '';
  const match = trimmed.match(/^(\d+)/);
  return match ? `${match[1]}-Sinf` : trimmed;
};

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeSubject,
  onSubjectChange,
  isAdminMode,
  onToggleAdmin,
  students,
  deletedStudents,
  onRestoreStudent,
  onPermanentDeleteStudent,
  activeClass,
  onStudentsUploaded,
  onBulkDeleteClass,
  onAddStudent,
  deletedWeeks,
  onRestoreWeek,
  onPermanentDeleteWeek,
  isInline = false,
  onLogout,
  teachers,
  onAddTeacher,
  onDeleteTeacher,
  authRole
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'settings' | 'news' | 'teachers' | 'trash'>(() => {
    return authRole === 'publish' ? 'news' : 'settings';
  });

  // CSV and Student Upload states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newsImageInputRef = useRef<HTMLInputElement>(null);

  // News and Events states
  const [newsEvents, setNewsEvents] = useState<any[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsMessage, setNewsMessage] = useState('');
  const [newsDate, setNewsDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
  });
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(() => {
    const future = new Date();
    future.setHours(future.getHours() + 24);
    return future.toISOString().slice(0, 16);
  });
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newsLabel, setNewsLabel] = useState('E\'lon');
  const [uploadedPics, setUploadedPics] = useState<string[]>([]);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [newsType, setNewsType] = useState<'news' | 'event' | 'reminder'>('news');
  const [deleteNewsId, setDeleteNewsId] = useState<number | null>(null);

  // Teachers Form states
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState<'ENG' | 'MATH'>('ENG');
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);

  // Group deleted students by class
  const groupedDeleted = useMemo(() => {
    const groups: Record<string, Student[]> = {};
    deletedStudents.forEach(s => {
      const cls = s.className || 'Boshqa';
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(s);
    });
    return groups;
  }, [deletedStudents]);

  // Normalize level helper
  const normalizeLevel = (raw: string): string => {
    const trimmed = raw?.toString().trim() || '';
    if (!trimmed) return '';
    if (/^level\s*\d+$/i.test(trimmed)) {
      const num = trimmed.match(/\d+/)?.[0];
      return `Level ${num}`;
    }
    if (/^\d+$/.test(trimmed)) return `Level ${trimmed}`;
    return trimmed;
  };

  // Fetch News and Events
  const fetchNewsEvents = async () => {
    setIsNewsLoading(true);
    try {
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .order('date', { ascending: false });
      
      if (!error && data) {
        setNewsEvents(data);
      } else {
        console.error('Error fetching news:', error);
      }
    } catch (e) {
      console.error('Exception fetching news:', e);
    } finally {
      setIsNewsLoading(false);
    }
  };

  // Sync news when drawer opens or tab changes
  useEffect(() => {
    if (isOpen) {
      fetchNewsEvents();
    }
  }, [isOpen, activeTab]);

  // Handle student CSV file uploads
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadStatus({ 
        type: 'error', 
        message: '⚠️ Iltimos, faqat .CSV faylini yuklang. Agar namunani Google Sheets yoki Excel\'da ochgan bo\'lsangiz, uni birinchi bo\'lib CSV formatida yuklab oling.' 
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedStudents: Student[] = (results.data as any[])
          .map((row: any) => {
            const rawNameStr = (
              row['O\'quvchining ismi va familiyasi'] || 
              row['Ism va familiya'] || 
              row['Students name surname'] || 
              row['Name'] || 
              row['name'] || ''
            ).toString().trim();
            
            const nameParts = rawNameStr.split(' ').filter(Boolean);
            let name = '';
            let surname = '';

            if (nameParts.length > 1) {
              surname = nameParts.pop() || '';
              name = nameParts.join(' ');
            } else {
              name = rawNameStr;
            }

            const className = (
              row['sinf'] || 
              row['Sinf'] || 
              row['class'] || 
              row['Class'] || 
              row['className'] || '5A'
            ).toString().trim().toUpperCase();

            const dateJoined = (
              row['qabul qilingan sana'] || 
              row['Qabul qilingan sana'] || 
              row['when'] || 
              row['When'] || 
              row['date joined'] || 'Sentyabr 2024'
            ).toString().trim();

            const parseImportScore = (val: any): number | null => {
              if (val === undefined || val === null) return null;
              const s = val.toString().trim();
              if (s === '' || s === '-') return null;
              const p = parseInt(s);
              return isNaN(p) ? null : p;
            };

            // Initialize all fields to defaults
            let finalEngStarting = 'Level 1';
            let finalEngCurrent = 'Level 1';
            let finalEngTests: { name: string; score: number | null }[] | undefined = undefined;
            let teacherName: string | undefined = undefined;

            let finalMathStarting = 'Level 1';
            let finalMathCurrent = 'Level 1';
            let finalMathTests: { name: string; score: number | null }[] | undefined = undefined;
            let mathTeacherName: string | undefined = undefined;

            let engScore = 0;
            let mathScore = 0;
            let attendance = 1;
            let homework = 1;
            let parentPhone = '';
            let customId = '';
            let customPasscode = '';

            if (activeSubject === 'ENG') {
              const term1 = row['Grant 1 eng'] || row['Grant 1 ENG'] || row['grant 1 eng'] || row['Grant 1'] || row['grant 1'] || row['1-chorak natijasi'] || row['1-chorak'] || row['term 1 score'] || '';
              const term2 = row['Grant 2 eng'] || row['Grant 2 ENG'] || row['grant 2 eng'] || row['Grant 2'] || row['grant 2'] || row['2-chorak natijasi'] || row['2-chorak'] || row['term 2 score'] || '';
              const term3 = row['Grant 3 eng'] || row['Grant 3 ENG'] || row['grant 3 eng'] || row['Grant 3'] || row['grant 3'] || row['3-chorak natijasi'] || row['3-chorak'] || row['term 3 score'] || '';
              const term4 = row['Grant 4 eng'] || row['Grant 4 ENG'] || row['grant 4 eng'] || row['Grant 4'] || row['grant 4'] || row['4-chorak natijasi'] || row['4-chorak'] || row['term 4 score'] || '';

              const hasAnyEngScore = [term1, term2, term3, term4].some(val => val !== undefined && val !== null && val.toString().trim() !== '');
              finalEngTests = hasAnyEngScore ? [
                { name: 'Grant 1', score: parseImportScore(term1) },
                { name: 'Grant 2', score: parseImportScore(term2) },
                { name: 'Grant 3', score: parseImportScore(term3) },
                { name: 'Grant 4', score: parseImportScore(term4) }
              ] : [];

              const rawEngStarting = row['boshlang\'ich daraja eng'] || row['Boshlang\'ich daraja eng'] || row['StartingLevelENG'] || row['boshlang\'ich daraja'] || row['Boshlang\'ich daraja'] || row['avvalgi daraja'] || row['Avvalgi daraja'] || row['initial level'] || row['initial level eng'] || row['Level'] || row['level'] || row['StartingLevel'] || '';
              const rawEngCurrent = row['hozirgi daraja eng'] || row['Hozirgi daraja eng'] || row['CurrentLevelENG'] || row['hozirgi daraja'] || row['Hozirgi daraja'] || row['current level'] || row['CurrentLevel'] || row['currentLevel'] || row['current level eng'] || '';

              finalEngStarting = normalizeLevel(rawEngStarting) || 'Level 1';
              finalEngCurrent = normalizeLevel(rawEngCurrent) || 'Level 1';
              
              const rawT = row['O\'qituvchi'] || row['o\'qituvchi'] || row['teacher'] || row['Teacher'] || '';
              if (rawT.toString().trim()) {
                teacherName = rawT.toString().trim();
              }
            } else if (activeSubject === 'MATH') {
              const mTerm1 = row['Grant 1 math'] || row['Grant 1 MATH'] || row['grant 1 math'] || row['1-chorak matematika'] || row['math term 1 score'] || '';
              const mTerm2 = row['Grant 2 math'] || row['Grant 2 MATH'] || row['grant 2 math'] || row['2-chorak matematika'] || row['math term 2 score'] || '';
              const mTerm3 = row['Grant 3 math'] || row['Grant 3 MATH'] || row['grant 3 math'] || row['3-chorak matematika'] || row['math term 3 score'] || '';
              const mTerm4 = row['Grant 4 math'] || row['Grant 4 MATH'] || row['grant 4 math'] || row['4-chorak matematika'] || row['math term 4 score'] || '';

              const hasAnyMathScore = [mTerm1, mTerm2, mTerm3, mTerm4].some(val => val !== undefined && val !== null && val.toString().trim() !== '');
              finalMathTests = hasAnyMathScore ? [
                { name: 'Grant 1', score: parseImportScore(mTerm1) },
                { name: 'Grant 2', score: parseImportScore(mTerm2) },
                { name: 'Grant 3', score: parseImportScore(mTerm3) },
                { name: 'Grant 4', score: parseImportScore(mTerm4) }
              ] : [];

              const rawMathStarting = row['boshlang\'ich daraja math'] || row['Boshlang\'ich daraja math'] || row['StartingLevelMATH'] || row['initial level math'] || row['avvalgi daraja math'] || row['Avvalgi daraja math'] || '';
              const rawMathCurrent = row['hozirgi daraja math'] || row['Hozirgi daraja math'] || row['CurrentLevelMATH'] || row['current level math'] || '';

              finalMathStarting = normalizeLevel(rawMathStarting) || 'Level 1';
              finalMathCurrent = normalizeLevel(rawMathCurrent) || 'Level 1';

              const rawT = row['O\'qituvchi'] || row['o\'qituvchi'] || row['teacher'] || row['Teacher'] || '';
              if (rawT.toString().trim()) {
                mathTeacherName = rawT.toString().trim();
              }
            } else if (activeSubject === 'DETAILS') {
              const rawPhone = row['Ota-ona telefon raqami'] || row['Phone number'] || row['phone'] || row['parent phone'] || row['Phone'] || '';
              parentPhone = rawPhone.toString().trim();
              if (parentPhone && !parentPhone.startsWith('+')) {
                if (parentPhone.startsWith('998')) parentPhone = '+' + parentPhone;
                else if (parentPhone.length === 9) parentPhone = '+998' + parentPhone;
              }

              const rawId = row['ID'] || row['id'] || row['Id'] || row['O\'quvchi ID'] || '';
              customId = rawId.toString().trim();

              const rawPass = row['Passcode'] || row['passcode'] || row['Parol'] || row['parol'] || '';
              customPasscode = rawPass.toString().trim();
            } else if (activeSubject === 'ALL') {
              const rawEngScore = row['Eng score'] || row['English score'] || row['eng_score'] || row['eng score'] || '';
              engScore = rawEngScore !== '' ? Math.min(15, Math.max(0, parseInt(rawEngScore) || 0)) : 0;

              const rawMathScore = row['Math score'] || row['math_score'] || row['math score'] || '';
              mathScore = rawMathScore !== '' ? Math.min(15, Math.max(0, parseInt(rawMathScore) || 0)) : 0;

              const rawAttendance = row['Attendance'] || row['attendance'] || '';
              attendance = rawAttendance !== '' ? parseInt(rawAttendance) || 1 : 1;

              const rawHomework = row['Homework'] || row['homework'] || '';
              homework = rawHomework !== '' ? parseInt(rawHomework) || 1 : 1;
            }

            return {
              id: customId || generateRandomId(),
              name,
              surname,
              className,
              dateJoined,
              startingLevel: finalEngStarting,
              currentLevel: finalEngCurrent,
              grandTests: finalEngTests,
              teacher: teacherName,
              mathStartingLevel: finalMathStarting,
              mathCurrentLevel: finalMathCurrent,
              mathGrandTests: finalMathTests,
              mathTeacher: mathTeacherName,
              engScore,
              mathScore,
              attendance,
              homework,
              parentPhone,
              passcode: customPasscode,
              pictureUrl: row['PictureUrl'] || row['pictureUrl'] || '',
            };
          })
          .filter((s: Student) => s.name.trim() !== '' || s.surname.trim() !== '');

        if (parsedStudents.length === 0) {
          setUploadStatus({ type: 'error', message: '❌ Yaroqli o\'quvchilar topilmadi. Faylingiz namunadagi kabi ustun nomlariga ega ekanligini tekshiring.' });
          return;
        }

        onStudentsUploaded(parsedStudents);
        setUploadStatus({ type: 'success', message: `✅ ${parsedStudents.length} ta o'quvchi muvaffaqiyatli yuklandi!` });
        setTimeout(() => setIsCsvModalOpen(false), 1500);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setUploadStatus({ type: 'error', message: '❌ Faylni o\'qib bo\'lmadi. Bu .CSV formatidagi fayl ekanligini tekshiring.' });
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    if (activeSubject === 'ALL') {
      const headers = [
        "O'quvchining ismi va familiyasi",
        "sinf",
        "Eng score",
        "Math score",
        "Attendance",
        "Homework"
      ].join(",");

      const row1 = [
        "Yodgorov Axmadjon",
        "5A",
        "14",
        "11",
        "1",
        "1"
      ].join(",");

      const row2 = [
        "Salohiddinov Otabek",
        "5B",
        "8",
        "10",
        "-1",
        "-2"
      ].join(",");

      const csvContent = headers + "\n" + row1 + "\n" + row2;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "o_quvchilar_all_namuna.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (activeSubject === 'ENG') {
      const headers = [
        "O'quvchining ismi va familiyasi",
        "sinf",
        "boshlang'ich daraja eng",
        "hozirgi daraja eng",
        "O'qituvchi",
        "Grant 1 eng",
        "Grant 2 eng",
        "Grant 3 eng",
        "Grant 4 eng"
      ].join(",");

      const row1 = [
        "Yodgorov Axmadjon",
        "5A",
        "1",
        "5",
        "Aliyev Vali",
        "70", "72", "90", "67"
      ].join(",");

      const row2 = [
        "Salohiddinov Otabek",
        "5B",
        "3",
        "5",
        "Karimova Laylo",
        "55", "40", "68", "90"
      ].join(",");

      const csvContent = headers + "\n" + row1 + "\n" + row2;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "o_quvchilar_english_namuna.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (activeSubject === 'MATH') {
      const headers = [
        "O'quvchining ismi va familiyasi",
        "sinf",
        "boshlang'ich daraja math",
        "hozirgi daraja math",
        "O'qituvchi",
        "Grant 1 math",
        "Grant 2 math",
        "Grant 3 math",
        "Grant 4 math"
      ].join(",");

      const row1 = [
        "Yodgorov Axmadjon",
        "5A",
        "2",
        "4",
        "Toshmatov Dilshod",
        "60", "68", "75", "82"
      ].join(",");

      const row2 = [
        "Salohiddinov Otabek",
        "5B",
        "1",
        "3",
        "Sodiqov Jasur",
        "45", "55", "62", "70"
      ].join(",");

      const csvContent = headers + "\n" + row1 + "\n" + row2;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "o_quvchilar_math_namuna.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (activeSubject === 'DETAILS') {
      const headers = [
        "O'quvchining ismi va familiyasi",
        "sinf",
        "Ota-ona telefon raqami",
        "ID",
        "Passcode"
      ].join(",");

      const row1 = [
        "Yodgorov Axmadjon",
        "5A",
        "+998901234567",
        "AL557",
        "1234567"
      ].join(",");

      const row2 = [
        "Salohiddinov Otabek",
        "5B",
        "+998907654321",
        "AL231",
        "7654321"
      ].join(",");

      const csvContent = headers + "\n" + row1 + "\n" + row2;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "o_quvchilar_tafsilotlar_namuna.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  };

  // News Images Upload and Compression helper
  const handleNewsPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 500; // Optimal size for mobile app fetching
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compresses to 70% quality JPEG
          setUploadedPics(prev => [...prev, dataUrl]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    if (newsImageInputRef.current) newsImageInputRef.current.value = '';
  };

  // Remove photo from draft
  const removeDraftPhoto = (index: number) => {
    setUploadedPics(prev => prev.filter((_, i) => i !== index));
  };

  // Submit News/Event
  const handleSubmitNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsMessage.trim()) return;

    setIsSubmittingNews(true);
    try {
      const newsItem = {
        title: newsTitle.trim(),
        message: newsMessage.trim(),
        date: new Date(newsDate).toISOString(),
        scheduled_for: isScheduled ? new Date(scheduledFor).toISOString() : null,
        urgency: urgency,
        label: newsType === 'reminder' ? 'Eslatma' : newsLabel.trim(),
        picture_urls: newsType === 'reminder' ? [] : uploadedPics,
        type: newsType
      };

      const { error } = await supabase
        .from('news_events')
        .insert([newsItem]);

      if (error) {
        throw error;
      }

      // Reset Form and Refetch
      setNewsTitle('');
      setNewsMessage('');
      setNewsDate(new Date().toISOString().slice(0, 16));
      setIsScheduled(false);
      setUrgency('medium');
      setNewsLabel('E\'lon');
      setUploadedPics([]);
      setNewsType('news');
      setIsFormOpen(false);
      fetchNewsEvents();
    } catch (err) {
      console.error('Error saving news event:', err);
    } finally {
      setIsSubmittingNews(false);
    }
  };

  // Delete News/Event
  const handleDeleteNews = (id: number) => {
    setDeleteNewsId(id);
  };

  const performDeleteNews = async (id: number) => {
    try {
      const { error } = await supabase
        .from('news_events')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchNewsEvents();
      } else {
        console.error('Error deleting news:', error);
      }
    } catch (e) {
      console.error('Exception deleting news:', e);
    }
  };

  const getUrgencyBadgeColor = (val: string) => {
    switch (val) {
      case 'low': return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
      case 'high': return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' };
      case 'critical': return { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' };
      case 'medium':
      default:
        return { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' };
    }
  };

  return (
    <>
      {/* Dark Overlay backdrop */}
      {!isInline && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999,
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? 'visible' : 'hidden',
            transition: 'all 0.30s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      )}

      {/* Slide-in Drawer Container */}
      <div
        style={{
          position: isInline ? 'relative' : 'fixed',
          top: isInline ? undefined : 0,
          right: isInline ? undefined : 0,
          bottom: isInline ? undefined : 0,
          width: '100%',
          maxWidth: isInline ? 'none' : '410px',
          boxSizing: 'border-box',
          background: '#fcfcf9',
          boxShadow: isInline ? 'none' : '-10px 0 40px -10px rgba(15, 23, 42, 0.08)',
          zIndex: isInline ? 1 : 1000,
          transform: isInline ? 'none' : (isOpen ? 'translateX(0)' : 'translateX(100%)'),
          transition: isInline ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: isInline ? 'none' : '1px solid #e5e7eb',
          minHeight: isInline ? 'calc(100vh - 120px)' : undefined
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '1.75rem 1.5rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(229, 231, 235, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={18} color="var(--accent-primary)" strokeWidth={2.5} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: 0, letterSpacing: '0.02em' }}>
              BOSHQARUV PANELI
            </h2>
          </div>
          {!isInline && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Tabs Selector */}
        {authRole !== 'admin123' && (
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '0.25rem',
            margin: '0 1.5rem 1rem',
            border: '1px solid #e2e8f0',
            flexShrink: 0
          }}>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                flex: 1,
                background: activeTab === 'settings' ? '#ffffff' : 'transparent',
                color: activeTab === 'settings' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 0.25rem',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: activeTab === 'settings' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              SOZLAMALAR
            </button>
            <button
              onClick={() => setActiveTab('news')}
              style={{
                flex: 1,
                background: activeTab === 'news' ? '#ffffff' : 'transparent',
                color: activeTab === 'news' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 0.25rem',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: activeTab === 'news' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              YANGILIKLAR
            </button>
            {isAdminMode && (
              <button
                onClick={() => setActiveTab('teachers')}
                style={{
                  flex: 1,
                  background: activeTab === 'teachers' ? '#ffffff' : 'transparent',
                  color: activeTab === 'teachers' ? '#0f172a' : '#64748b',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: activeTab === 'teachers' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                O'QITUVCHILAR
              </button>
            )}
            {isAdminMode && (
              <button
                onClick={() => setActiveTab('trash')}
                style={{
                  flex: 1,
                  background: activeTab === 'trash' ? '#ffffff' : 'transparent',
                  color: activeTab === 'trash' ? '#0f172a' : '#64748b',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: activeTab === 'trash' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                SAVAT ({deletedStudents.length + deletedWeeks.length})
              </button>
            )}
          </div>
        )}

        {/* Drawer Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>
          
          {/* TAB 1: System Settings */}
          {activeTab === 'settings' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              {/* Section 1: Subject Select */}
              <div style={{ marginBottom: '2rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  FAOL FAN KO'RINISHI
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {(() => {
                    const subjects = [
                      { id: 'ENG', title: 'Ingliz Tili', desc: 'Sinflarning darajalari va grand testlari', color: '#166534', bg: '#f0fdf4' },
                      { id: 'MATH', title: 'Matematika', desc: 'Matematika darajalari va grand testlari', color: '#0d9488', bg: '#f0fdfa' },
                      { id: 'ALL', title: 'Haftalik Tahlil', desc: 'Foizlarda natijalar, davomat va vazifalar', color: '#4f46e5', bg: '#e0e7ff' },
                      { id: 'DETAILS', title: 'Tafsilotlar', desc: "O'quvchi ID raqamlari, parollari va telefon raqamlari", color: '#db2777', bg: '#fdf2f8' }
                    ];
                    return subjects;
                  })().map(subj => {
                    const isSelected = activeSubject === subj.id;
                    return (
                      <button
                        key={subj.id}
                        onClick={() => onSubjectChange(subj.id as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          width: '100%',
                          padding: '0.9rem 1.1rem',
                          borderRadius: '16px',
                          background: isSelected ? subj.bg : '#ffffff',
                          border: isSelected ? `2.2px solid ${subj.color}` : '1.5px solid #e2e8f0',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isSelected ? '0 4px 12px -3px rgba(0,0,0,0.04)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = subj.color;
                            e.currentTarget.style.background = `${subj.bg}20`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.background = '#ffffff';
                          }
                        }}
                      >
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: subj.color,
                          flexShrink: 0
                        }} />
                        <div>
                          <div style={{ fontWeight: 850, fontSize: '0.8rem', color: isSelected ? subj.color : '#334155', letterSpacing: '0.02em' }}>
                            {subj.title.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                            {subj.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Admin Mode Toggle */}
              {authRole !== 'publish' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e293b', letterSpacing: '0.01em' }}>
                        ADMIN REJIMI
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem', maxWidth: '240px', lineHeight: 1.4 }}>
                        O'quvchi qo'shish, o'chirish va tahrirlash imkoniyatlari
                      </div>
                    </div>
                    <button 
                      onClick={onToggleAdmin}
                      style={{
                        width: '46px',
                        height: '24px',
                        borderRadius: '9999px',
                        background: isAdminMode ? 'var(--accent-primary)' : '#cbd5e1',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        padding: 0,
                        transition: 'background-color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        left: isAdminMode ? '24px' : '4px',
                        transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                      }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Section 3: Admin Actions */}
              {isAdminMode && (
                <div style={{ 
                  marginTop: '2rem', 
                  animation: 'fadeIn 0.25s ease-out',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem'
                }}>
                  <div style={{ height: '1px', background: '#e2e8f0', margin: '0' }} />
                  
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                      ADMIN AMALLARI
                    </div>
                    
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '0.9rem 1.1rem',
                      marginBottom: '1.25rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
                    }}>
                      {(() => {
                        const activeClassCount = students.filter(s => getClassGroupLocal(s.className) === activeClass).length;
                        return (
                          <>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Faol sinf ({activeClass}):</span>
                              <strong style={{ color: '#0f172a' }}>{activeClassCount} ta</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                              <span>Jami o'quvchilar:</span>
                              <strong style={{ color: '#0f172a' }}>{students.length} ta</strong>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activeSubject !== 'ALL' && (
                        <button
                          onClick={() => setIsAddStudentOpen(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            width: '100%',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                            background: '#ffffff',
                            color: 'var(--accent-primary)',
                            border: '1.5px solid var(--accent-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent-primary)';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.color = 'var(--accent-primary)';
                          }}
                        >
                          <UserPlus size={15} />
                          <span>YANGI O'QUVCHI QO'SHISH</span>
                        </button>
                      )}

                      <button
                        onClick={() => { setUploadStatus(null); setIsCsvModalOpen(true); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          padding: '0.75rem 1.25rem',
                          borderRadius: '12px',
                          background: 'var(--accent-primary)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                          e.currentTarget.style.transform = 'translateY(-0.5px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <UploadCloud size={15} />
                        <span>GURUHLI YUKLASH (CSV)</span>
                      </button>

                      {authRole !== 'admin123' && (
                        <button
                          onClick={onBulkDeleteClass}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            width: '100%',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1.5px solid #fca5a5',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            marginTop: '0.75rem'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fee2e2';
                            e.currentTarget.style.borderColor = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#fca5a5';
                          }}
                        >
                          <Trash2 size={15} />
                          <span>{activeClass} SINFINI O'CHIRISH</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4: Logout/Sign Out Button */}
              {onLogout && (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ height: '1px', background: '#e2e8f0', margin: '1.5rem 0' }} />
                  <button
                    onClick={onLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '16px',
                      background: '#fef2f2',
                      border: '1.5px solid #fee2e2',
                      color: '#ef4444',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.02)'
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
              )}
            </div>
          )}

          {/* TAB 2: News & Events management */}
          {activeTab === 'news' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out', marginTop: '0.5rem' }}>
              
              {/* Form Collapsible Toggle button */}
              <button
                onClick={() => setIsFormOpen(!isFormOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '14px',
                  background: isFormOpen ? 'var(--accent-primary)' : '#ffffff',
                  color: isFormOpen ? '#ffffff' : '#334155',
                  border: isFormOpen ? '1px solid transparent' : '1.5px solid #e2e8f0',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={16} />
                  <span>YANGILIK / TADBIR / ESLATMA QO'SHISH</span>
                </div>
                {isFormOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* Add News Collapsible Form */}
              {isFormOpen && (
                <form 
                  onSubmit={handleSubmitNews} 
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
                    animation: 'slideDown 0.2s ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  {/* Type Selector (Turi) */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                      TURI (TYPE)
                    </label>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {([{ key: 'news', label: 'Yangilik', icon: '📰' }, { key: 'event', label: 'Tadbir', icon: '🎉' }, { key: 'reminder', label: 'Eslatma', icon: '🔔' }] as const).map(opt => {
                        const isActive = newsType === opt.key;
                        return (
                          <button
                            type="button"
                            key={opt.key}
                            onClick={() => {
                              setNewsType(opt.key as 'news' | 'event' | 'reminder');
                              if (opt.key === 'reminder') {
                                setNewsLabel('Eslatma');
                                setUploadedPics([]);
                              } else if (newsLabel === 'Eslatma') {
                                setNewsLabel('E\'lon');
                              }
                            }}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.3rem',
                              padding: '0.55rem 0.5rem',
                              borderRadius: '10px',
                              background: isActive ? (opt.key === 'reminder' ? '#fffbeb' : opt.key === 'event' ? '#f0fdf4' : '#eff6ff') : '#ffffff',
                              color: isActive ? (opt.key === 'reminder' ? '#92400e' : opt.key === 'event' ? '#166534' : '#1d4ed8') : '#64748b',
                              border: isActive ? `2px solid ${opt.key === 'reminder' ? '#f59e0b' : opt.key === 'event' ? '#22c55e' : '#3b82f6'}` : '1.5px solid #e2e8f0',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <span>{opt.icon}</span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category Label Input — hidden for reminders */}
                  {newsType !== 'reminder' && (
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Tag size={12} />
                      KATEGORIYA (LABEL)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Masalan: E'lon, Tadbir, Bayram, Imtihon..." 
                      value={newsLabel}
                      onChange={(e) => setNewsLabel(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        outline: 'none',
                      }}
                    />
                    {/* Quick Labels suggestions */}
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      {['E\'lon', 'Tadbir', 'Bayram', 'Imtihon', 'Sport'].map(item => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => setNewsLabel(item)}
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Date Input */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Calendar size={12} />
                      SANA VA VAQT
                    </label>
                    <input 
                      type="datetime-local" 
                      value={newsDate}
                      onChange={(e) => setNewsDate(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Scheduled Release Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={12} />
                        KESHIKTIRILGAN NASHR
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsScheduled(!isScheduled)}
                        style={{
                          width: '38px',
                          height: '20px',
                          borderRadius: '9999px',
                          background: isScheduled ? 'var(--accent-primary)' : '#cbd5e1',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: 0,
                          transition: 'background-color 0.2s ease',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          position: 'absolute',
                          left: isScheduled ? '20px' : '4px',
                          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }} />
                      </button>
                    </div>

                    {isScheduled && (
                      <div style={{ marginTop: '0.5rem', animation: 'fadeIn 0.2s' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                          ILOVADA NASHR QILISH SANASI:
                        </label>
                        <input 
                          type="datetime-local" 
                          value={scheduledFor}
                          onChange={(e) => setScheduledFor(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: '1.5px solid #e2e8f0',
                            fontSize: '0.78rem',
                            color: '#0f172a',
                            outline: 'none',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Urgency Selector */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <AlertCircle size={12} />
                      URGENCY (FAVQULODDALIK)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.35rem' }}>
                      {(['low', 'medium', 'high', 'critical'] as const).map(level => {
                        const isChosen = urgency === level;
                        const colors = getUrgencyBadgeColor(level);
                        const labelUz = level === 'low' ? 'Past' :
                                        level === 'medium' ? 'O\'rta' :
                                        level === 'high' ? 'Yuqori' : 'Jiddiy';
                        return (
                          <button
                            type="button"
                            key={level}
                            onClick={() => setUrgency(level)}
                            style={{
                              background: isChosen ? colors.bg : '#ffffff',
                              color: isChosen ? colors.text : '#64748b',
                              border: isChosen ? `2px solid ${colors.dot}` : '1.5px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '0.45rem 0.25rem',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.dot }} />
                            {labelUz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* News Title */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                      TITLE (SARLAVHA)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Yangilik sarlavhasini kiriting..." 
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* News Message (Body text) */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                      MESSAGE (ASOSIY MATN)
                    </label>
                    <textarea 
                      placeholder="Yangilik yoki tadbir matnini yozing..." 
                      value={newsMessage}
                      onChange={(e) => setNewsMessage(e.target.value)}
                      required
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: 1.4
                      }}
                    />
                  </div>

                  {/* Pictures Upload Area — hidden for reminders */}
                  {newsType !== 'reminder' && (
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <ImageIcon size={12} />
                      RASMLARNI YUKLASH
                    </label>
                    
                    {/* Draft images previews */}
                    {uploadedPics.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                        {uploadedPics.map((pic, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              position: 'relative', width: '56px', height: '56px', 
                              borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' 
                            }}
                          >
                            <img src={pic} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => removeDraftPhoto(idx)}
                              style={{
                                position: 'absolute', top: '2px', right: '2px',
                                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                                width: '16px', height: '16px', color: '#ffffff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', padding: 0
                              }}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => newsImageInputRef.current?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        width: '100%', padding: '0.6rem', border: '2px dashed #cbd5e1', borderRadius: '10px',
                        background: '#f8fafc', color: '#64748b', fontSize: '0.78rem', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                    >
                      <UploadCloud size={16} />
                      <span>Rasm tanlash (bir nechta mumkin)</span>
                    </button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      ref={newsImageInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleNewsPhotoUpload}
                    />
                  </div>
                  )}

                  {/* Reminder Mock Preview */}
                  {newsType === 'reminder' && (newsTitle.trim() || newsMessage.trim()) && (
                    <div style={{
                      background: '#fffbeb',
                      border: '1.5px solid #fbbf24',
                      borderRadius: '14px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#92400e', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Eye size={10} />
                        ILOVADAGI KO'RINISHI (PREVIEW)
                      </div>
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '1rem',
                        boxShadow: '0 4px 20px -4px rgba(0,0,0,0.12)',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.6rem',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Bell size={18} color="#ffffff" />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                          {newsTitle.trim() || 'Sarlavha...'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
                          {newsMessage.trim() || 'Xabar matni...'}
                        </div>
                        <div style={{
                          background: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.4rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          marginTop: '0.25rem'
                        }}>
                          OK
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      style={{
                        padding: '0.65rem', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                        background: '#ffffff', color: '#64748b', fontSize: '0.8rem', fontWeight: 800,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                    >
                      BEKOR QILISH
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingNews}
                      style={{
                        padding: '0.65rem', border: 'none', borderRadius: '10px',
                        background: 'var(--accent-primary)', color: '#ffffff', fontSize: '0.8rem', fontWeight: 800,
                        cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                        opacity: isSubmittingNews ? 0.7 : 1
                      }}
                    >
                      <Send size={14} />
                      <span>{isSubmittingNews ? 'YUKLANMOQDA...' : 'SAQLASH'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* News & Events list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Eye size={12} />
                  ILOVADAGI YANGILIKLAR ({newsEvents.length} ta)
                </div>

                {isNewsLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b', fontSize: '0.8rem' }}>
                    Yangiliklar yuklanmoqda...
                  </div>
                ) : newsEvents.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', padding: '2.5rem 1rem', border: '1.5px dashed #cbd5e1', 
                    borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5 
                  }}>
                    Yangiliklar mavjud emas.<br />Mobil ilovada ko'rsatish uchun birinchi yangilikni yuklang!
                  </div>
                ) : (
                  newsEvents.map(item => {
                    const colors = getUrgencyBadgeColor(item.urgency);
                    const formattedDate = new Date(item.date).toLocaleDateString('uz-UZ', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    const urgencyLabelUz = item.urgency === 'low' ? 'Past' :
                                           item.urgency === 'medium' ? 'O\'rta' :
                                           item.urgency === 'high' ? 'Yuqori' :
                                           item.urgency === 'critical' ? 'Jiddiy' : item.urgency;
                    
                    const isReminder = item.type === 'reminder';
                    const isEvent = item.type === 'event';

                    return (
                      <div 
                        key={item.id}
                        style={{
                          background: isReminder ? '#fffbeb' : '#ffffff',
                          border: isReminder ? '1px solid #fde68a' : '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '1rem',
                          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.01)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          position: 'relative'
                        }}
                      >
                        {/* Header Badges row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            {/* Type Badge */}
                            <span style={{
                              background: isReminder ? '#fef3c7' : isEvent ? '#dcfce7' : '#f1f5f9',
                              color: isReminder ? '#92400e' : isEvent ? '#166534' : '#475569',
                              padding: '0.2rem 0.5rem', borderRadius: '6px',
                              fontSize: '0.62rem', fontWeight: 800,
                              display: 'flex', alignItems: 'center', gap: '0.2rem'
                            }}>
                              {isReminder ? <Bell size={9} /> : null}
                              {isReminder ? 'Eslatma' : isEvent ? 'Tadbir' : item.label}
                            </span>
                            {/* Urgency Badge */}
                            <span style={{
                              background: colors.bg, color: colors.text,
                              padding: '0.2rem 0.5rem', borderRadius: '6px',
                              fontSize: '0.62rem', fontWeight: 800,
                              display: 'flex', alignItems: 'center', gap: '0.25rem'
                            }}>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: colors.dot }} />
                              {urgencyLabelUz}
                            </span>
                          </div>

                          {/* Delete News item Button */}
                          <button
                            onClick={() => handleDeleteNews(item.id)}
                            style={{
                              background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer',
                              padding: '0.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Title and Date */}
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {isReminder && <Bell size={14} color="#f59e0b" />}
                            {item.title}
                          </h3>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                            <Calendar size={10} />
                            {formattedDate}
                            {item.scheduled_for && (
                              <span style={{ color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                                · <Clock size={10} /> Prognoz: {new Date(item.scheduled_for).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description Message */}
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                          {item.message}
                        </p>

                        {/* Pictures Carousel/Grid Row — only for news/events, not reminders */}
                        {!isReminder && item.picture_urls && item.picture_urls.length > 0 && (
                          <div 
                            style={{ 
                              display: 'flex', gap: '0.35rem', overflowX: 'auto', 
                              paddingBottom: '0.2rem', marginTop: '0.2rem'
                            }}
                            className="custom-scrollbar"
                          >
                            {item.picture_urls.map((url: string, index: number) => (
                              <div 
                                key={index} 
                                style={{ 
                                  width: '64px', height: '64px', borderRadius: '8px', 
                                  overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' 
                                }}
                              >
                                <img src={url} alt={`News pic ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Logout button for publish admin since they have no settings tab */}
              {authRole === 'publish' && onLogout && (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ height: '1px', background: '#e2e8f0', margin: '1.5rem 0' }} />
                  <button
                    onClick={onLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '16px',
                      background: '#fef2f2',
                      border: '1.5px solid #fee2e2',
                      color: '#ef4444',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.02)'
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
              )}
            </div>
          )}

          {/* TAB: Teachers / O'qituvchilar */}
          {activeTab === 'teachers' && isAdminMode && (
            <div style={{ animation: 'fadeIn 0.2s ease-out', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Form to Add Teacher */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newTeacherName.trim()) return;
                  setIsAddingTeacher(true);
                  try {
                    await onAddTeacher(newTeacherName.trim(), newTeacherSubject);
                    setNewTeacherName('');
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsAddingTeacher(false);
                  }
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em' }}>
                  YANGI O'QITUVCHI QO'SHISH
                </div>
                
                <div>
                  <label htmlFor="teacher-name" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    O'QITUVCHI ISMI VA FAMILIYASI
                  </label>
                  <input
                    id="teacher-name"
                    type="text"
                    required
                    placeholder="Ism va familiya..."
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    disabled={isAddingTeacher}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      color: '#0f172a',
                      background: '#f8fafc',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.background = '#ffffff';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="teacher-subject" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    MUTAXASSISLIK FANI
                  </label>
                  <select
                    id="teacher-subject"
                    value={newTeacherSubject}
                    onChange={(e) => setNewTeacherSubject(e.target.value as 'ENG' | 'MATH')}
                    disabled={isAddingTeacher}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      color: '#0f172a',
                      background: '#f8fafc',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1em'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.background = '#ffffff';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }}
                  >
                    <option value="ENG">Ingliz Tili (English)</option>
                    <option value="MATH">Matematika (Math)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAddingTeacher}
                  style={{
                    width: '100%',
                    background: 'var(--accent-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: isAddingTeacher ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.05em',
                    marginTop: '0.25rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isAddingTeacher) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                >
                  {isAddingTeacher ? 'QO\'SHILMOQDA...' : 'O\'QITUVCHINI QO\'SHISH'}
                </button>
              </form>

              {/* Teachers List Grouped by Subject */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* English Teachers */}
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#166534', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#166534' }} />
                    INGLIZ TILI O'QITUVCHILARI ({teachers.filter(t => t.subject === 'ENG').length} ta)
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {teachers.filter(t => t.subject === 'ENG').length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        Ro'yxat bo'sh
                      </div>
                    ) : (
                      teachers.filter(t => t.subject === 'ENG').map(teacher => (
                        <div 
                          key={teacher.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '0.65rem 0.85rem',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                          }}
                        >
                          <span style={{ fontSize: '0.82rem', fontWeight: 650, color: '#1f2937' }}>{teacher.name}</span>
                          <button
                            onClick={() => {
                              if (window.confirm(`Haqiqatan ham ${teacher.name}ni o'chirishni xohlaysizmi?`)) {
                                onDeleteTeacher(teacher.id);
                              }
                            }}
                            style={{
                              background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2',
                              borderRadius: '8px', padding: '0.3rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Math Teachers */}
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0d9488', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0d9488' }} />
                    MATEMATIKA O'QITUVCHILARI ({teachers.filter(t => t.subject === 'MATH').length} ta)
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {teachers.filter(t => t.subject === 'MATH').length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        Ro'yxat bo'sh
                      </div>
                    ) : (
                      teachers.filter(t => t.subject === 'MATH').map(teacher => (
                        <div 
                          key={teacher.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '0.65rem 0.85rem',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                          }}
                        >
                          <span style={{ fontSize: '0.82rem', fontWeight: 650, color: '#1f2937' }}>{teacher.name}</span>
                          <button
                            onClick={() => {
                              if (window.confirm(`Haqiqatan ham ${teacher.name}ni o'chirishni xohlaysizmi?`)) {
                                onDeleteTeacher(teacher.id);
                              }
                            }}
                            style={{
                              background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2',
                              borderRadius: '8px', padding: '0.3rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: Trash / Savat */}
          {activeTab === 'trash' && isAdminMode && (
            <div style={{ animation: 'fadeIn 0.2s ease-out', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                <Trash2 size={12} />
                SAVATDAGI O'QUVCHILAR ({deletedStudents.length} ta)
              </div>

              {deletedStudents.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', padding: '2.5rem 1rem', border: '1.5px dashed #cbd5e1', 
                  borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5 
                }}>
                  Savat bo'sh.<br />O'chirilgan o'quvchilar shu yerda paydo bo'ladi.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {Object.entries(groupedDeleted).map(([className, list]) => (
                    <div key={className} style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1rem',
                      boxShadow: '0 2px 4px rgba(15, 23, 42, 0.01)'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'var(--accent-primary)',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '0.5rem',
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {className} Guruhi ({list.length} ta)
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {list.map(s => (
                          <div key={s.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            fontSize: '0.8rem'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                {s.name} {s.surname}
                              </div>
                              {(s.teacher || s.mathTeacher) && (
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                  O'qituvchi: {s.teacher || s.mathTeacher}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => onRestoreStudent(s.id)}
                                style={{
                                  background: '#f0fdf4',
                                  color: '#166534',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '8px',
                                  padding: '0.35rem 0.7rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                              >
                                Tiklash
                              </button>
                              <button
                                type="button"
                                onClick={() => onPermanentDeleteStudent(s.id)}
                                style={{
                                  background: '#fef2f2',
                                  color: '#991b1b',
                                  border: '1px solid #fecaca',
                                  borderRadius: '8px',
                                  padding: '0.35rem 0.7rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                              >
                                O'chirish
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Deleted Weeks Section */}
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2rem', marginBottom: '1rem' }}>
                <Calendar size={12} />
                SAVATDAGI HAFTALAR ({deletedWeeks.length} ta)
              </div>

              {deletedWeeks.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', padding: '2.5rem 1rem', border: '1.5px dashed #cbd5e1', 
                  borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5 
                }}>
                  Savat bo'sh.<br />O'chirilgan haftalar shu yerda paydo bo'ladi.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deletedWeeks.map(weekName => (
                    <div key={weekName} style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1rem',
                      boxShadow: '0 2px 4px rgba(15, 23, 42, 0.01)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        {weekName}
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => onRestoreWeek(weekName)}
                          style={{
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                        >
                          Tiklash
                        </button>
                        <button
                          type="button"
                          onClick={() => onPermanentDeleteWeek(weekName)}
                          style={{
                            background: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fee2e2',
                            borderRadius: '8px',
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                        >
                          Butunlay o'chirish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Upload CSV Modal overlay */}
      {isCsvModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCsvModalOpen(false)} style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '24px', padding: '2rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 850 }}>O'quvchilarni guruhli yuklash</h2>
              <button 
                onClick={() => setIsCsvModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Sinf o'quvchilarini ommaviy CSV fayl orqali tizimga yuklang. To'g'ri ustunlar mos kelishi uchun quyidagi namunani yuklab oling.
            </p>

            <div style={{ 
              background: '#f0fdf4', border: '1px solid #bbf7d0', 
              borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1.25rem',
              fontSize: '0.8rem', color: '#166534', lineHeight: 1.5
            }}>
              <strong>⚠️ Diqqat:</strong> Yuklanadigan fayl faqat <strong>.CSV</strong> formatida bo'lishi shart.<br />
              Excel yoki Google Sheets da tahrirlab bo'lgach, <em>Vergul bilan ajratilgan qiymatlar (.csv)</em> sifatida yuklab oling.
            </div>

            <button 
              className="admin-btn" 
              style={{
                marginBottom: '1.5rem', width: '100%', justifyContent: 'center',
                background: '#ffffff', color: '#0d9488', border: '1.5px solid #0d9488',
                borderRadius: '12px', padding: '0.75rem 1.25rem', fontSize: '0.82rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdfa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
              onClick={downloadTemplate}
            >
              <Download size={16} />
              Namunaviy CSV faylini yuklab olish
            </button>

            {uploadStatus && (
              <div style={{
                padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '1.25rem',
                fontSize: '0.82rem', fontWeight: 600,
                background: uploadStatus.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: uploadStatus.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${uploadStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`
              }}>
                {uploadStatus.message}
              </div>
            )}

            <div 
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#fafaf9',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#fafaf9'; }}
            >
              <UploadCloud className="icon" size={32} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
              <div>
                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem', margin: 0 }}>Faylni tanlash uchun bosing</p>
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>yoki faylni sudrab bu yerga tashlang (.csv formatda)</p>
              </div>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal overlay */}
      <AddStudentModal 
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onAddStudent={onAddStudent}
        activeSubject={activeSubject}
        teachers={teachers}
      />

      <CustomDialog
        isOpen={deleteNewsId !== null}
        type="confirm"
        title="Yangilikni o'chirish"
        message="Ushbu e'lon yoki yangilikni o'chirmoqchimisiz? Uni qayta tiklab bo'lmaydi."
        confirmText="O'chirish"
        cancelText="Bekor qilish"
        danger={true}
        onConfirm={() => {
          if (deleteNewsId !== null) {
            performDeleteNews(deleteNewsId);
            setDeleteNewsId(null);
          }
        }}
        onClose={() => setDeleteNewsId(null)}
      />
    </>
  );
};

export default SidebarDrawer;
