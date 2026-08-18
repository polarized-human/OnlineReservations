<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CalendarController extends Controller
{
    public function getMonthStatus(Request $request)
    {
        // 1. Ambil bulan & tahun (default: saat ini)
        $month = $request->input('month', Carbon::now()->month);
        $year  = $request->input('year', Carbon::now()->year);

        // 2. Ambil semua reservasi di bulan tersebut yang masih AKTIF
        // Hanya 'Menunggu' dan 'Disetujui' yang dianggap "mengisi" slot ruangan,
        // konsisten dengan logika anti-bentrok di ReservationController@store.
        // 'Selesai' dan 'Ditolak' tidak dihitung karena tidak lagi memblokir slot.
        $reservations = Reservation::with('room')
            ->whereYear('tanggal', $year)
            ->whereMonth('tanggal', $month)
            ->whereIn('status', ['Menunggu', 'Disetujui'])
            ->get();

        $bookedDays = [];
        $agendas    = [];

        // 4. Pengelompokan data per tanggal
        foreach ($reservations as $res) {
            $date = $res->tanggal;

            // Simpan detail per booking untuk cek kondisi penuh
            $bookedDays[$date][] = [
                'room_id'       => $res->room_id,
                'waktu_mulai'   => substr($res->waktu_mulai, 0, 5),
                'waktu_selesai' => substr($res->waktu_selesai, 0, 5),
            ];

            // Format agenda untuk panel kanan kalender
            $agendas[$date][] = [
                'id'      => (string) $res->id,
                'waktu'   => substr($res->waktu_mulai, 0, 5) . ' - ' . substr($res->waktu_selesai, 0, 5),
                'agenda'  => $res->agenda,
                'ruangan' => $res->room ? $res->room->nama : 'Ruang Tidak Tersedia',
                'status'  => $res->status,
            ];
        }

        $calendarStatus = [];
        $daysInMonth    = Carbon::createFromDate($year, $month, 1)->daysInMonth;
        $today          = Carbon::now()->format('Y-m-d');

        // Jam sewa penuh: mulai paling lambat 08:00, selesai paling cepat 17:00
        // (mencakup sewa_penuh toggle frontend dan booking seharian serupa)
        $SEWA_PENUH_MULAI   = '08:00';
        $SEWA_PENUH_SELESAI = '17:00';

        // 5. Looping untuk menentukan status warna dan menyisipkan agenda
        for ($i = 1; $i <= $daysInMonth; $i++) {
            $currentDate = Carbon::createFromDate($year, $month, $i)->format('Y-m-d');
            $color       = 'kosong'; // Default

            if (isset($bookedDays[$currentDate])) {
                $bookingsHariIni = $bookedDays[$currentDate];
                $isPenuh         = false;

                // --- KONDISI 1: Ada booking sewa penuh (08:00 - 17:00 atau lebih luas) ---
                foreach ($bookingsHariIni as $booking) {
                    if ($booking['waktu_mulai'] <= $SEWA_PENUH_MULAI &&
                        $booking['waktu_selesai'] >= $SEWA_PENUH_SELESAI) {
                        $isPenuh = true;
                        break;
                    }
                }

                // --- KONDISI 2: Satu ruangan yang sama dibooking oleh 2+ orang ---
                if (!$isPenuh) {
                    $roomBookingCount = [];
                    foreach ($bookingsHariIni as $booking) {
                        $rid = $booking['room_id'];
                        $roomBookingCount[$rid] = ($roomBookingCount[$rid] ?? 0) + 1;
                    }
                    // Jika ada ruangan dengan 2+ booking di hari yang sama → penuh
                    foreach ($roomBookingCount as $count) {
                        if ($count >= 2) {
                            $isPenuh = true;
                            break;
                        }
                    }
                }

                $color = $isPenuh ? 'penuh' : 'ada_jadwal';
            }

            $isToday = ($currentDate === $today);

            $calendarStatus[] = [
                'date'         => $currentDate,
                'color'        => $color,
                'is_today'     => $isToday,
                'booked_count' => isset($bookedDays[$currentDate]) ? count($bookedDays[$currentDate]) : 0,
                'agendas'      => $agendas[$currentDate] ?? [],
            ];
        }

        return response()->json([
            'success' => true,
            'month'   => (int) $month,
            'year'    => (int) $year,
            'data'    => $calendarStatus,
        ], 200);
    }
}