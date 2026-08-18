"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';

export default function AdminDashboardPage() {
  // State diatur mengikuti penamaan default komponen UI
  const [metrics, setMetrics] = useState({
    total_rooms: 0,
    total_reservations: 0,
    pending_reservations: 0,
    utilization_rate: '0%'
  });
  const [latestReservations, setLatestReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const baseUrl = '/api';

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);

      // --- DEBUGGING: Tampilkan semua isi localStorage ---
    console.log("--- DEBUG START ---");
    console.log("Token:", localStorage.getItem('token'));
    console.log("Role:", localStorage.getItem('user_role'));
    console.log("Semua key di localStorage:", { ...localStorage });
    console.log("--- DEBUG END ---");
    
      try {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('user_role');
      
      // 1. Cek apakah belum login
      if (!token || !role) {
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      // 2. CEK ROLE: Jika bukan Admin/Superadmin, tendang ke habitat asalnya!
      const normalizedRole = role.toLowerCase().trim();
      const isAdmin = normalizedRole === 'admin kominfotik' || normalizedRole === 'superadmin';

      if (!isAdmin) {
        console.warn("Role tidak dikenali atau tidak diizinkan:", role); // Debugging
        
        if (normalizedRole === 'verifikator') {
          window.location.href = '/verifikator';
        } else {
          window.location.href = '/user';
        }
        return; 
      }
        
        const headers = {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        };

        // 1. Fetch Metrics 
        const resMetrics = await fetch(`${baseUrl}/dashboard/metrics`, { headers });
        if (resMetrics.ok) {
          const dataMetrics = await resMetrics.json();
          
          // UPDATE DI SINI: Memetakan key camelCase Laravel ke state frontend
          setMetrics({
            total_rooms: dataMetrics.totalRuangan || 0,
            total_reservations: dataMetrics.totalReservasi || 0,
            pending_reservations: dataMetrics.menungguPersetujuan || 0,
            utilization_rate: dataMetrics.tingkatPenggunaan || '0%'
          });
        }

        // 2. Fetch Latest Reservations
        const resLatest = await fetch(`${baseUrl}/dashboard/latest-reservations`, { headers });
        if (resLatest.ok) {
          const dataLatest = await resLatest.json();
          
          // Karena backend langsung mengembalikan array formatted, kita bisa langsung set
          setLatestReservations(dataLatest);
        }
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [baseUrl]);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      
      {/* HEADER PAGE */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Dashboard Admin</h1>
        <p className="text-sm text-slate-500">Pantau aktivitas reservasi dan statistik penggunaan ruangan hari ini.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* ========================================= */}
          {/* METRICS CARDS                             */}
          {/* ========================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Card 1: Total Ruangan */}
            <div className="bg-white/60 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Ruangan</p>
                  <h3 className="text-3xl font-extrabold text-slate-900">{metrics.total_rooms}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                </div>
              </div>
            </div>

            {/* Card 2: Total Reservasi */}
            <div className="bg-white/60 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/20"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Reservasi</p>
                  <h3 className="text-3xl font-extrabold text-slate-900">{metrics.total_reservations}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
              </div>
            </div>

            {/* Card 3: Menunggu Verifikasi */}
            <div className="bg-white/60 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-amber-500/20"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1">Menunggu Verifikasi</p>
                  <h3 className="text-3xl font-extrabold text-slate-900">{metrics.pending_reservations}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
              </div>
            </div>

            {/* Card 4: Tingkat Penggunaan */}
            <div className="bg-white/60 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-pink-500/20"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1">Tingkat Utilitas</p>
                  <h3 className="text-3xl font-extrabold text-slate-900">{metrics.utilization_rate}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* LATEST RESERVATIONS TABLE                 */}
          {/* ========================================= */}
          <div className="bg-white/60 backdrop-blur-xl border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-slate-900">Reservasi Terbaru</h3>
              <Link href="/admin/reservasi" className="text-xs text-pink-400 font-bold uppercase tracking-widest hover:text-pink-300 transition-colors">
                Lihat Semua
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-500">
                <thead className="text-[10px] uppercase tracking-widest bg-black/40 text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-bold">Pemohon</th>
                    <th className="px-6 py-4 font-bold">Ruangan</th>
                    <th className="px-6 py-4 font-bold">Waktu Pelaksanaan</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {latestReservations.length > 0 ? (
                    latestReservations.map((res: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        {/* UPDATE DI SINI: Mengakses data flat sesuai format return backend */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-300">{res.pemohon}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-medium">{res.ruangan}</td>
                        <td className="px-6 py-4">
                          <div className="text-gray-300">{res.tanggal}</div>
                          <div className="text-[10px] text-gray-500">{res.waktu}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${res.status === 'Disetujui' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                              res.status === 'Ditolak' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}
                          >
                            {res.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                        Belum ada data reservasi terbaru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}