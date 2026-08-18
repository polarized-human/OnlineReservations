"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// --- INTERFACES ---
interface UserProfile {
  nama: string;
  instansi: string;
}

interface Metric {
  label: string;
  value: string | number;
  sub: string;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

interface Agenda {
  id: string;
  waktu: string;
  agenda: string;
  ruangan: string;
  status: 'Disetujui' | 'Menunggu' | 'Selesai' | 'Berlangsung' | string;
}

interface DayData {
  date: string;
  color: 'kosong' | 'ada_jadwal' | 'penuh';
  is_today: boolean;
  booked_count: number;
  agendas: Agenda[];
}

export default function UserDashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  // --- STATE KALENDER (Terintegrasi) ---
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  
  const formatToYYYYMMDD = (d: Date) => {
    const offset = d.getTimezoneOffset();
    const adjusted = new Date(d.getTime() - (offset * 60 * 1000));
    return adjusted.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState<string>(formatToYYYYMMDD(today));
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);

  // --- STATE & LOGIKA UNTUK CHATBOT ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>([]); 
  const [messages, setMessages] = useState<{sender: 'bot' | 'user', text: string}[]>([
    { sender: 'bot', text: 'Halo! 👋 Ada yang bisa saya bantu terkait reservasi ruangan Anda? Silakan pilih topik pertanyaan di bawah ini.' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Deklarasi Base URL dari Environment Variable
  const baseUrl = '/api';

  // Auto-scroll ke pesan terbaru saat chat terbuka atau bertambah
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen]);

  // =========================================
  // 1. FETCH DATA DASHBOARD UTAMA
  // =========================================
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('user_role') || localStorage.getItem('role'); 
        
        if (!token || !role) {
          localStorage.clear();
          window.location.href = '/login';
          return;
        }

        if (role === 'Admin Kominfotik' || role === 'Superadmin') {
          window.location.href = '/admin';
          return;
        }
        if (role === 'Verifikator') {
          window.location.href = '/verifikator';
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json', 
          'ngrok-skip-browser-warning': 'true', 
          ...(token && { 'Authorization': `Bearer ${token}` }) 
        };

        const response = await fetch(`${baseUrl}/user`, { method: 'GET', headers });
        if (response.ok) {
           const data = await response.json();
           setUserProfile(data.user);
           setMetrics(data.metrics);
        }

        const faqResponse = await fetch(`${baseUrl}/faqs`, { method: 'GET', headers });
        if (faqResponse.ok) {
           const faqData = await faqResponse.json();
           if (faqData.success) setFaqs(faqData.data);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchDashboardData();
  }, [baseUrl]);

  // =========================================
  // 2. FETCH DATA KALENDER (TRIGGER SAAT BULAN BERUBAH)
  // =========================================
  useEffect(() => {
    const fetchCalendar = async () => {
      setIsCalendarLoading(true);
      try {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('user_role');
      
        if (!token || !role) return;

        const month = currentDate.getMonth() + 1; 
        const year = currentDate.getFullYear();
        
        const response = await fetch(`${baseUrl}/calendar/status?month=${month}&year=${year}`, {
          headers: { 
            'Accept': 'application/json', 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}` 
          }
        });
        
        if (response.status === 401) {
          localStorage.clear();
          window.location.href = '/login';
          return;
        }

        if (response.ok) {
          const res = await response.json();
          if (res.success && res.data) {
            setCalendarData(res.data);
          } else if (Array.isArray(res)) {
            setCalendarData(res);
          }
        }
      } catch (error) {
        console.error("Gagal menarik data kalender:", error);
      } finally {
        setIsCalendarLoading(false);
      }
    };

    fetchCalendar();
  }, [currentDate, baseUrl]);


  // Handler Chatbot
  const handleFaqClick = (faq: FAQ) => {
    setMessages(prev => [...prev, { sender: 'user', text: faq.question }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'bot', text: faq.answer }]);
    }, 600); 
  };

  // --- LOGIKA UI KALENDER ---
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const emptyDaysCount = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
  const emptyDays = Array.from({ length: emptyDaysCount }, (_, i) => i);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const namaHari = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  const selectedDayData = calendarData.find(d => d.date === selectedDate);
  const jadwalHariIni = selectedDayData ? selectedDayData.agendas : [];

  const storedName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      
      {/* ========================================= */}
      {/* BANNER GREETING & METRICS (AERO GLASS)    */}
      {/* ========================================= */}
      <div className="relative bg-white/60 backdrop-blur-3xl border border-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-pink-100/50 rounded-full blur-[60px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-32 sm:w-40 h-32 sm:h-40 bg-purple-100/50 rounded-full blur-[50px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row justify-between gap-6 sm:gap-8">
          
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center space-x-2 bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-full mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_5px_#ec4899]"></span>
              <span className="text-[10px] font-extrabold text-pink-600 uppercase tracking-widest">User Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-2">
              Halo, {isLoadingDashboard ? 'Memuat...' : (userProfile?.nama || storedName || 'Pengguna')}
            </h1>
            <p className="text-slate-500 text-sm max-w-lg leading-relaxed font-medium mx-auto sm:mx-0">
              Selamat datang di Sistem Reservasi Ruangan. Pantau jadwal dan kelola permohonan ruangan Anda di sini.
            </p>
          </div>

          {/* Metrics - Dioptimalkan dengan snap-scrolling untuk mobile */}
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory custom-scrollbar scroll-smooth w-full xl:w-auto">
            {(metrics.length > 0 ? metrics : [
              { label: 'Total Reservasi', value: '-', sub: 'Bulan ini' },
              { label: 'Menunggu', value: '-', sub: 'Persetujuan' },
              { label: 'Digunakan', value: '-', sub: 'Hari Ini' }
            ]).map((metric, idx) => (
              <div key={idx} className="snap-center shrink-0 bg-white/80 border border-white p-4 sm:p-5 rounded-3xl min-w-[130px] sm:min-w-[140px] flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800">{isLoadingDashboard ? '-' : metric.value}</h3>
                <p className="text-[10px] sm:text-[11px] font-extrabold text-pink-600 mt-1">{metric.label}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 font-medium">{metric.sub}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ========================================= */}
      {/* KALENDER JADWAL TERINTEGRASI DASHBOARD    */}
      {/* ========================================= */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-8 sm:mt-10 mb-4 sm:mb-6 pl-2">Kalender Jadwal</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:min-h-[600px]">
          
          {/* KOLOM KIRI: KALENDER INTERAKTIF */}
          <div className="lg:col-span-2 bg-white/60 border border-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 md:p-8 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col relative overflow-hidden">
            
            {isCalendarLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Calendar Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {namaBulan[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button onClick={prevMonth} className="px-4 py-2 sm:p-2 rounded-xl bg-white/50 hover:bg-white border border-slate-100 text-slate-900 transition-all shadow-sm flex-1 sm:flex-none flex justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <button onClick={nextMonth} className="px-4 py-2 sm:p-2 rounded-xl bg-white/50 hover:bg-white border border-slate-100 text-slate-900 transition-all shadow-sm flex-1 sm:flex-none flex justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
              {namaHari.map((hari, idx) => (
                <div key={idx} className={`text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest ${idx === 5 || idx === 6 ? 'text-pink-500' : 'text-slate-500'}`}>
                  {hari}
                </div>
              ))}
            </div>

            {/* Grid Dates - Padding & Min-Height dioptimalkan untuk layar kecil */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1">
              {emptyDays.map(empty => (
                <div key={`empty-${empty}`} className="min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 rounded-xl bg-transparent"></div>
              ))}
              
              {monthDays.map(day => {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const isToday = formatToYYYYMMDD(new Date()) === dateStr;
                const dayDataFromApi = calendarData.find(d => d.date === dateStr);

                // Cek apakah hari ini sudah lewat (sebelum hari ini)
                const todayStr = formatToYYYYMMDD(new Date());
                const isPast = dateStr < todayStr;

                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative min-h-[60px] sm:min-h-[80px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer group flex flex-col ${
                      isSelected 
                        ? 'border-pink-400 bg-pink-50 shadow-[0_4px_15px_rgba(236,72,153,0.1)]' 
                        : isPast
                        ? 'border-slate-100 bg-slate-50/30 opacity-40'
                        : 'border-slate-100 bg-white/40 hover:bg-white/80 hover:border-pink-200 hover:shadow-sm'
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-bold ml-0.5 sm:ml-1 ${
                      isToday ? 'text-pink-600' 
                      : isSelected ? 'text-slate-900' 
                      : isPast ? 'text-slate-400'
                      : 'text-slate-500 group-hover:text-slate-900'
                    }`}>
                      {day}
                    </span>
                    
                    {/* Titik indikator HANYA ditampilkan untuk hari ini dan ke depan */}
                    {!isPast && (
                      <div className="mt-auto flex flex-wrap gap-1 px-0.5 sm:px-1 pb-0.5 sm:pb-1">
                        {dayDataFromApi?.color === 'penuh' && (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Full Booked"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                          </>
                        )}
                        {dayDataFromApi?.color === 'ada_jadwal' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Ada Agenda"></div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest justify-center items-center">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Ada Agenda</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Padat / Full Booked</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Hari Lampau</div>
            </div>
          </div>

          {/* KOLOM KANAN: DETAIL AGENDA */}
          <div className="lg:col-span-1 bg-white/60 border border-white rounded-[1.5rem] sm:rounded-[2rem] flex flex-col h-[500px] lg:h-auto backdrop-blur-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
            
            <div className="p-4 sm:p-6 border-b border-white/60 bg-white/40">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">Agenda Harian</h3>
              <p className="text-[11px] sm:text-xs text-pink-500 mt-1 font-medium">
                {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-3 sm:space-y-4">
              {jadwalHariIni.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <p className="text-xs sm:text-sm font-medium">Tidak ada jadwal.</p>
                </div>
              ) : (
                jadwalHariIni.map((jadwal) => (
                  <div key={jadwal.id} className="bg-white border border-slate-100 p-4 sm:p-5 rounded-xl sm:rounded-2xl hover:border-pink-200 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <span className="text-[10px] sm:text-xs font-bold text-pink-600 bg-pink-50 px-2 sm:px-2.5 py-1 rounded-lg border border-pink-100 shrink-0">
                        {jadwal.waktu}
                      </span>
                      <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-1 rounded-md uppercase tracking-wider text-right ${
                        jadwal.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        jadwal.status === 'Selesai' ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                        jadwal.status === 'Berlangsung' ? 'bg-purple-50 text-purple-600 border border-purple-100 animate-pulse' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {jadwal.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm mb-2 line-clamp-2">{jadwal.agenda}</h4>
                    <div className="flex items-center text-[11px] sm:text-xs text-slate-500 mt-2 font-medium">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-slate-400 group-hover:text-pink-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                      <span className="truncate">{jadwal.ruangan}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-white/60 bg-white/40">
              <Link href="/user/reservasi" className="block w-full">
                <button className="w-full py-2.5 sm:py-3 bg-white hover:bg-pink-50 border border-slate-200 hover:border-pink-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:text-pink-600 shadow-sm transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  Buat Reservasi Baru
                </button>
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* 🚀 CHATBOT FLOATING WIDGET                */}
      {/* ========================================= */}
      
      {isChatOpen && (
        <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white/95 backdrop-blur-3xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[1.5rem] sm:rounded-[2rem] flex flex-col z-[100] animate-in slide-in-from-bottom-5 duration-300 overflow-hidden">
          
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 relative">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm leading-tight">Bantuan User</h3>
                <p className="text-[9px] sm:text-[10px] text-pink-100 uppercase tracking-wider font-bold">Online</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsChatOpen(false)} className="text-white/70 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="flex-1 p-4 sm:p-5 h-[200px] sm:h-[250px] overflow-y-auto custom-scrollbar flex flex-col gap-3 sm:gap-4 bg-slate-50/50">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] sm:max-w-[85%] p-2.5 sm:p-3 text-[12px] sm:text-[13px] font-medium leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-pink-500 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex flex-col gap-2 max-h-[160px] sm:max-h-[180px] overflow-y-auto custom-scrollbar">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Pertanyaan Umum</p>
            {faqs.length === 0 ? (
              <p className="text-[11px] sm:text-xs text-slate-400 italic text-center py-2">Memuat pilihan...</p>
            ) : (
              faqs.map((faq) => (
                <button 
                  key={faq.id}
                  onClick={() => handleFaqClick(faq)}
                  className="text-left w-full text-[12px] sm:text-[13px] font-medium bg-pink-50/50 text-pink-700 hover:bg-pink-100 p-2.5 sm:p-3 rounded-xl border border-pink-100 transition-colors shadow-sm"
                >
                  {faq.question}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <button 
        type="button"
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[100] w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(236,72,153,0.3)] transition-all duration-300 hover:scale-110 active:scale-95 ${
          isChatOpen ? 'bg-slate-800 text-white rotate-180' : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white animate-bounce'
        }`}
      >
        {isChatOpen ? (
           <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : (
           <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        )}
        
        {!isChatOpen && (
          <span className="absolute top-0 right-0 flex h-3 w-3 sm:h-4 sm:w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-green-500 border-2 border-white"></span>
          </span>
        )}
      </button>

    </div>
  );
}