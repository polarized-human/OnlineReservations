<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ApiController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\JadwalPimpinanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\NotificationController;

// ===================================================
// RUTE API PUBLIK (Bisa diakses tanpa login)
// ===================================================
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/rooms', [RoomController::class, 'index']); // Membolehkan katalog ruangan diakses publik

// --- RUTE GOOGLE SSO ---
Route::get('/auth/google', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);


// ===================================================
// RUTE API TERPROTEKSI (Wajib membawa Token Bearer Sanctum)
// ===================================================
Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('/logout', [AuthController::class, 'logout']);

    // Endpoint Dashboard & Admin Panel Metrics
    Route::get('/dashboard/metrics', [ApiController::class, 'getMetrics']);
    Route::get('/dashboard/latest-reservations', [ApiController::class, 'getLatestReservations']);

    // Ruangan (Manipulasi data internal wajib login)
    Route::apiResource('rooms', RoomController::class)->except(['index']);

    // Reservasi Ruangan Internal
    Route::apiResource('reservations', ReservationController::class);
    Route::put('/reservations/{id}/status', [ReservationController::class, 'updateStatus']);

    // Rute API Manajemen User
    Route::get('/user', [UserController::class, 'dashboard']);
    Route::get('/faqs', [FaqController::class, 'index']);
    Route::patch('/user/{id}/toggle-status', [UserController::class, 'toggleStatus']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::apiResource('users', UserController::class);

    // Rute API Kalender Status Bulanan
    Route::get('/calendar/status', [CalendarController::class, 'getMonthStatus']);

    // Rute API Jadwal Internal Pimpinan
    Route::apiResource('jadwal', JadwalPimpinanController::class);
    Route::put('/jadwal/{id}/status', [JadwalPimpinanController::class, 'updateStatus']);

    // Jalur API Notifikasi
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});