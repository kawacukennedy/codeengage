<?php

namespace App\Services;

use App\Repositories\UserRepository;
use App\Repositories\AchievementRepository;
use App\Repositories\AuditRepository;
use App\Helpers\SecurityHelper;
use App\Exceptions\ValidationException;
use App\Exceptions\NotFoundException;

class GamificationService
{
    private UserRepository $userRepository;
    private AchievementRepository $achievementRepository;
    private AuditRepository $auditRepository;
    private SecurityHelper $securityHelper;
    private array $config;
    private array $achievementTypes;

    public function __construct(
        UserRepository $userRepository,
        AchievementRepository $achievementRepository,
        AuditRepository $auditRepository,
        SecurityHelper $securityHelper,
        array $config = []
    ) {
        $this->userRepository = $userRepository;
        $this->achievementRepository = $achievementRepository;
        $this->auditRepository = $auditRepository;
        $this->securityHelper = $securityHelper;
        $this->config = array_merge([
            'points_per_snippet' => 10,
            'points_per_fork' => 5,
            'points_per_star' => 2,
            'points_per_collaboration' => 15,
            'points_per_analysis' => 8
        ], $config);

        $this->achievementTypes = [
            'first_snippet' => [
                'name' => 'First Steps',
                'description' => 'Created your first code snippet',
                'icon' => '🎯',
                'points' => 25,
                'trigger' => 'snippet.create',
                'condition' => function($userId, $data) {
                    $userSnippets = $this->userRepository->findSnippetsByUser($userId);
                    return count($userSnippets) === 1;
                }
            ],
            'snippet_master' => [
                'name' => 'Snippet Master',
                'description' => 'Created 50 code snippets',
                'icon' => '👑',
                'points' => 200,
                'trigger' => 'snippet.create',
                'condition' => function($userId, $data) {
                    $userSnippets = $this->userRepository->findSnippetsByUser($userId);
                    return count($userSnippets) === 50;
                }
            ],
            'collaborator' => [
                'name' => 'Collaborator',
                'description' => 'Participated in 10 collaboration sessions',
                'icon' => '🤝',
                'points' => 100,
                'trigger' => 'collaboration.session_join',
                'condition' => function($userId, $data) {
                    // This would require tracking collaboration sessions
                    return false; // Placeholder
                }
            ],
            'popular_creator' => [
                'name' => 'Popular Creator',
                'description' => 'Your snippets received 100 stars total',
                'icon' => '⭐',
                'points' => 150,
                'trigger' => 'snippet.star',
                'condition' => function($userId, $data) {
                    // Check total stars across all user's snippets
                    $userSnippets = $this->userRepository->findSnippetsByUser($userId);
                    $totalStars = array_sum(array_column($userSnippets, 'star_count'));
                    return $totalStars >= 100;
                }
            ],
            'polyglot' => [
                'name' => 'Polyglot Programmer',
                'description' => 'Created snippets in 10 different programming languages',
                'icon' => '🌍',
                'points' => 120,
                'trigger' => 'snippet.create',
                'condition' => function($userId, $data) {
                    $userSnippets = $this->userRepository->findSnippetsByUser($userId);
                    $languages = array_unique(array_column($userSnippets, 'language'));
                    return count($languages) >= 10;
                }
            ],
            'code_analyst' => [
                'name' => 'Code Analyst',
                'description' => 'Analyzed 50 code snippets',
                'icon' => '🔍',
                'points' => 80,
                'trigger' => 'snippet.analyze',
                'condition' => function($userId, $data) {
                    // This would require tracking analyses
                    return false; // Placeholder
                }
            ],
            'early_adopter' => [
                'name' => 'Early Adopter',
                'description' => 'Joined in the first month of platform launch',
                'icon' => '🚀',
                'points' => 50,
                'trigger' => 'user.register',
                'condition' => function($userId, $data) {
                    $user = $this->userRepository->findById($userId);
                    $joinDate = strtotime($user->getCreatedAt());
                    $launchDate = strtotime('2024-01-01');
                    return $joinDate < $launchDate + (30 * 24 * 60 * 60);
                }
            ],
            'helpful_community' => [
                'name' => 'Helpful Community',
                'description' => 'Forked 20 snippets from other users',
                'icon' => '💝',
                'points' => 75,
                'trigger' => 'snippet.fork',
                'condition' => function($userId, $data) {
                    // Count user's forked snippets
                    return false; // Placeholder
                }
            ]
        ];
    }

    public function awardPoints(int $userId, string $action, array $context = []): int
    {
        $points = $this->calculatePoints($action, $context);
        
        if ($points <= 0) {
            return 0;
        }

        $user = $this->userRepository->findById($userId);
        if (!$user) {
            throw new NotFoundException('User');
        }

        $newPoints = $user->getAchievementPoints() + $points;
        $this->userRepository->update($userId, ['achievement_points' => $newPoints]);

        $this->auditRepository->log(
            $userId,
            'gamification.points_awarded',
            'user',
            $userId,
            ['achievement_points' => $user->getAchievementPoints()],
            ['achievement_points' => $newPoints]
        );

        $this->checkAchievements($userId, $action, $context);

        return $points;
    }

    public function checkAchievements(int $userId, string $action, array $context = []): array
    {
        $newAchievements = [];

        foreach ($this->achievementTypes as $type => $achievement) {
            if ($achievement['trigger'] !== $action) {
                continue;
            }

            // Check if user already has this achievement
            if ($this->achievementRepository->userHasAchievement($userId, $type)) {
                continue;
            }

            // Check if conditions are met
            if ($achievement['condition']($userId, $context)) {
                $this->awardAchievement($userId, $type, $achievement);
                $newAchievements[] = $achievement;
            }
        }

        return $newAchievements;
    }

    public function awardAchievement(int $userId, string $type, array $achievementData = null): array
    {
        if ($achievementData && !isset($this->achievementTypes[$type])) {
            $this->achievementTypes[$type] = $achievementData;
        }

        $achievement = $this->achievementTypes[$type] ?? $achievementData;
        if (!$achievement) {
            throw new ValidationException('Invalid achievement type');
        }

        // Check if user already has this achievement
        if ($this->achievementRepository->userHasAchievement($userId, $type)) {
            throw new ValidationException('User already has this achievement');
        }

        $achievementRecord = [
            'user_id' => $userId,
            'badge_type' => $type,
            'badge_name' => $achievement['name'],
            'badge_description' => $achievement['description'],
            'badge_icon' => $achievement['icon'],
            'points_awarded' => $achievement['points'],
            'metadata' => json_encode([
                'awarded_at' => time(),
                'trigger_action' => $achievement['trigger']
            ])
        ];

        $newAchievement = $this->achievementRepository->create($achievementRecord);

        // Award the points for the achievement
        $this->awardPoints($userId, 'achievement', ['achievement_type' => $type]);

        $this->auditRepository->log(
            $userId,
            'gamification.achievement_earned',
            'achievement',
            $newAchievement['id'],
            null,
            [
                'achievement_type' => $type,
                'achievement_name' => $achievement['name'],
                'points_awarded' => $achievement['points']
            ]
        );

        return $newAchievement;
    }

    public function getUserAchievements(int $userId): array
    {
        return $this->achievementRepository->findByUser($userId);
    }

    public function getUserStats(int $userId): array
    {
        $user = $this->userRepository->findById($userId);
        if (!$user) {
            throw new NotFoundException('User');
        }

        $achievements = $this->achievementRepository->findByUser($userId);
        $totalAchievements = count($achievements);
        $totalAchievementPoints = array_sum(array_column($achievements, 'points_awarded'));

        $userSnippets = $this->userRepository->findSnippetsByUser($userId);
        $snippetStats = [
            'total' => count($userSnippets),
            'public' => count(array_filter($userSnippets, fn($s) => $s['visibility'] === 'public')),
            'private' => count(array_filter($userSnippets, fn($s) => $s['visibility'] === 'private')),
            'total_stars' => array_sum(array_column($userSnippets, 'star_count')),
            'total_views' => array_sum(array_column($userSnippets, 'view_count')),
            'languages' => array_unique(array_column($userSnippets, 'language'))
        ];

        return [
            'user' => [
                'id' => $userId,
                'username' => $user->getUsername(),
                'achievement_points' => $user->getAchievementPoints(),
                'display_name' => $user->getDisplayName()
            ],
            'achievements' => [
                'total_count' => $totalAchievements,
                'total_points' => $totalAchievementPoints,
                'recent' => array_slice($achievements, 0, 5)
            ],
            'snippets' => $snippetStats,
            'progress' => $this->calculateProgress($userId)
        ];
    }

    public function getLeaderboard(string $type = 'points', int $limit = 10): array
    {
        switch ($type) {
            case 'points':
                return $this->userRepository->getLeaderboard($limit);
            case 'snippets':
                return $this->getSnippetLeaderboard($limit);
            case 'achievements':
                return $this->getAchievementLeaderboard($limit);
            default:
                throw new ValidationException('Invalid leaderboard type');
        }
    }

    public function getGlobalStats(): array
    {
        return [
            'total_users' => $this->userRepository->count(),
            'total_achievements_awarded' => $this->achievementRepository->count(),
            'total_points_awarded' => $this->getTotalPointsAwarded(),
            'most_popular_achievement' => $this->getMostPopularAchievement(),
            'active_users_today' => $this->getActiveUsersCount(1),
            'active_users_this_week' => $this->getActiveUsersCount(7)
        ];
    }

    public function getUserProgress(int $userId, array $achievementTypes = null): array
    {
        if ($achievementTypes === null) {
            $achievementTypes = array_keys($this->achievementTypes);
        }

        $progress = [];
        $userAchievements = $this->achievementRepository->findByUser($userId);
        $earnedTypes = array_column($userAchievements, 'badge_type');

        foreach ($achievementTypes as $type) {
            if (!isset($this->achievementTypes[$type])) {
                continue;
            }

            $achievement = $this->achievementTypes[$type];
            $isEarned = in_array($type, $earnedTypes);

            $progress[$type] = [
                'name' => $achievement['name'],
                'description' => $achievement['description'],
                'icon' => $achievement['icon'],
                'points' => $achievement['points'],
                'earned' => $isEarned,
                'progress' => $isEarned ? 100 : $this->calculateAchievementProgress($userId, $type),
                'earned_at' => $isEarned ? $this->getAchievementEarnedAt($userId, $type) : null
            ];
        }

        return $progress;
    }

    private function calculatePoints(string $action, array $context = []): int
    {
        switch ($action) {
            case 'snippet.create':
                return $this->config['points_per_snippet'];
            case 'snippet.fork':
                return $this->config['points_per_fork'];
            case 'snippet.star':
                return $this->config['points_per_star'];
            case 'collaboration.session_join':
                return $this->config['points_per_collaboration'];
            case 'snippet.analyze':
                return $this->config['points_per_analysis'];
            case 'achievement':
                return $context['achievement_points'] ?? 0;
            default:
                return 0;
        }
    }

    private function calculateProgress(int $userId): array
    {
        return [
            'next_milestone' => $this->getNextMilestone($userId),
            'achievements_progress' => $this->getUserProgress($userId),
            'level' => $this->calculateUserLevel($userId)
        ];
    }

    private function getSnippetLeaderboard(int $limit): array
    {
        $users = $this->userRepository->findMany([], 100); // Get more users for processing
        $snippetCounts = [];

        foreach ($users as $user) {
            $userSnippets = $this->userRepository->findSnippetsByUser($user->getId());
            $snippetCounts[$user->getId()] = [
                'user' => $user->toArray(),
                'snippet_count' => count($userSnippets)
            ];
        }

        uasort($snippetCounts, fn($a, $b) => $b['snippet_count'] - $a['snippet_count']);
        
        return array_slice($snippetCounts, 0, $limit, true);
    }

    private function getAchievementLeaderboard(int $limit): array
    {
        return $this->achievementRepository->getTopAchievers($limit);
    }

    private function getTotalPointsAwarded(): int
    {
        return $this->userRepository->getTotalAchievementPoints();
    }

    private function getMostPopularAchievement(): array
    {
        return $this->achievementRepository->getMostPopularAchievement();
    }

    private function getActiveUsersCount(int $days): int
    {
        return $this->userRepository->getActiveUsersCount($days);
    }

    private function calculateAchievementProgress(int $userId, string $type): int
    {
        // This would need to be implemented based on specific achievement requirements
        // For now, return 0 as placeholder
        return 0;
    }

    private function getAchievementEarnedAt(int $userId, string $type): ?string
    {
        $achievement = $this->achievementRepository->findByUserAndType($userId, $type);
        return $achievement ? $achievement['earned_at'] : null;
    }

    private function getNextMilestone(int $userId): array
    {
        $currentPoints = $this->userRepository->findById($userId)->getAchievementPoints();
        $milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
        
        foreach ($milestones as $milestone) {
            if ($currentPoints < $milestone) {
                return [
                    'target' => $milestone,
                    'current' => $currentPoints,
                    'progress' => ($currentPoints / $milestone) * 100
                ];
            }
        }

        return [
            'target' => $currentPoints,
            'current' => $currentPoints,
            'progress' => 100
        ];
    }

    private function calculateUserLevel(int $userId): int
    {
        $points = $this->userRepository->findById($userId)->getAchievementPoints();
        return floor(sqrt($points / 100)) + 1; // Simple level calculation
    }
}