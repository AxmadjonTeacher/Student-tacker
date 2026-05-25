import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Download, Trash2, UserPlus, Settings,
  Calendar, AlertCircle, Tag, Image as ImageIcon, Plus, 
  ChevronDown, ChevronUp, Clock, Eye, Send
} from 'lucide-react';
import Papa from 'papaparse';
import type { Student } from '../types';
import AddStudentModal from './AddStudentModal';
import { supabase } from '../supabase';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: 'ENG' | 'MATH' | 'ALL';
  onSubjectChange: (subj: 'ENG' | 'MATH' | 'ALL') => void;
  isAdminMode: boolean;
  onToggleAdmin: () => void;
  students: Student[];
  activeClass: string;
  onStudentsUploaded: (students: Student[]) => void;
  onBulkDeleteClass: () => void;
  onAddStudent: (studentData: Partial<Student>) => void;
}

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeSubject,
  onSubjectChange,
  isAdminMode,
  onToggleAdmin,
  students,
  activeClass,
  onStudentsUploaded,
  onBulkDeleteClass,
  onAddStudent
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'settings' | 'news'>('settings');

  // CSV and Student Upload states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const newsImageInputRef = useRef<HTMLInputElement>(null);

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

            const grandTests = [];
            const term1 = row['Grant 1 eng'] || row['Grant 1 ENG'] || row['grant 1 eng'] || row['Grant 1'] || row['grant 1'] || row['1-chorak natijasi'] || row['1-chorak'] || row['term 1 score'] || '';
            if (term1.toString().trim()) grandTests.push({ name: 'Grant 1', score: parseInt(term1) || 0 });
            
            const term2 = row['Grant 2 eng'] || row['Grant 2 ENG'] || row['grant 2 eng'] || row['Grant 2'] || row['grant 2'] || row['2-chorak natijasi'] || row['2-chorak'] || row['term 2 score'] || '';
            if (term2.toString().trim()) grandTests.push({ name: 'Grant 2', score: parseInt(term2) || 0 });
            
            const term3 = row['Grant 3 eng'] || row['Grant 3 ENG'] || row['grant 3 eng'] || row['Grant 3'] || row['grant 3'] || row['3-chorak natijasi'] || row['3-chorak'] || row['term 3 score'] || '';
            if (term3.toString().trim()) grandTests.push({ name: 'Grant 3', score: parseInt(term3) || 0 });
            
            const term4 = row['Grant 4 eng'] || row['Grant 4 ENG'] || row['grant 4 eng'] || row['Grant 4'] || row['grant 4'] || row['4-chorak natijasi'] || row['4-chorak'] || row['term 4 score'] || '';
            if (term4.toString().trim()) grandTests.push({ name: 'Grant 4', score: parseInt(term4) || 0 });

            const mathGrandTests = [];
            const mTerm1 = row['Grant 1 math'] || row['Grant 1 MATH'] || row['grant 1 math'] || row['1-chorak matematika'] || row['math term 1 score'] || '';
            if (mTerm1.toString().trim()) mathGrandTests.push({ name: 'Grant 1', score: parseInt(mTerm1) || 0 });
            
            const mTerm2 = row['Grant 2 math'] || row['Grant 2 MATH'] || row['grant 2 math'] || row['2-chorak matematika'] || row['math term 2 score'] || '';
            if (mTerm2.toString().trim()) mathGrandTests.push({ name: 'Grant 2', score: parseInt(mTerm2) || 0 });
            
            const mTerm3 = row['Grant 3 math'] || row['Grant 3 MATH'] || row['grant 3 math'] || row['3-chorak matematika'] || row['math term 3 score'] || '';
            if (mTerm3.toString().trim()) mathGrandTests.push({ name: 'Grant 3', score: parseInt(mTerm3) || 0 });
            
            const mTerm4 = row['Grant 4 math'] || row['Grant 4 MATH'] || row['grant 4 math'] || row['4-chorak matematika'] || row['math term 4 score'] || '';
            if (mTerm4.toString().trim()) mathGrandTests.push({ name: 'Grant 4', score: parseInt(mTerm4) || 0 });

            const rawEngStarting = row['boshlang\'ich daraja eng'] || row['Boshlang\'ich daraja eng'] || row['StartingLevelENG'] || row['boshlang\'ich daraja'] || row['Boshlang\'ich daraja'] || row['avvalgi daraja'] || row['Avvalgi daraja'] || row['initial level'] || row['initial level eng'] || row['Level'] || row['level'] || row['StartingLevel'] || '';
            const rawEngCurrent = row['hozirgi daraja eng'] || row['Hozirgi daraja eng'] || row['CurrentLevelENG'] || row['hozirgi daraja'] || row['Hozirgi daraja'] || row['current level'] || row['CurrentLevel'] || row['currentLevel'] || row['current level eng'] || '';

            const rawMathStarting = row['boshlang\'ich daraja math'] || row['Boshlang\'ich daraja math'] || row['StartingLevelMATH'] || row['initial level math'] || row['avvalgi daraja math'] || row['Avvalgi daraja math'] || '';
            const rawMathCurrent = row['hozirgi daraja math'] || row['Hozirgi daraja math'] || row['CurrentLevelMATH'] || row['current level math'] || '';

            const normEngStarting = normalizeLevel(rawEngStarting);
            const normEngCurrent = normalizeLevel(rawEngCurrent);
            const normMathStarting = normalizeLevel(rawMathStarting);
            const normMathCurrent = normalizeLevel(rawMathCurrent);

            const hasExplicitMathColumns = !!(rawMathStarting || rawMathCurrent || mTerm1 || mTerm2 || mTerm3 || mTerm4);

            let finalEngStarting = normEngStarting || 'Level 1';
            let finalEngCurrent = normEngCurrent || 'Level 1';
            let finalEngTests: { name: string; score: number }[] | undefined = grandTests.length > 0 ? grandTests : undefined;

            let finalMathStarting = normMathStarting || 'Level 1';
            let finalMathCurrent = normMathCurrent || 'Level 1';
            let finalMathTests: { name: string; score: number }[] | undefined = mathGrandTests.length > 0 ? mathGrandTests : undefined;

            if (!hasExplicitMathColumns && activeSubject === 'MATH') {
              finalMathStarting = normEngStarting || 'Level 1';
              finalMathCurrent = normEngCurrent || 'Level 1';
              finalMathTests = grandTests.length > 0 ? grandTests : undefined;

              finalEngStarting = 'Level 1';
              finalEngCurrent = 'Level 1';
              finalEngTests = undefined;
            }

            const rawEngScore = row['Eng score'] || row['English score'] || row['eng_score'] || row['eng score'] || '';
            const engScore = rawEngScore !== '' ? Math.min(15, Math.max(0, parseInt(rawEngScore) || 0)) : 0;

            const rawMathScore = row['Math score'] || row['math_score'] || row['math score'] || '';
            const mathScore = rawMathScore !== '' ? Math.min(15, Math.max(0, parseInt(rawMathScore) || 0)) : 0;

            const rawAttendance = row['Attendance'] || row['attendance'] || '';
            const attendance = rawAttendance !== '' ? parseInt(rawAttendance) || 1 : 1;

            const rawHomework = row['Homework'] || row['homework'] || '';
            const homework = rawHomework !== '' ? parseInt(rawHomework) || 1 : 1;

            return {
              id: Math.random().toString(36).substr(2, 9),
              name,
              surname,
              className: (
                row['sinf'] || 
                row['Sinf'] || 
                row['class'] || 
                row['Class'] || 
                row['className'] || '5A'
              ).toString().trim().toUpperCase(),
              dateJoined: (
                row['qabul qilingan sana'] || 
                row['Qabul qilingan sana'] || 
                row['when'] || 
                row['When'] || 
                row['date joined'] || 'Sentyabr 2024'
              ).toString().trim(),
              startingLevel: finalEngStarting,
              currentLevel: finalEngCurrent,
              grandTests: finalEngTests,
              pictureUrl: row['PictureUrl'] || row['pictureUrl'] || '',
              mathStartingLevel: finalMathStarting,
              mathCurrentLevel: finalMathCurrent,
              mathGrandTests: finalMathTests,
              engScore,
              mathScore,
              attendance,
              homework,
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

    const headers = [
      "O'quvchining ismi va familiyasi",
      "sinf",
      "boshlang'ich daraja eng",
      "hozirgi daraja eng",
      "Grant 1 eng",
      "Grant 2 eng",
      "Grant 3 eng",
      "Grant 4 eng",
      "boshlang'ich daraja math",
      "hozirgi daraja math",
      "Grant 1 math",
      "Grant 2 math",
      "Grant 3 math",
      "Grant 4 math"
    ].join(",");

    const row1 = [
      "Yodgorov Axmadjon",
      "5A",
      "1",
      "5",
      "70", "72", "90", "67",
      "2",
      "4",
      "60", "68", "75", "82"
    ].join(",");

    const row2 = [
      "Salohiddinov Otabek",
      "5B",
      "3",
      "5",
      "55", "40", "68", "90",
      "1",
      "3",
      "45", "55", "62", "70"
    ].join(",");

    const csvContent = headers + "\n" + row1 + "\n" + row2;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "o_quvchilar_kombinatsiyalangan_namuna.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        label: newsLabel.trim(),
        picture_urls: uploadedPics
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
      setIsFormOpen(false);
      fetchNewsEvents();
    } catch (err) {
      console.error('Error saving news event:', err);
    } finally {
      setIsSubmittingNews(false);
    }
  };

  // Delete News/Event
  const handleDeleteNews = async (id: number) => {
    if (!confirm('Ushbu yangilikni o\'chirib yubormoqchimisiz? Uni mobil ilovadan qaytarib bo\'lmaydi.')) return;
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

      {/* Slide-in Drawer Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '410px',
          maxWidth: '100%',
          background: '#fcfcf9',
          boxShadow: '-10px 0 40px -10px rgba(15, 23, 42, 0.08)',
          zIndex: 1000,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #e5e7eb'
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
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs Selector */}
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
              padding: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: activeTab === 'settings' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
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
              padding: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: activeTab === 'news' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            News and Events
          </button>
        </div>

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
                  {[
                    { id: 'ENG', title: 'Ingliz Tili', desc: 'Sinflarning darajalari va grand testlari', color: '#166534', bg: '#f0fdf4' },
                    { id: 'MATH', title: 'Matematika', desc: 'Matematika darajalari va grand testlari', color: '#0d9488', bg: '#f0fdfa' },
                    { id: 'ALL', title: 'Umumiy Tahlil', desc: 'Foizlarda natijalar, davomat va vazifalar', color: '#4f46e5', bg: '#e0e7ff' }
                  ].map(subj => {
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

              <div style={{ height: '1px', background: '#e2e8f0', margin: '1.5rem 0' }} />

              {/* Section 2: Admin Mode Toggle */}
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
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Faol sinf:</span>
                        <strong style={{ color: '#0f172a' }}>{activeClass}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                        <span>Jami o'quvchilar:</span>
                        <strong style={{ color: '#0f172a' }}>{students.length} ta</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                    </div>
                  </div>
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
                  <span>YANGILIK YOKI TADBIR QO'SHISH</span>
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
                  {/* Category Label Input */}
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

                  {/* Pictures Upload Area */}
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
                    
                    return (
                      <div 
                        key={item.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
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
                            {/* Label Tag */}
                            <span style={{
                              background: '#f1f5f9', color: '#475569',
                              padding: '0.2rem 0.5rem', borderRadius: '6px',
                              fontSize: '0.62rem', fontWeight: 800
                            }}>
                              {item.label}
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
                          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
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

                        {/* Pictures Carousel/Grid Row */}
                        {item.picture_urls && item.picture_urls.length > 0 && (
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
      />
    </>
  );
};

export default SidebarDrawer;
