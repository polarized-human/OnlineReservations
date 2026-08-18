<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;

class ReservationController extends Controller
{
    // 1. TAMPILKAN SEMUA DATA (UNTUK ADMIN)
    public function index()
    {
        try {
            // Gunakan .with(['user', 'room']) untuk mengambil data relasi
            $reservations = Reservation::with(['user', 'room'])
                            ->orderBy('created_at', 'desc')
                            ->get();
            
            return response()->json(['success' => true, 'data' => $reservations], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil data', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {

        $request->validate([
            'room_id'       => 'required|exists:rooms,id',
            'tanggal'       => 'required|date_format:Y-m-d',
            'waktu_mulai'   => 'required|date_format:H:i',
            'waktu_selesai' => 'required|date_format:H:i|after:waktu_mulai',
            'agenda'        => 'required|string',
        ]);

        // 2. LOGIKA ANTI-BENTROK JADWAL (Disesuaikan dengan kolom baru)
        $isBooked = Reservation::where('room_id', $request->room_id)
            ->where('tanggal', $request->tanggal)
            ->whereIn('status', ['Menunggu', 'Disetujui']) // Hanya cek jadwal yang aktif
            ->where(function ($query) use ($request) {
                $query->where(function ($q) use ($request) {
                    $q->where('waktu_mulai', '<=', $request->waktu_mulai)
                      ->where('waktu_selesai', '>', $request->waktu_mulai);
                })->orWhere(function ($q) use ($request) {
                    $q->where('waktu_mulai', '<', $request->waktu_selesai)
                      ->where('waktu_selesai', '>=', $request->waktu_selesai);
                })->orWhere(function ($q) use ($request) {
                    $q->where('waktu_mulai', '>=', $request->waktu_mulai)
                      ->where('waktu_selesai', '<=', $request->waktu_selesai);
                });
            })->exists();

        if ($isBooked) {
            return response()->json([
                'success' => false,
                'message' => 'Ruangan sudah dibooking atau sedang menunggu persetujuan pada waktu tersebut.'
            ], 409);
        }

        // 3. Simpan ke database menggunakan nama kolom yang benar
        // Catatan: Jika auth()->id() null saat testing tanpa login, gunakan fallback user ID 1
        $userId = auth()->id() ?? $request->user_id ?? \App\Models\User::first()?->id;

        if (!$userId) {
        return response()->json(['message' => 'User tidak terdeteksi, silakan login!'], 401);
        }

        $reservation = Reservation::create([
            'user_id'       => $userId, 
            'room_id'       => $request->room_id,
            'tanggal'       => $request->tanggal,
            'waktu_mulai'   => $request->waktu_mulai,
            'waktu_selesai' => $request->waktu_selesai,
            'agenda'        => $request->agenda,
            'status'        => 'Menunggu' // Default huruf besar sesuai Enum Migration
        ]);

        // Notifikasi untuk Admin/Verifikator
        $reservation->load('room'); 
        
        $tglRequest = Carbon::parse($reservation->tanggal)->translatedFormat('d M Y');

        // --- NOTIFIKASI UNTUK USER PEMOHON (konfirmasi pengajuan diterima) ---
        Notification::create([
            'user_id' => $userId,
            'pesan'   => "Reservasi Anda untuk Ruangan {$reservation->room->nama} pada {$tglRequest} ({$reservation->waktu_mulai} - {$reservation->waktu_selesai}) sedang MENUNGGU PERSETUJUAN dari admin.",
            'unread'  => true,
        ]);

        // --- NOTIFIKASI UNTUK ADMIN/VERIFIKATOR ---
        $staffs = User::whereIn('role', ['Admin Kominfotik', 'Superadmin', 'Asisten/Pimpinan'])->get();

        foreach ($staffs as $staff) {
            Notification::create([
                'user_id' => $staff->id,
                'pesan'   => "Permohonan baru masuk dari {$request->user()->name} untuk Ruangan {$reservation->room->nama} pada tanggal {$tglRequest}.",
                'unread'  => true,
            ]);
        }

        return response()->json([
            'success' => true, 
            'message' => 'Reservasi berhasil diajukan, menunggu persetujuan.',
            'data'    => $reservation
        ], 201);

    }

    // 2. UPDATE STATUS OLEH ADMIN/VERIFIKATOR
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:Menunggu,Disetujui,Ditolak,Selesai'
        ]);

        $reservation = Reservation::find($id);

        if (!$reservation) {
            return response()->json(['success' => false, 'message' => 'Reservasi tidak ditemukan'], 404);
        }

        $reservation->update(['status' => $request->status]);
        
        // =========================================================
        // KIRIM NOTIFIKASI JIKA STATUS DISETUJUI / DITOLAK
        // =========================================================
        if (in_array($request->status, ['Disetujui', 'Ditolak'])) {
            
            // Tarik relasi room dan user agar kita bisa ambil namanya
            $reservation->load(['room', 'user']); 

            $tglRequest = Carbon::parse($reservation->tanggal)->translatedFormat('d M Y');
            $approverRole = $request->user() ? $request->user()->role : 'Verifikator';

            // --- A. NOTIFIKASI UNTUK USER PEMOHON ---
            if ($request->status === 'Disetujui') {
                $pesanUser = "✅ Reservasi Anda untuk Ruangan {$reservation->room->nama} pada {$tglRequest} ({$reservation->waktu_mulai} - {$reservation->waktu_selesai}) telah DISETUJUI oleh {$approverRole}. Silakan gunakan ruangan sesuai jadwal.";
            } else {
                $pesanUser = "❌ Reservasi Anda untuk Ruangan {$reservation->room->nama} pada {$tglRequest} ({$reservation->waktu_mulai} - {$reservation->waktu_selesai}) telah DITOLAK oleh {$approverRole}. Silakan hubungi admin untuk informasi lebih lanjut.";
            }

            Notification::create([
                'user_id' => $reservation->user_id,
                'pesan'   => $pesanUser,
                'unread'  => true,
            ]);

            // --- B. NOTIFIKASI UNTUK ADMIN/PENGURUS LAINNYA ---
            $semuaPengurus = \App\Models\User::where('role', '!=', 'User Bagian')->get();            
            
            foreach ($semuaPengurus as $pengurus) {
                if ($request->user() && $pengurus->id === $request->user()->id) continue;
                if ($pengurus->id === $reservation->user_id) continue;

                $statusTeks = $request->status === 'Disetujui' ? 'DISETUJUI' : 'DITOLAK';
                Notification::create([
                    'user_id' => $pengurus->id,
                    'pesan'   => "Reservasi {$reservation->room->nama} dari {$reservation->user->name} (Tgl: {$tglRequest}) telah {$statusTeks}.",
                    'unread'  => true,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Status berhasil diubah menjadi ' . $request->status,
        ], 200);
    }
}