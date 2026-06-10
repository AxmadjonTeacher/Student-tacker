import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UploadCloud, X, Download, Trash2, UserPlus, Settings, Users,
  Calendar, AlertCircle, Tag, Image as ImageIcon, Plus,
  ChevronDown, ChevronUp, Clock, Eye, Send, Bell, LogOut, Edit3,
  ArrowUpRight, CheckCircle2
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Student, ActiveSubject, Teacher } from '../types';
import AddStudentModal from './AddStudentModal';
import { supabase } from '../supabase';
import CustomDialog from './CustomDialog';
import { generateRandomId, normalizeStudentId } from '../utils/idGenerator';

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
  onBulkDeleteClass: (targetClass: string) => void;
  onAddStudent: (studentData: Partial<Student>) => void;
  deletedWeeks: string[];
  onRestoreWeek: (weekName: string) => void;
  onPermanentDeleteWeek: (weekName: string) => void;
  isInline?: boolean;
  onLogout?: () => void;
  teachers: Teacher[];
  onAddTeacher: (name: string, subject: 'ENG' | 'MATH', phone?: string) => Promise<void>;
  onDeleteTeacher: (id: number) => Promise<void>;
  onEditTeacher: (id: number, newName: string, phone?: string, loginId?: string, passcode?: string, pictureUrl?: string) => Promise<void>;
  authRole?: string | null;
  activeTab?: 'settings' | 'news' | 'teachers' | 'trash';
  onTabChange?: (tab: 'settings' | 'news' | 'teachers' | 'trash') => void;
  showSummerPlan?: boolean;
  onToggleSummerPlan?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onBulkRestoreStudents?: (ids: string[]) => void;
  onBulkPermanentDeleteStudents?: (ids: string[], className: string) => void;
  onBulkRestoreWeeks?: (weeks: string[]) => void;
  onBulkPermanentDeleteWeeks?: (weeks: string[]) => void;
}

const INITIAL_CLASSES = [
  '1-Sinf', '2-Sinf', '3-Sinf', '4-Sinf', '5-Sinf',
  '6-Sinf', '7-Sinf', '8-Sinf', '9-Sinf', '10-Sinf', '11-Sinf'
];

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
  onEditTeacher,
  authRole,
  activeTab: propActiveTab,
  onTabChange,
  showSummerPlan = true,
  onToggleSummerPlan,
  isDarkMode = true,
  onToggleDarkMode,
  onBulkRestoreStudents,
  onBulkPermanentDeleteStudents,
  onBulkRestoreWeeks,
  onBulkPermanentDeleteWeeks
}) => {
  // Responsive check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeTabState, setActiveTabState] = useState<'settings' | 'news' | 'teachers' | 'trash'>(() => {
    return (authRole === 'publish' || authRole === 'teacher') ? 'news' : 'settings';
  });

  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherPhone, setEditTeacherPhone] = useState('');
  const [editTeacherLoginId, setEditTeacherLoginId] = useState('');
  const [editTeacherPasscode, setEditTeacherPasscode] = useState('');
  const [editTeacherPictureUrl, setEditTeacherPictureUrl] = useState('');
  const [activeCredentialsTeacher, setActiveCredentialsTeacher] = useState<Teacher | null>(null);

  // Logged-in teacher's own profile (teacher role)
  const currentTeacher = useMemo(() => {
    if (authRole !== 'teacher') return null;
    const teacherId = localStorage.getItem('teacher_id');
    if (!teacherId) return null;
    return teachers.find(t => t.id.toString() === teacherId) || null;
  }, [authRole, teachers]);

  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileLoginId, setProfileLoginId] = useState('');
  const [profilePasscode, setProfilePasscode] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  const startProfileEditing = () => {
    if (!currentTeacher) return;
    setProfileLoginId(currentTeacher.login_id || '');
    setProfilePasscode(currentTeacher.passcode || '');
    setProfilePhone(currentTeacher.phone || '');
    setIsProfileEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!currentTeacher) return;
    let phone = profilePhone.trim();
    if (/^\d{9}$/.test(phone)) phone = `+998${phone}`;
    await onEditTeacher(
      currentTeacher.id,
      currentTeacher.name,
      phone || undefined,
      profileLoginId.trim() || undefined,
      profilePasscode.trim() || undefined,
      currentTeacher.picture_url
    );
    setIsProfileEditing(false);
  };

  useEffect(() => {
    if (editTeacher) {
      setEditTeacherName(editTeacher.name || '');
      setEditTeacherPhone(editTeacher.phone || '');
      setEditTeacherLoginId(editTeacher.login_id || '');
      setEditTeacherPasscode(editTeacher.passcode || '');
      setEditTeacherPictureUrl(editTeacher.picture_url || '');
    } else {
      setEditTeacherName('');
      setEditTeacherPhone('');
      setEditTeacherLoginId('');
      setEditTeacherPasscode('');
      setEditTeacherPictureUrl('');
    }
  }, [editTeacher]);

  const activeTab = propActiveTab !== undefined ? propActiveTab : activeTabState;
  const setActiveTab = onTabChange !== undefined ? onTabChange : setActiveTabState;

  // CSV and Student Upload states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newsImageInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

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
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
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

  const getRowValueByKeys = (row: any, keys: string[]): string => {
    if (!row) return '';
    const rowKeys = Object.keys(row);
    const cleanKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    for (const rKey of rowKeys) {
      const cleanRKey = rKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKeys.includes(cleanRKey)) {
        return (row[rKey] ?? '').toString().trim();
      }
    }
    return '';
  };

  const processImportedRows = (rows: any[]) => {
    if (rows.length > 0) {
      const firstRow = rows[0];
      const hasNameColumn = [
        "O'quvchining ismi va familiyasi",
        "Ism va familiya",
        "Students name surname",
        "Name",
        "name",
        "Student name",
        "FIO",
        "F.I.O.",
        "Ism familiya",
        "fullname",
        "Full Name"
      ].some(key => {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        return Object.keys(firstRow).some(rKey => {
          return rKey.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey;
        });
      });

      if (!hasNameColumn) {
        setUploadStatus({ 
          type: 'error', 
          message: `❌ Fayl formati noto'g'ri! "O'quvchining ismi va familiyasi" yoki "Ism va familiya" ustuni topilmadi. Namunaviy shablonni yuklab olib, tekshiring.` 
        });
        return;
      }
    }

    const generatedIdsInBatch = new Set<string>();
    const parsedStudents: Student[] = rows
      .map((row: any) => {
        const rawNameStr = getRowValueByKeys(row, [
          "O'quvchining ismi va familiyasi",
          "Ism va familiya",
          "Students name surname",
          "Name",
          "name",
          "Student name",
          "FIO",
          "F.I.O.",
          "Ism familiya",
          "fullname",
          "Full Name"
        ]);
        
        const nameParts = rawNameStr.split(' ').filter(Boolean);
        let name = '';
        let surname = '';

        if (nameParts.length > 0) {
          name = nameParts[0];
          surname = nameParts.slice(1).join(' ');
        }

        const className = (getRowValueByKeys(row, [
          "sinf",
          "Sinf",
          "class",
          "Class",
          "className",
          "Sinfni tanlang",
          "Group",
          "guruh"
        ]) || '5-Sinf').toUpperCase();

        let parentPhone = getRowValueByKeys(row, [
          "Ota-Ona Telfon Raqami",
          "Ota-One Telfon Raqami",
          "Ota-Ona telefon raqami",
          "Ota-One telefon raqami",
          "Phone number",
          "phone",
          "parent phone",
          "Phone",
          "Telefon raqami",
          "tel",
          "telefon"
        ]).toString().trim();

        if (parentPhone) {
          const digitsOnly = parentPhone.replace(/[^\d+]/g, '');
          if (digitsOnly.length === 9) {
            parentPhone = '+998' + digitsOnly;
          } else if (digitsOnly.length === 12 && digitsOnly.startsWith('998')) {
            parentPhone = '+' + digitsOnly;
          } else {
            parentPhone = digitsOnly;
          }
        }

        const rawId = getRowValueByKeys(row, [
          "ID",
          "id",
          "Id",
          "O'quvchi ID",
          "ID raqami",
          "Student ID",
          "Raqami",
          "ID number",
          "student_id"
        ]);
        let processedRawId = rawId.toString().trim();
        if (/^\d{3}$/.test(processedRawId)) {
          const num = parseInt(processedRawId);
          if (num >= 100 && num <= 199) {
            processedRawId = "BR" + processedRawId;
          } else if (num >= 200 && num <= 799) {
            processedRawId = "AL" + processedRawId;
          }
        }
        const customId = normalizeStudentId(processedRawId);

        const existingAllIds = [
          ...students.map(s => s.id),
          ...Array.from(generatedIdsInBatch)
        ];
        const finalId = customId || generateRandomId(className, existingAllIds);
        if (!customId) {
          generatedIdsInBatch.add(finalId);
        }

        return {
          id: finalId,
          name,
          surname,
          className,
          dateJoined: new Date().toISOString().split('T')[0],
          startingLevel: 'Level 1',
          currentLevel: 'Level 1',
          grandTests: [],
          teacher: undefined,
          mathStartingLevel: 'Level 1',
          mathCurrentLevel: 'Level 1',
          mathGrandTests: [],
          mathTeacher: undefined,
          engScore: 0,
          mathScore: 0,
          attendance: 1,
          homework: 1,
          parentPhone,
          passcode: '',
          pictureUrl: undefined,
          idWrong: false
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
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setUploadStatus({ 
        type: 'error', 
        message: '⚠️ Iltimos, faqat .CSV yoki .XLSX faylini yuklang.' 
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadStatus(null);

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processImportedRows(results.data);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setUploadStatus({ type: 'error', message: '❌ Faylni o\'qib bo\'lmadi.' });
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          processImportedRows(json);
        } catch (err) {
          console.error('Error parsing Excel:', err);
          setUploadStatus({ type: 'error', message: '❌ Excel faylini o\'qib bo\'lmadi.' });
        }
      };
      reader.readAsBinaryString(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const headers = ["ID", "O'quvchining ismi va familiyasi", "sinf", "Ota-Ona Telfon Raqami"];
    const activeClassStudents = students.filter(s => getClassGroupLocal(s.className) === activeClass);

    let rows: any[] = [];
    if (activeClassStudents.length > 0) {
      rows = activeClassStudents.map(s => [
        s.id,
        `${s.name} ${s.surname}`,
        s.className,
        s.parentPhone || ""
      ]);
    } else {
      rows = [
        ["AL305", "Yodgorov Axmadjon", "5-Sinf", "+998901234567"],
        ["AL320", "Salohiddinov Otabek", "5-Sinf", "+998907654321"]
      ];
    }

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const filename = `o_quvchilar_${activeClass.replace(/\s+/g, '_')}_shablon.xlsx`;
    XLSX.writeFile(wb, filename);
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

  // Edit Teacher Photo Upload and Compression
  const handleEditTeacherPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 250;
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setEditTeacherPictureUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
      case 'low': return { bg: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9', text: isDarkMode ? '#94a3b8' : '#475569', dot: '#94a3b8' };
      case 'high': return { bg: isDarkMode ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed', text: isDarkMode ? '#fb923c' : '#c2410c', dot: isDarkMode ? '#fb923c' : '#f97316' };
      case 'critical': return { bg: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', text: isDarkMode ? '#fc8181' : '#b91c1c', dot: isDarkMode ? '#fc8181' : '#ef4444' };
      case 'medium':
      default:
        return { bg: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', text: isDarkMode ? '#60a5fa' : '#1d4ed8', dot: '#3b82f6' };
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
            background: 'var(--backdrop-color)',
            backdropFilter: 'var(--backdrop-blur-md)',
            WebkitBackdropFilter: 'var(--backdrop-blur-md)',
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
          background: 'var(--bg-card)',
          backdropFilter: isInline ? 'none' : 'var(--backdrop-blur-md)',
          WebkitBackdropFilter: isInline ? 'none' : 'var(--backdrop-blur-md)',
          boxShadow: isInline ? 'none' : 'var(--glass-shadow-soft)',
          zIndex: isInline ? 1 : 1000,
          transform: isInline ? 'none' : (isOpen ? 'translateX(0)' : 'translateX(100%)'),
          transition: isInline ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: isInline ? 'none' : '1px solid var(--border-subtle)',
          minHeight: isInline ? 'calc(100vh - 120px)' : undefined
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '1.75rem 1.5rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={18} color="var(--accent-primary)" strokeWidth={2.5} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.02em' }}>
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
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Tabs Selector */}
        {authRole !== 'admin123' && authRole !== 'teacher' && (!isInline || isMobile) && (
          <div style={{
            display: 'flex',
            background: 'var(--bg-card-hover)',
            borderRadius: '9999px',
            padding: '0.25rem',
            margin: '0 1.5rem 1rem',
            border: '1px solid var(--border-subtle)',
            flexShrink: 0,
            gap: '0.1rem'
          }}>
            {([
              { id: 'settings', icon: Settings, label: 'Sozlama' },
              { id: 'news',     icon: Bell,     label: 'Yangilik' },
              { id: 'teachers', icon: Users,     label: "O'qituv." },
              ...(isAdminMode ? [{ id: 'trash', icon: Trash2, label: `Savat (${deletedStudents.length + deletedWeeks.length})` }] : [])
            ] as { id: string; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem',
                    background: isActive ? 'var(--accent-hero)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.45rem 0.2rem',
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 8px 16px var(--accent-glow)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0
                  }}
                >
                  <Icon size={13} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block' }}>{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Drawer Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 1.5rem' }}>

          {/* Teacher's own profile card (teacher role only) */}
          {authRole === 'teacher' && currentTeacher && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '24px',
              padding: '1.25rem',
              boxShadow: 'var(--glass-shadow-soft)',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Avatar + name + role */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {currentTeacher.picture_url ? (
                  <img src={currentTeacher.picture_url} alt="avatar" style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-subtle)', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(13, 148, 136, 0.12)', color: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 850
                  }}>
                    {currentTeacher.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 850, color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                    {currentTeacher.name}
                  </div>
                  {/* Role is fixed — not editable by the teacher */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem',
                    fontSize: '0.68rem', fontWeight: 750, letterSpacing: '0.02em',
                    color: 'var(--text-secondary)', whiteSpace: 'nowrap'
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                      background: currentTeacher.subject === 'MATH' ? '#f97316' : 'var(--accent-primary)'
                    }} />
                    {currentTeacher.subject === 'MATH' ? "Matematika o'qituvchisi" : "Ingliz tili o'qituvchisi"}
                  </div>
                </div>
                {!isProfileEditing && (
                  <button
                    onClick={startProfileEditing}
                    title="Tahrirlash"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '36px', height: '36px',
                      background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer', flexShrink: 0,
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  >
                    <Edit3 size={15} />
                  </button>
                )}
              </div>

              {/* Credentials: ID, passcode, phone */}
              {isProfileEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[
                    { label: 'LOGIN ID', value: profileLoginId, setter: setProfileLoginId, placeholder: 'Login ID' },
                    { label: 'PAROL', value: profilePasscode, setter: setProfilePasscode, placeholder: 'Parol' },
                    { label: 'TELEFON', value: profilePhone, setter: setProfilePhone, placeholder: '+998 XX XXX XX XX' }
                  ].map(field => (
                    <div key={field.label}>
                      <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        placeholder={field.placeholder}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '0.6rem 1rem',
                          background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)',
                          borderRadius: '14px', color: 'var(--text-primary)',
                          fontSize: '0.82rem', fontWeight: 700, outline: 'none'
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      onClick={handleSaveProfile}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        background: 'var(--accent-hero)', color: '#ffffff', border: 'none',
                        borderRadius: '9999px', padding: '0.65rem', fontSize: '0.75rem', fontWeight: 800,
                        cursor: 'pointer', boxShadow: '0 4px 12px var(--accent-glow)'
                      }}
                    >
                      <CheckCircle2 size={14} />
                      Saqlash
                    </button>
                    <button
                      onClick={() => setIsProfileEditing(false)}
                      style={{
                        flex: 1, background: 'var(--bg-card-hover)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)', borderRadius: '9999px',
                        padding: '0.65rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                      }}
                    >
                      Bekor qilish
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { label: 'LOGIN ID', value: currentTeacher.login_id || '—' },
                    { label: 'PAROL', value: currentTeacher.passcode || '—' },
                    { label: 'TELEFON', value: currentTeacher.phone || '—' }
                  ].map((row, idx) => (
                    <div key={row.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.25rem',
                      borderTop: idx === 0 ? '1px solid var(--border-subtle)' : 'none',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                        {row.label}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: System Settings */}
          {activeTab === 'settings' && authRole !== 'teacher' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              {/* Section 1: Subject Select */}
              {(!isInline || isMobile) && (
                <div style={{ marginBottom: '2rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    FAOL FAN KO'RINISHI
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {(() => {
                      let subjects = [
                        { id: 'PRIMARY', title: "Boshlang'ich", desc: "Boshlang'ich sinflar (1-4) uchun progress va tahlillar", color: 'var(--accent-primary)', bg: 'rgba(13, 148, 136, 0.12)' },
                        { id: 'GRANT', title: 'Grant Testlar', desc: 'Sinflarning darajalari va grant test natijalari', color: 'var(--accent-primary)', bg: 'rgba(13, 148, 136, 0.12)' },
                        { id: 'ALL', title: 'Haftalik Tahlil', desc: 'Foizlarda natijalar, davomat va vazifalar', color: 'var(--accent-primary)', bg: 'rgba(13, 148, 136, 0.12)' },
                        { 
                          id: 'ENG_MATH', 
                          title: authRole === 'teacher' ? (localStorage.getItem('teacher_subject') === 'MATH' ? 'Math' : 'English') : 'Eng/Math', 
                          desc: 'Ingliz tili va Matematika progress va ballari', 
                          color: 'var(--accent-primary)', 
                          bg: 'rgba(13, 148, 136, 0.12)' 
                        },
                        { id: 'DETAILS', title: 'Tafsilotlar', desc: "O'quvchi ID raqamlari, parollari va telefon raqamlari", color: 'var(--accent-primary)', bg: 'rgba(13, 148, 136, 0.12)' }
                      ];
                      if (authRole === 'teacher') {
                        const tSubject = localStorage.getItem('teacher_subject');
                        subjects = subjects.filter(s => s.id === tSubject || s.id === 'GRANT');
                      }
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
                            borderRadius: '20px',
                            background: isSelected ? subj.bg : 'var(--bg-card)',
                            border: isSelected ? `2px solid ${subj.color}` : '1px solid var(--border-subtle)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            boxShadow: isSelected ? 'var(--glass-shadow-soft)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--accent-primary)';
                              e.currentTarget.style.background = 'var(--bg-card-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--border-subtle)';
                              e.currentTarget.style.background = 'var(--bg-card)';
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
                            <div style={{ fontWeight: 850, fontSize: '0.8rem', color: isSelected ? subj.color : 'var(--text-primary)', letterSpacing: '0.02em' }}>
                              {subj.title.toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {subj.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: Admin Mode Toggle */}
              {authRole !== 'publish' && authRole !== 'teacher' && (!isInline || isMobile) && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                        ADMIN REJIMI
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem', maxWidth: '240px', lineHeight: 1.4 }}>
                        O'quvchi qo'shish, o'chirish va tahrirlash imkoniyatlari
                      </div>
                    </div>
                    <button 
                      onClick={onToggleAdmin}
                      style={{
                        width: '46px',
                        height: '24px',
                        borderRadius: '9999px',
                        background: isAdminMode ? 'var(--accent-primary)' : 'rgba(120, 130, 140, 0.25)',
                        border: '1px solid var(--border-subtle)',
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
                  marginTop: '1.5rem', 
                  marginBottom: '1.5rem',
                  animation: 'fadeIn 0.25s ease-out',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0' }} />
                  
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                      ADMIN AMALLARI
                    </div>
                    
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '20px',
                      padding: '0.9rem 1.1rem',
                      marginBottom: '1rem',
                      boxShadow: 'var(--glass-shadow-soft)'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Faol sinf ({activeClass}):</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{students.filter(s => getClassGroupLocal(s.className) === activeClass).length} ta</strong>
                      </div>
                    </div>
                     {/* Class-wise overview */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      maxHeight: '240px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '20px',
                      padding: '0.85rem',
                      background: 'var(--bg-card-hover)',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem', marginBottom: '0.25rem' }}>
                        SINFLAR BO'YICHA O'QUVCHILAR
                      </div>
                      {INITIAL_CLASSES.map(cls => {
                        const count = students.filter(s => getClassGroupLocal(s.className) === cls).length;
                        return (
                          <div 
                            key={cls}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '12px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cls}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{count} ta o'quvchi</span>
                              {authRole !== 'admin123' && (
                                <button
                                  type="button"
                                  onClick={() => onBulkDeleteClass?.(cls)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  title={`${cls} sinfini o'chirish`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <button
                        onClick={() => setIsAddStudentOpen(true)}
                        className="drawer-action-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          padding: '0.75rem 1.25rem',
                          borderRadius: '9999px',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                          boxShadow: 'var(--glass-shadow-soft)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--accent-hero)';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-card)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <UserPlus size={15} />
                        <span>YANGI O'QUVCHI QO'SHISH</span>
                      </button>

                      <button
                        onClick={() => { setUploadStatus(null); setIsCsvModalOpen(true); }}
                        className="drawer-action-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          padding: '0.75rem 1.25rem',
                          borderRadius: '9999px',
                          background: 'var(--accent-hero)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                          boxShadow: '0 8px 16px var(--accent-glow)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <UploadCloud size={15} />
                        <span>GURUHLI YUKLASH (EXCEL / CSV)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4: Dark Mode Toggle */}
              {onToggleDarkMode && (
                <div style={{ marginBottom: '1.5rem', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                        QORONG'U REJIM
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem', maxWidth: '240px', lineHeight: 1.4 }}>
                        Tizimning qorong'u/tungi ko'rinishi
                      </div>
                    </div>
                    <button 
                      onClick={onToggleDarkMode}
                      style={{
                        width: '46px',
                        height: '24px',
                        borderRadius: '9999px',
                        background: isDarkMode ? 'var(--accent-primary)' : 'rgba(120, 130, 140, 0.25)',
                        border: '1px solid var(--border-subtle)',
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
                        left: isDarkMode ? '24px' : '4px',
                        transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                      }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Section 5: Summer Plan Toggle */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                      YOZGI REJA
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem', maxWidth: '240px', lineHeight: 1.4 }}>
                      O'quvchilar progressi va choraklik grafiklarida yozgi rejani ko'rsatish
                    </div>
                  </div>
                  <button 
                    onClick={onToggleSummerPlan}
                    style={{
                      width: '46px',
                      height: '24px',
                      borderRadius: '9999px',
                      background: showSummerPlan ? 'var(--accent-primary)' : 'rgba(120, 130, 140, 0.25)',
                      border: '1px solid var(--border-subtle)',
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
                      left: showSummerPlan ? '24px' : '4px',
                      transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                    }} />
                  </button>
                </div>
              </div>

              {/* Section 6: Logout/Sign Out Button */}
              {onLogout && (
                <div style={{ marginTop: '2rem' }}>
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '1.5rem 0' }} />
                  <button
                    onClick={onLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '9999px',
                      background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                      border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2'}`,
                      color: isDarkMode ? '#fc8181' : '#ef4444',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(239, 68, 68, 0.02)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';
                      e.currentTarget.style.borderColor = isDarkMode ? 'rgba(239, 68, 68, 0.5)' : '#ef4444';
                      e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2';
                      e.currentTarget.style.borderColor = isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <LogOut size={16} />
                    TIZIMDAN CHIQISH
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: News & Events management (not available for teachers) */}
          {activeTab === 'news' && authRole !== 'teacher' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out', marginTop: '0.5rem' }}>
              
              {/* Form Collapsible Toggle button */}
              <button
                onClick={() => setIsFormOpen(!isFormOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '9999px',
                  background: isFormOpen ? 'var(--accent-hero)' : 'var(--bg-card)',
                  color: isFormOpen ? '#ffffff' : 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  boxShadow: 'var(--glass-shadow-soft)',
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
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '24px',
                    padding: '1.5rem 1.25rem',
                    marginBottom: '1.5rem',
                    boxShadow: 'var(--glass-shadow-soft)',
                    animation: 'slideDown 0.2s ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  {/* Type Selector (Turi) */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
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
                              borderRadius: '9999px',
                              background: isActive
                                ? (opt.key === 'reminder' ? (isDarkMode ? 'rgba(245,158,11,0.15)' : '#fffbeb') : opt.key === 'event' ? (isDarkMode ? 'rgba(34,197,94,0.15)' : '#f0fdf4') : (isDarkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff'))
                                : 'var(--bg-card-hover)',
                              color: isActive
                                ? (opt.key === 'reminder' ? (isDarkMode ? '#fbbf24' : '#92400e') : opt.key === 'event' ? (isDarkMode ? '#4ade80' : '#166534') : (isDarkMode ? '#60a5fa' : '#1d4ed8'))
                                : 'var(--text-secondary)',
                              border: isActive
                                ? `1.5px solid ${opt.key === 'reminder' ? '#f59e0b' : opt.key === 'event' ? '#22c55e' : '#3b82f6'}`
                                : `1px solid var(--border-subtle)`,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
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
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
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
                        padding: '0.65rem 1rem',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        background: 'var(--bg-card-hover)',
                        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--accent-primary)';
                        e.target.style.background = 'var(--bg-card)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-subtle)';
                        e.target.style.background = 'var(--bg-card-hover)';
                      }}
                    />
                    {/* Quick Labels suggestions */}
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {['E\'lon', 'Tadbir', 'Bayram', 'Imtihon', 'Sport'].map(item => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => setNewsLabel(item)}
                          style={{
                            background: 'var(--bg-card-hover)',
                            color: 'var(--text-secondary)',
                            border: `1px solid var(--border-subtle)`,
                            borderRadius: '9999px',
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Date Input */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
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
                        padding: '0.65rem 1rem',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontFamily: 'inherit',
                        background: 'var(--bg-card-hover)',
                        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--accent-primary)';
                        e.target.style.background = 'var(--bg-card)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-subtle)';
                        e.target.style.background = 'var(--bg-card-hover)';
                      }}
                    />
                  </div>

                  {/* Scheduled Release Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-card-hover)', padding: '0.85rem', borderRadius: '20px', border: `1px solid var(--border-subtle)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                          background: isScheduled ? 'var(--accent-primary)' : 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
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
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                          ILOVADA NASHR QILISH SANASI:
                        </label>
                        <input 
                          type="datetime-local" 
                          value={scheduledFor}
                          onChange={(e) => setScheduledFor(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.85rem',
                            borderRadius: '9999px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.78rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            fontFamily: 'inherit',
                            background: 'var(--bg-card)',
                            transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--accent-primary)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'var(--border-subtle)';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Urgency Selector */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
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
                              background: isChosen ? colors.bg : 'var(--bg-card-hover)',
                              color: isChosen ? colors.text : 'var(--text-secondary)',
                              border: isChosen ? `1.5px solid ${colors.dot}` : `1px solid var(--border-subtle)`,
                              borderRadius: '9999px',
                              padding: '0.45rem 0.25rem',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
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
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
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
                        padding: '0.65rem 1rem',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        background: 'var(--bg-card-hover)',
                        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--accent-primary)';
                        e.target.style.background = 'var(--bg-card)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-subtle)';
                        e.target.style.background = 'var(--bg-card-hover)';
                      }}
                    />
                  </div>

                  {/* News Message (Body text) */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
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
                        padding: '0.75rem 1rem',
                        borderRadius: '20px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: 1.4,
                        background: 'var(--bg-card-hover)',
                        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--accent-primary)';
                        e.target.style.background = 'var(--bg-card)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-subtle)';
                        e.target.style.background = 'var(--bg-card-hover)';
                      }}
                    />
                  </div>

                  {/* Pictures Upload Area — hidden for reminders */}
                  {newsType !== 'reminder' && (
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <ImageIcon size={12} />
                      RASMLARNI YUKLASH
                    </label>
                    
                    {/* Draft images previews */}
                    {uploadedPics.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                        {uploadedPics.map((pic, idx) => (
                          <div 
                            key={pic} 
                            style={{ 
                              position: 'relative', width: '56px', height: '56px', 
                              borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' 
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
                        width: '100%', padding: '0.75rem', border: '1px dashed var(--border-subtle)', borderRadius: '9999px',
                        background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
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
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      borderRadius: '24px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Eye size={10} />
                        ILOVADAGI KO'RINISHI (PREVIEW)
                      </div>
                      <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '1.25rem',
                        boxShadow: 'var(--glass-shadow-soft)',
                        border: '1px solid var(--border-subtle)',
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
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {newsTitle.trim() || 'Sarlavha...'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {newsMessage.trim() || 'Xabar matni...'}
                        </div>
                        <div style={{
                          background: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '9999px',
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
                        padding: '0.65rem', border: '1px solid var(--border-subtle)', borderRadius: '9999px',
                        background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 800,
                        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                    >
                      BEKOR QILISH
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingNews}
                      style={{
                        padding: '0.65rem', border: 'none', borderRadius: '9999px',
                        background: 'var(--accent-hero)', color: '#ffffff', fontSize: '0.8rem', fontWeight: 800,
                        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                        opacity: isSubmittingNews ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                    >
                      <Send size={14} />
                      <span>{isSubmittingNews ? 'YUKLANMOQDA...' : 'SAQLASH'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* News & Events list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Eye size={12} />
                  ILOVADAGI YANGILIKLAR ({newsEvents.length} ta)
                </div>

                {isNewsLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Yangiliklar yuklanmoqda...
                  </div>
                ) : newsEvents.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', padding: '2.5rem 1rem', border: '1px dashed var(--border-subtle)', 
                    borderRadius: '24px', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5,
                    background: 'var(--bg-card-hover)'
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
                          background: isReminder ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-card)',
                          border: isReminder ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--border-subtle)',
                          borderRadius: '24px',
                          padding: '1.25rem',
                          boxShadow: 'var(--glass-shadow-soft)',
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
                              background: isReminder ? '#fef3c7' : isEvent ? '#dcfce7' : 'var(--bg-card-hover)',
                              color: isReminder ? '#92400e' : isEvent ? '#166534' : 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                              padding: '0.2rem 0.65rem', borderRadius: '9999px',
                              fontSize: '0.62rem', fontWeight: 800,
                              display: 'flex', alignItems: 'center', gap: '0.2rem'
                            }}>
                              {isReminder ? <Bell size={9} /> : null}
                              {isReminder ? 'Eslatma' : isEvent ? 'Tadbir' : item.label}
                            </span>
                            {/* Urgency Badge */}
                            <span style={{
                              background: colors.bg, color: colors.text,
                              border: `1px solid ${colors.dot}44`,
                              padding: '0.2rem 0.65rem', borderRadius: '9999px',
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
                              background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                              padding: '0.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Title and Date */}
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {isReminder && <Bell size={14} color="#f59e0b" />}
                            {item.title}
                          </h3>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
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
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
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
                                key={url} 
                                style={{ 
                                  width: '64px', height: '64px', borderRadius: '12px', 
                                  overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-subtle)' 
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

            </div>
          )}

          {/* Sign out for teacher role (settings tab is hidden for teachers) */}
          {authRole === 'teacher' && onLogout && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '1.5rem 0' }} />
              <button
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '9999px',
                  background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                  border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2'}`,
                  color: isDarkMode ? '#fc8181' : '#ef4444',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';
                  e.currentTarget.style.borderColor = isDarkMode ? 'rgba(239, 68, 68, 0.5)' : '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2';
                  e.currentTarget.style.borderColor = isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2';
                }}
              >
                <LogOut size={16} />
                TIZIMDAN CHIQISH
              </button>
            </div>
          )}

          {/* TAB: Teachers / O'qituvchilar */}
          {activeTab === 'teachers' && authRole !== 'teacher' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Form to Add Teacher */}
              {isAdminMode && (
                <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newTeacherName.trim()) return;
                  setIsAddingTeacher(true);
                  try {
                    await onAddTeacher(newTeacherName.trim(), newTeacherSubject, newTeacherPhone.trim());
                    setNewTeacherName('');
                    setNewTeacherPhone('');
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsAddingTeacher(false);
                  }
                }}
                 style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '24px',
                  padding: '1.5rem 1.25rem',
                  boxShadow: 'var(--glass-shadow-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
                  YANGI O'QITUVCHI QO'SHISH
                </div>
                
                <div>
                  <label htmlFor="teacher-name" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
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
                      padding: '0.75rem 1.25rem',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-card-hover)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.background = 'var(--bg-card)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-subtle)';
                      e.target.style.background = 'var(--bg-card-hover)';
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="teacher-phone" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    TELEFON RAQAMI
                  </label>
                  <input
                    id="teacher-phone"
                    type="text"
                    placeholder="+998901234567"
                    value={newTeacherPhone}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val.startsWith('+998') && val !== '' && val !== '+') {
                        val = '+998' + val.replace(/^\+?998?/, '');
                      }
                      setNewTeacherPhone(val);
                    }}
                    disabled={isAddingTeacher}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1.25rem',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-card-hover)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.background = 'var(--bg-card)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-subtle)';
                      e.target.style.background = 'var(--bg-card-hover)';
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="teacher-subject" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    MUTAXASSISLIK FANI
                  </label>
                  <select
                    id="teacher-subject"
                    value={newTeacherSubject}
                    onChange={(e) => setNewTeacherSubject(e.target.value as 'ENG' | 'MATH')}
                    disabled={isAddingTeacher}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1.25rem',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-card-hover)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238f8f98\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1.25rem center',
                      backgroundSize: '1em'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.background = 'var(--bg-card)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-subtle)';
                      e.target.style.background = 'var(--bg-card-hover)';
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
                    background: 'var(--accent-hero)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.85rem',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: isAddingTeacher ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 16px var(--accent-glow)',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    letterSpacing: '0.05em',
                    marginTop: '0.25rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isAddingTeacher) {
                      e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {isAddingTeacher ? "QO'SHILMOQDA..." : "O'QITUVCHINI QO'SHISH"}
                </button>
              </form>
              )}

              {/* Teachers List Grouped by Subject */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                 {/* English Teachers */}
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                    INGLIZ TILI O'QITUVCHILARI ({teachers.filter(t => t.subject === 'ENG').length} ta)
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {teachers.filter(t => t.subject === 'ENG').length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.75rem 1rem', background: 'var(--bg-card-hover)', borderRadius: '12px', border: `1px solid var(--border-subtle)` }}>
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
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '20px',
                            padding: '0.75rem 1rem',
                            boxShadow: 'var(--glass-shadow-soft)'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-primary)' }}>{teacher.name}</span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            {/* Glassy Credentials Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveCredentialsTeacher(teacher); }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '50%',
                                padding: '0.45rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                              }}
                              title="Ma'lumotlarni ko'rish"
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hero)'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'none'; }}
                            >
                              <ArrowUpRight size={13} strokeWidth={2.5} />
                            </button>

                            {isAdminMode && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditTeacher(teacher); }}
                                  style={{
                                    background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                                    color: '#3b82f6',
                                    border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid #dbeafe',
                                    borderRadius: '50%',
                                    padding: '0.45rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                  }}
                                  title="Tahrirlash"
                                  onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(59,130,246,0.2)' : '#dbeafe'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(59,130,246,0.1)' : '#eff6ff'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <Edit3 size={13} />
                                </button>

                                <button
                                  onClick={() => {
                                    if (window.confirm(`Haqiqatan ham ${teacher.name}ni o'chirishni xohlaysizmi?`)) {
                                      onDeleteTeacher(teacher.id);
                                    }
                                  }}
                                  style={{
                                    background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                                    color: '#ef4444',
                                    border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #fee2e2',
                                    borderRadius: '50%',
                                    padding: '0.45rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                  }}
                                  title="O'chirish"
                                  onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.2)' : '#fee2e2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Math Teachers */}
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f97316', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                    MATEMATIKA O'QITUVCHILARI ({teachers.filter(t => t.subject === 'MATH').length} ta)
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {teachers.filter(t => t.subject === 'MATH').length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.75rem 1rem', background: 'var(--bg-card-hover)', borderRadius: '12px', border: `1px solid var(--border-subtle)` }}>
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
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '20px',
                            padding: '0.75rem 1rem',
                            boxShadow: 'var(--glass-shadow-soft)'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-primary)' }}>{teacher.name}</span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            {/* Glassy Credentials Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveCredentialsTeacher(teacher); }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '50%',
                                padding: '0.45rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                              }}
                              title="Ma'lumotlarni ko'rish"
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hero)'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'none'; }}
                            >
                              <ArrowUpRight size={13} strokeWidth={2.5} />
                            </button>

                            {isAdminMode && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditTeacher(teacher); }}
                                  style={{
                                    background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                                    color: '#3b82f6',
                                    border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid #dbeafe',
                                    borderRadius: '50%',
                                    padding: '0.45rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                  }}
                                  title="Tahrirlash"
                                  onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(59,130,246,0.2)' : '#dbeafe'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(59,130,246,0.1)' : '#eff6ff'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <Edit3 size={13} />
                                </button>

                                <button
                                  onClick={() => {
                                    if (window.confirm(`Haqiqatan ham ${teacher.name}ni o'chirishni xohlaysizmi?`)) {
                                      onDeleteTeacher(teacher.id);
                                    }
                                  }}
                                  style={{
                                    background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                                    color: '#ef4444',
                                    border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #fee2e2',
                                    borderRadius: '50%',
                                    padding: '0.45rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                  }}
                                  title="O'chirish"
                                  onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.2)' : '#fee2e2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2'; e.currentTarget.style.transform = 'none'; }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
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
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                <Trash2 size={12} />
                SAVATDAGI O'QUVCHILAR ({deletedStudents.length} ta)
              </div>

              {deletedStudents.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', padding: '2.5rem 1rem', border: '2px dashed var(--border-subtle)', 
                  borderRadius: '24px', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 
                }}>
                  Savat bo'sh.<br />O'chirilgan o'quvchilar shu yerda paydo bo'ladi.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {Object.entries(groupedDeleted).map(([className, list]) => (
                    <div key={className} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '24px',
                      padding: '1.25rem',
                      boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-subtle)',
                        paddingBottom: '0.75rem',
                        marginBottom: '0.75rem'
                      }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: 'var(--accent-hero)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {className} Guruhi ({list.length} ta)
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => onBulkRestoreStudents?.(list.map(s => s.id))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-hero)',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '9999px',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                          >
                            Tiklash
                          </button>
                          <button
                            type="button"
                            onClick={() => onBulkPermanentDeleteStudents?.(list.map(s => s.id), className)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '9999px',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                          >
                            O'chirish
                          </button>
                        </div>
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
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {s.name} {s.surname}
                              </div>
                              {(s.teacher || s.mathTeacher) && (
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                  O'qituvchi: {s.teacher || s.mathTeacher}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => onRestoreStudent(s.id)}
                                style={{
                                  background: isDarkMode ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4',
                                  color: isDarkMode ? '#4ade80' : '#166534',
                                  border: isDarkMode ? '1px solid rgba(34,197,94,0.25)' : '1px solid #bbf7d0',
                                  borderRadius: '9999px',
                                  padding: '0.35rem 0.8rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(34,197,94,0.22)' : '#dcfce7'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(34,197,94,0.12)' : '#f0fdf4'; }}
                              >
                                Tiklash
                              </button>
                              <button
                                type="button"
                                onClick={() => onPermanentDeleteStudent(s.id)}
                                style={{
                                  background: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                                  color: isDarkMode ? '#fc8181' : '#991b1b',
                                  border: isDarkMode ? '1px solid rgba(239,68,68,0.25)' : '1px solid #fecaca',
                                  borderRadius: '9999px',
                                  padding: '0.35rem 0.8rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.22)' : '#fee2e2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.12)' : '#fef2f2'; }}
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
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginTop: '2rem', 
                marginBottom: '1rem' 
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={12} />
                  SAVATDAGI HAFTALAR ({deletedWeeks.length} ta)
                </div>
                {deletedWeeks.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => onBulkRestoreWeeks?.(deletedWeeks)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-hero)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Tiklash
                    </button>
                    <button
                      type="button"
                      onClick={() => onBulkPermanentDeleteWeeks?.(deletedWeeks)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      O'chirish
                    </button>
                  </div>
                )}
              </div>

              {deletedWeeks.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', padding: '2.5rem 1rem', border: '2px dashed var(--border-subtle)', 
                  borderRadius: '24px', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 
                }}>
                  Savat bo'sh.<br />O'chirilgan haftalar shu yerda paydo bo'ladi.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deletedWeeks.map(weekName => (
                    <div key={weekName} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '24px',
                      padding: '1.25rem',
                      boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {weekName}
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => onRestoreWeek(weekName)}
                          style={{
                            background: isDarkMode ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4',
                            color: isDarkMode ? '#4ade80' : '#166534',
                            border: isDarkMode ? '1px solid rgba(34,197,94,0.25)' : '1px solid #bbf7d0',
                            borderRadius: '9999px',
                            padding: '0.35rem 0.8rem',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(34,197,94,0.22)' : '#dcfce7'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(34,197,94,0.12)' : '#f0fdf4'; }}
                        >
                          Tiklash
                        </button>
                        <button
                          type="button"
                          onClick={() => onPermanentDeleteWeek(weekName)}
                          style={{
                            background: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                            color: isDarkMode ? '#fc8181' : '#991b1b',
                            border: isDarkMode ? '1px solid rgba(239,68,68,0.25)' : '1px solid #fee2e2',
                            borderRadius: '9999px',
                            padding: '0.35rem 0.8rem',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.22)' : '#fee2e2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.12)' : '#fef2f2'; }}
                        >
                          O'chirish
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
        <div className="modal-overlay" onClick={() => setIsCsvModalOpen(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--text-primary)' }}>O'quvchilarni guruhli yuklash</h2>
              <button 
                onClick={() => setIsCsvModalOpen(false)}
                className="close-btn"
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Sinf o'quvchilarini ommaviy Excel (.xlsx) yoki CSV fayl orqali tizimga yuklang. To'g'ri ustunlar mos kelishi uchun quyidagi namunani yuklab oling.
            </p>

            <div style={{ 
              background: 'rgba(13, 148, 136, 0.08)', border: '1px solid var(--border-subtle)', 
              borderRadius: '16px', padding: '0.8rem 1rem', marginBottom: '1.25rem',
              fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5
            }}>
              <strong>⚠️ Diqqat:</strong> Yuklanadigan fayl <strong>.XLSX</strong>, <strong>.XLS</strong> yoki <strong>.CSV</strong> formatida bo'lishi shart.<br />
              Excel yoki Google Sheets da tayyorlangan jadvalni to'g'ridan-to'g'ri yuklashingiz mumkin.
            </div>

             <button 
              className="admin-btn" 
              style={{
                marginBottom: '1.5rem', width: '100%', justifyContent: 'center',
                background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
                borderRadius: '9999px', padding: '0.75rem 1.25rem', fontSize: '0.82rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
              onClick={downloadTemplate}
            >
              <Download size={16} />
              Namunaviy Excel faylini yuklab olish
            </button>

            {uploadStatus && (
              <div style={{
                padding: '0.8rem 1rem', borderRadius: '9999px', marginBottom: '1.25rem',
                fontSize: '0.82rem', fontWeight: 600,
                textAlign: 'center',
                background: uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: uploadStatus.type === 'success' ? '#059669' : '#dc2626',
                border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
              }}>
                {uploadStatus.message}
              </div>
            )}

            <div 
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: '24px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-card-hover)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-hero)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
            >
              <UploadCloud className="icon" size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }} />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', margin: 0 }}>Faylni tanlash uchun bosing</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>yoki faylni sudrab bu yerga tashlang (.xlsx, .xls, .csv formatda)</p>
              </div>
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls" 
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
        activeClass={activeClass}
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

      {editTeacher !== null && (
        <div className="modal-overlay" onClick={() => setEditTeacher(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', position: 'relative' }}>
            <button
              onClick={() => setEditTeacher(null)}
              className="close-btn"
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                O'qituvchi ma'lumotlarini tahrirlash
              </h3>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Rasm, ism, telefon, ID va parolni tahrirlang
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Profile Image Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Profil rasmi
                </label>
                <div 
                  onClick={() => editPhotoInputRef.current?.click()}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '24px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card-hover)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  {editTeacherPictureUrl ? (
                    <>
                      <img src={editTeacherPictureUrl} alt="Teacher preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: '#ffffff',
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        padding: '0.2rem 0'
                      }}>
                        ALASHTIRISH
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)', gap: '0.25rem' }}>
                      <ImageIcon size={20} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>RASM YUKLASH</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file"
                  ref={editPhotoInputRef}
                  accept="image/*"
                  onChange={handleEditTeacherPhotoUpload}
                  style={{ display: 'none' }}
                />
                {editTeacherPictureUrl && (
                  <button 
                    onClick={() => setEditTeacherPictureUrl('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Rasmni o'chirish
                  </button>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Ismi va Familiyasi
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ism va familiya..."
                  value={editTeacherName}
                  onChange={(e) => setEditTeacherName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Telefon Raqami
                </label>
                <input
                  type="text"
                  placeholder="+998901234567"
                  value={editTeacherPhone}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith('+998') && val !== '' && val !== '+') {
                      val = '+998' + val.replace(/^\+?998?/, '');
                    }
                    setEditTeacherPhone(val);
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  ID (Login ID)
                </label>
                <input
                  type="text"
                  placeholder="login id..."
                  value={editTeacherLoginId}
                  onChange={(e) => setEditTeacherLoginId(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Parol (Passcode)
                </label>
                <input
                  type="text"
                  placeholder="parol..."
                  value={editTeacherPasscode}
                  onChange={(e) => setEditTeacherPasscode(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setEditTeacher(null)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '9999px',
                  padding: '0.75rem',
                  fontWeight: 750,
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                Bekor qilish
              </button>
              <button
                onClick={async () => {
                  if (editTeacher !== null && editTeacherName.trim() !== '') {
                    await onEditTeacher(
                      editTeacher.id,
                      editTeacherName.trim(),
                      editTeacherPhone.trim(),
                      editTeacherLoginId.trim(),
                      editTeacherPasscode.trim(),
                      editTeacherPictureUrl.trim()
                    );
                    setEditTeacher(null);
                  }
                }}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  width: 'auto'
                }}
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassy Credentials Popup Modal */}
      {activeCredentialsTeacher !== null && (
        <div 
          className="modal-overlay" 
          onClick={() => setActiveCredentialsTeacher(null)} 
          style={{ 
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '380px', 
              width: '90%',
              position: 'relative',
              padding: 0,
              background: isDarkMode ? 'rgba(24, 24, 27, 0.75)' : 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(30px)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              borderRadius: '32px',
              overflow: 'hidden',
              animation: 'premiumScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setActiveCredentialsTeacher(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'}
            >
              <X size={16} />
            </button>

            {/* Teacher Image / Upper Photo Slot */}
            <div style={{ width: '100%', height: '240px', position: 'relative', background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)' }}>
              {activeCredentialsTeacher.picture_url ? (
                <img 
                  src={activeCredentialsTeacher.picture_url} 
                  alt={activeCredentialsTeacher.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#ffffff', gap: '0.5rem' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 800, opacity: 0.9, letterSpacing: '0.05em' }}>
                    {activeCredentialsTeacher.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                </div>
              )}
              {/* Bottom fading translucent glass overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: isDarkMode ? 'linear-gradient(to bottom, transparent, rgba(24, 24, 27, 0.75))' : 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.75))',
                pointerEvents: 'none'
              }} />
            </div>

            {/* Information area */}
            <div style={{ padding: '1.75rem 1.5rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', letterSpacing: '-0.02em' }}>
                  {activeCredentialsTeacher.name}
                </h3>
                <CheckCircle2 size={17} fill="#10b981" color="#ffffff" style={{ flexShrink: 0 }} />
              </div>

              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: 750, 
                color: activeCredentialsTeacher.subject === 'ENG' ? 'var(--accent-primary)' : '#f97316', 
                textTransform: 'uppercase', 
                textAlign: 'center', 
                letterSpacing: '0.08em',
                marginBottom: '1.75rem' 
              }}>
                {activeCredentialsTeacher.subject === 'ENG' ? "Ingliz Tili O'qituvchisi" : "Matematika O'qituvchisi"}
              </div>

              {/* Grid with Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ 
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Telefon
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activeCredentialsTeacher.phone || "Kiritilmagan"}
                  </span>
                </div>

                <div style={{ 
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Login ID
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                    {activeCredentialsTeacher.login_id || "-"}
                  </span>
                </div>

                <div style={{ 
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Parol
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                    {activeCredentialsTeacher.passcode || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SidebarDrawer;
