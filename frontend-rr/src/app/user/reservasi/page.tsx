"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// --- INTERFACES ---
interface Room {
  id: string;
  nama: string;
  kapasitas: number;
  fasilitas: string[];
  gambarUrl: string;
  model3dUrl?: string; 
  status: 'Tersedia' | 'Sedang Digunakan' | 'Maintenance';
}

// Generate Time Slots (07:00 - 20:00 dengan interval 30 menit)
const timeSlots: string[] = [];
for (let i = 7; i <= 20; i++) {
  timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
  timeSlots.push(`${i.toString().padStart(2, '0')}:30`);
}

export default function UserReservasiPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // State untuk Modal 3D Viewer
  const [is3DModalOpen, setIs3DModalOpen] = useState(false);
  const [active3DRoom, setActive3DRoom] = useState<Room | null>(null);

  // State untuk Toast & Modal Konfirmasi Hapus
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isToastClosing, setIsToastClosing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);

  // Setup URL API
  const baseUrl = '/api';

  // State untuk form
  const [formData, setFormData] = useState({
    tanggal: '',
    waktuMulai: '',
    waktuSelesai: '',
    agenda: '',
    peserta: '',
    catatan: ''
  });

  // State sewa penuh (08:00 - 17:00 / hari kerja penuh)
  const [sewaPenuh, setSewaPenuh] = useState(false);

  const handleSewaPenuh = (checked: boolean) => {
    setSewaPenuh(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, waktuMulai: '08:00', waktuSelesai: '17:00' }));
      // Sinkronisasi visual drag ke slot 08:00 - 17:00
      const startIdx = timeSlots.indexOf('08:00');
      const endIdx = timeSlots.indexOf('17:00') - 1;
      setDragStartIndex(startIdx !== -1 ? startIdx : null);
      setDragEndIndex(endIdx >= 0 ? endIdx : null);
    } else {
      setFormData(prev => ({ ...prev, waktuMulai: '', waktuSelesai: '' }));
      setDragStartIndex(null);
      setDragEndIndex(null);
    }
  };

  // =========================================
  // STATE & LOGIKA UNTUK DRAG-AND-DROP TIME
  // =========================================
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null);
  const timeGridRef = useRef<HTMLDivElement>(null);

  

  const handleMouseDown = (index: number) => {
    setIsDragging(true);
    setDragStartIndex(index);
    setDragEndIndex(index);
  };

  const handleMouseEnter = (index: number) => {
    if (isDragging) {
      setDragEndIndex(index);
    }
  };

// Update FormData SAAT mouse selesai dilepas (Drag & Drop)
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (dragStartIndex !== null && dragEndIndex !== null) {
        const start = Math.min(dragStartIndex, dragEndIndex);
        const end = Math.max(dragStartIndex, dragEndIndex);
        
        setFormData(prev => ({
          ...prev,
          waktuMulai: timeSlots[start],
          waktuSelesai: timeSlots[end + 1] || '21:00'
        }));
      }
    }
  };

  // Fungsi khusus untuk sinkronisasi jika user mengetik manual di input jam
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    const newWaktuMulai = name === 'waktuMulai' ? value : formData.waktuMulai;
    const newWaktuSelesai = name === 'waktuSelesai' ? value : formData.waktuSelesai;

    if (newWaktuMulai && newWaktuSelesai) {
      const sIndex = timeSlots.indexOf(newWaktuMulai);
      const eIndex = timeSlots.indexOf(newWaktuSelesai) - 1;
      
      if (sIndex !== -1 && eIndex !== -1 && eIndex >= sIndex) {
        setDragStartIndex(sIndex);
        setDragEndIndex(eIndex);
      }
    }
  };

  // Mencegah error jika mouse dilepas di luar grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // Evaluasi apakah slot waktu sedang di-highlight
  const isSlotSelected = (index: number) => {
    if (dragStartIndex === null || dragEndIndex === null) return false;
    const start = Math.min(dragStartIndex, dragEndIndex);
    const end = Math.max(dragStartIndex, dragEndIndex);
    return index >= start && index <= end;
  };
  // =========================================


  // State untuk mendeteksi client-side (agar createPortal tidak error saat SSR Next.js)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // =========================================
  // 1. FETCH DATA RUANGAN DARI BACKEND
  // =========================================
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('user_role');
      
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
        const response = await fetch(`${baseUrl}/rooms`, {
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const mappedRooms: Room[] = data.map((room: any) => ({
            id: room.id.toString(),
            nama: room.nama,
            kapasitas: room.kapasitas,
            fasilitas: room.fasilitas || [],
            gambarUrl: room.gambar_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
            model3dUrl: room.model3d_url || '', 
            status: room.status === 'Aktif' ? 'Tersedia' : 'Maintenance'
          }));
          setRooms(mappedRooms);
        }
      } catch (error) {
        console.error("Gagal memuat ruangan:", error);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [baseUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getClean3DUrl = (url: string) => {
    const hasParams = url.includes('?');
    return `${url}${hasParams ? '&' : '?'}autostart=1&ui_infos=0&ui_watermark=0&ui_controls=1`;
  };

  const open3DViewer = (room: Room) => {
    setActive3DRoom(room);
    setIs3DModalOpen(true);
  };

  const closeToast = () => {
    setIsToastClosing(true);
    setTimeout(() => {
      setSuccessMessage(null);
      setIsToastClosing(false);
    }, 400); 
  };

  const closeDeleteModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setDeleteConfirmId(null);
      setIsModalClosing(false);
    }, 300);
  };


  // =========================================
  // 2. SUBMIT DATA RESERVASI KE BACKEND
  // =========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return alert("Pilih ruangan terlebih dahulu!");
    if (!formData.waktuMulai || !formData.waktuSelesai) return alert("Pilih waktu mulai dan selesai terlebih dahulu!");
    
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const detailAgenda = `${formData.agenda} (Peserta: ${formData.peserta} Orang. Catatan: ${formData.catatan || '-'})`;

      const payload = {
        room_id: selectedRoom.id,
        tanggal: formData.tanggal,
        waktu_mulai: formData.waktuMulai,
        waktu_selesai: formData.waktuSelesai,
        agenda: detailAgenda
      };

      const response = await fetch(`${baseUrl}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(token && { 'Authorization': `Bearer ${token}` }) 
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage("Berhasil! Permohonan untuk ruangan telah diajukan dan menunggu verifikasi Admin.");
        setTimeout(() => {
          closeToast();
        }, 3000);
        setFormData({ tanggal: '', waktuMulai: '', waktuSelesai: '', agenda: '', peserta: '', catatan: '' });
        setSelectedRoom(null);
        setDragStartIndex(null);
        setDragEndIndex(null);
        setSewaPenuh(false);
      } else {
        alert(result.message || "Gagal mengirim permohonan reservasi.");
      }

    } catch (error) {
      console.error("Error submitting:", error);
      alert("Terjadi kesalahan jaringan saat mengirim data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const render3DModal = () => {
    if (!is3DModalOpen || !active3DRoom || !mounted) return null;
    
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIs3DModalOpen(false)}></div>
        
        <div className="relative w-full max-w-5xl h-[85vh] bg-white border border-slate-200 rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
          
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80 backdrop-blur-md relative z-20">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_#ec4899]"></span>
                Live 3D Layout: <span className="text-pink-600">{active3DRoom.nama}</span>
              </h3>
            </div>
            <button onClick={() => setIs3DModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm p-2 rounded-full transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="flex-1 bg-slate-900 w-full h-full relative overflow-hidden">
            {!active3DRoom.model3dUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-0 bg-slate-100">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <p className="font-bold text-slate-500">Model 3D belum tersedia untuk ruangan ini.</p>
              </div>
            ) : (
              <iframe 
                title={`3D View ${active3DRoom.nama}`} 
                src={getClean3DUrl(active3DRoom.model3dUrl)} 
                className="absolute inset-0 w-full h-full z-0" 
                frameBorder="0" 
                allow="autoplay; fullscreen; vr"
              ></iframe>
            )}
          </div>
        </div>
      </div>,
      document.body 
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Buat Reservasi Baru</h1>
        <p className="text-sm text-slate-500 mt-2 font-medium">
          Pilih ruangan yang tersedia dan isi detail kegiatan Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI: PILIH RUANGAN (Aero Glass Theme) */}
        <div className="lg:col-span-1 flex flex-col h-[750px] shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2rem] overflow-hidden bg-white/60 backdrop-blur-2xl border border-white">
          <div className="bg-white/40 border-b border-slate-100 p-6">
            <h3 className="font-extrabold text-slate-800 mb-4 tracking-tight">1. Pilih Ruangan</h3>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input 
                type="text" 
                placeholder="Cari kapasitas, fasilitas..." 
                className="pl-11 w-full text-sm bg-white/80 border border-white shadow-sm rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-400 py-3 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex-1 bg-white/20 p-4 overflow-y-auto custom-scrollbar space-y-3">
            {isLoadingRooms ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                 <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Memuat Ruangan...</p>
              </div>
            ) : rooms.length === 0 ? (
               <p className="text-center text-slate-400 text-sm mt-10 font-bold">Belum ada ruangan tersedia.</p>
            ) : (
              rooms.map((room) => (
                <div 
                  key={room.id}
                  onClick={() => room.status === 'Tersedia' && setSelectedRoom(room)}
                  className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
                    room.status !== 'Tersedia' 
                    ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50/50' :
                    selectedRoom?.id === room.id 
                    ? 'border-pink-300 bg-pink-50 shadow-[0_8px_20px_rgba(236,72,153,0.15)] cursor-pointer scale-[1.02]' 
                    : 'border-white bg-white/60 hover:bg-white shadow-sm hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200 shadow-inner">
                      <img src={room.gambarUrl} alt={room.nama} className="w-full h-full object-cover opacity-90" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{room.nama}</h4>
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border ${
                          room.status === 'Tersedia' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {room.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-bold">Kapasitas: {room.kapasitas} Orang</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">{room.fasilitas.join(', ')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KOLOM KANAN: FORMULIR RESERVASI (Aero Glass Theme) */}
        <div className="lg:col-span-2 bg-white/60 border border-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] backdrop-blur-2xl overflow-hidden flex flex-col h-[750px]">
          
          <div className="p-6 md:px-8 border-b border-slate-100 bg-white/40">
            <h3 className="font-extrabold text-slate-800 tracking-tight">2. Detail Kegiatan & Waktu</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {!selectedRoom ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
                </div>
                <p className="text-sm font-bold text-slate-500">Pilih ruangan di sebelah kiri terlebih dahulu.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Info Ruangan Terpilih + Tombol Lihat 3D */}
                <div className="bg-pink-50/50 border border-pink-100 shadow-sm p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold text-pink-500 uppercase tracking-widest">Ruangan Terpilih</p>
                    <p className="text-lg font-black text-slate-800 mt-1 leading-tight">{selectedRoom.nama}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Kapasitas: {selectedRoom.kapasitas} Orang</p>
                  </div>
                  
                  {selectedRoom.model3dUrl && (
                    <button 
                      type="button" 
                      onClick={() => open3DViewer(selectedRoom)}
                      className="px-5 py-2.5 bg-white hover:bg-slate-50 text-pink-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-pink-200 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
                      Lihat 3D Ruangan
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                  
                  {/* BAGIAN KIRI FORM: Tanggal & Waktu (Google Calendar Style) */}
                  <div className="space-y-5">
                    
                    {/* Input Tanggal Standard */}
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-focus-within:text-pink-500 transition-colors">Tanggal Reservasi</label>
                      <input required type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} className="w-full bg-slate-50/50 border border-slate-200 shadow-inner rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-400 focus:bg-white transition-all font-medium" />
                    </div>

                    {/* Toggle Sewa Penuh */}
                    <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-slate-700">Sewa Penuh Hari</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">08:00 – 17:00 (jam kerja penuh)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSewaPenuh(!sewaPenuh)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${
                          sewaPenuh ? 'bg-pink-500' : 'bg-slate-300'
                        }`}
                        aria-checked={sewaPenuh}
                        role="switch"
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                          sewaPenuh ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {/* Timeline Waktu Interaktif (Drag & Drop) */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${sewaPenuh ? 'text-slate-300' : 'text-slate-400'}`}>
                          {sewaPenuh ? 'Waktu (Dikunci - Sewa Penuh)' : 'Waktu (Pilih & Geser)'}
                        </label>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${sewaPenuh ? 'bg-pink-50 text-pink-500 border-pink-200' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                          {formData.waktuMulai ? `${formData.waktuMulai} – ${formData.waktuSelesai}` : 'Pilih Jam'}
                        </span>
                      </div>
                      
                      {/* Grid Container — dinonaktifkan saat sewaPenuh */}
                      <div 
                        ref={timeGridRef}
                        onMouseLeave={!sewaPenuh ? handleMouseUp : undefined}
                        className={`h-[220px] overflow-y-auto custom-scrollbar border rounded-xl bg-white shadow-inner relative select-none transition-all ${
                          sewaPenuh ? 'border-slate-100 opacity-50 pointer-events-none cursor-not-allowed' : 'border-slate-200'
                        }`}
                      >
                        {timeSlots.map((time, index) => (
                          <div 
                            key={index}
                            onMouseDown={!sewaPenuh ? () => handleMouseDown(index) : undefined}
                            onMouseEnter={!sewaPenuh ? () => handleMouseEnter(index) : undefined}
                            onMouseUp={!sewaPenuh ? handleMouseUp : undefined}
                            className={`flex items-center px-4 py-1.5 border-b border-slate-50 transition-colors ${
                              sewaPenuh ? 'cursor-not-allowed' : 'cursor-pointer'
                            } ${
                              isSlotSelected(index) 
                                ? 'bg-pink-100 border-pink-200 border-b-pink-200 z-10 relative shadow-[inset_4px_0_0_#ec4899]' 
                                : sewaPenuh ? '' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className={`text-xs font-bold w-12 ${isSlotSelected(index) ? 'text-pink-600' : 'text-slate-400'}`}>
                              {time}
                            </span>
                            <div className="flex-1 ml-4 border-t border-dashed border-slate-200"></div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 italic mt-1">
                        {sewaPenuh ? '*Mode sewa penuh aktif. Matikan toggle untuk memilih jam manual.' : '*Anda juga dapat menyesuaikan waktu secara manual di bawah ini.'}
                      </p>
                    </div>

                    {/* Fallback Input Manual — dinonaktifkan saat sewaPenuh */}
                    <div className={`grid grid-cols-2 gap-4 transition-opacity ${sewaPenuh ? 'opacity-50' : ''}`}>
                      <div className="space-y-1 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mulai</label>
                        <input
                          required
                          type="time"
                          name="waktuMulai"
                          value={formData.waktuMulai}
                          onChange={!sewaPenuh ? handleTimeChange : undefined}
                          disabled={sewaPenuh}
                          className={`w-full bg-slate-50/50 border border-slate-200 shadow-inner rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-pink-400 font-medium ${sewaPenuh ? 'cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div className="space-y-1 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selesai</label>
                        <input
                          required
                          type="time"
                          name="waktuSelesai"
                          value={formData.waktuSelesai}
                          onChange={!sewaPenuh ? handleTimeChange : undefined}
                          disabled={sewaPenuh}
                          className={`w-full bg-slate-50/50 border border-slate-200 shadow-inner rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-pink-400 font-medium ${sewaPenuh ? 'cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                  </div>

                  {/* BAGIAN KANAN FORM: Detail Agenda */}
                  <div className="space-y-5">
                    {/* Agenda */}
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-focus-within:text-pink-500 transition-colors">Nama Kegiatan / Agenda</label>
                      <input required type="text" name="agenda" value={formData.agenda} onChange={handleInputChange} placeholder="Contoh: Rapat Koordinasi Tahunan" className="w-full bg-slate-50/50 border border-slate-200 shadow-inner rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-400 focus:bg-white transition-all font-medium" />
                    </div>

                    {/* Peserta */}
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-focus-within:text-pink-500 transition-colors">Estimasi Jumlah Peserta</label>
                      <input required type="number" name="peserta" value={formData.peserta} onChange={handleInputChange} placeholder={`Maksimal ${selectedRoom.kapasitas} Orang`} max={selectedRoom.kapasitas} className="w-full bg-slate-50/50 border border-slate-200 shadow-inner rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-400 focus:bg-white transition-all font-medium" />
                    </div>

                    {/* Catatan */}
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-focus-within:text-pink-500 transition-colors">Catatan Tambahan (Opsional)</label>
                      <textarea name="catatan" value={formData.catatan} onChange={handleInputChange} rows={4} placeholder="Contoh: Tolong siapkan 2 mic tambahan..." className="w-full bg-slate-50/50 border border-slate-200 shadow-inner rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-400 focus:bg-white transition-all resize-none font-medium"></textarea>
                    </div>
                  </div>

                </div>

              </form>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="p-6 md:px-8 border-t border-slate-100 bg-white/40 flex justify-end gap-4 rounded-b-[2rem]">
            <button type="button" onClick={() => { setSelectedRoom(null); setDragStartIndex(null); setDragEndIndex(null); setSewaPenuh(false); }} className="px-6 py-3 text-sm font-bold text-slate-500 bg-white hover:text-slate-900 border border-slate-200 rounded-xl shadow-sm hover:shadow transition-all">
              Batal
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!selectedRoom || isSubmitting}
              className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 flex items-center gap-2 ${
                !selectedRoom ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_8px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_8px_25px_rgba(236,72,153,0.4)] active:scale-95 hover:-translate-y-0.5'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </span>
              ) : (
                "Kirim Permohonan"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RENDER MODAL 3D DENGAN PORTAL AGAR BEBAS DARI Z-INDEX TRAP */}
      {render3DModal()}


      {/* TOAST NOTIFICATION                        */}
      {successMessage && (
        <div className={`fixed top-6 right-6 z-[70] ${isToastClosing ? 'animate-out slide-out-to-right' : 'animate-in slide-in-from-right duration-300'}`}>
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-[0_10px_40px_rgba(52,211,153,0.15)] flex items-center space-x-4">
            <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Berhasil!</h4>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{successMessage}</p>
            </div>
            <button onClick={closeToast} className="pl-4 text-slate-400 hover:text-slate-800 transition duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}