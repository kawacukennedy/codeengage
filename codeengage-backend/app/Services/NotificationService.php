<?php

namespace App\Services;

use App\Repositories\NotificationRepository;
use App\Repositories\UserRepository;
use App\Services\EmailService;

class NotificationService
{
    private NotificationRepository $notificationRepository;
    private UserRepository $userRepository;
    private EmailService $emailService;

    public function __construct(
        NotificationRepository $notificationRepository,
        UserRepository $userRepository,
        EmailService $emailService
    ) {
        $this->notificationRepository = $notificationRepository;
        $this->userRepository = $userRepository;
        $this->emailService = $emailService;
    }

    public function notifyAchievementUnlocked(int $userId, array $achievement)
    {
        // 1. Internal Dashboard Notification
        $this->notificationRepository->create([
            'user_id' => $userId,
            'type' => 'achievement',
            'title' => 'Achievement Unlocked: ' . $achievement['name'],
            'message' => "You've earned the {$achievement['name']} badge and {$achievement['points']} points!",
            'data' => json_encode(['icon' => $achievement['icon'], 'achievement_id' => $achievement['id'] ?? null])
        ]);

        // 2. Email Notification
        $user = $this->userRepository->findById($userId);
        if ($user && $user->getEmail()) {
            $this->emailService->sendAchievementUnlocked(
                $user->getEmail(),
                $user->getUsername(),
                $achievement['name'],
                $achievement['icon'],
                $achievement['points']
            );
        }
    }

    public function notify(int $userId, string $type, string $title, string $message, array $data = [])
    {
        return $this->notificationRepository->create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => json_encode($data)
        ]);
    }
}
