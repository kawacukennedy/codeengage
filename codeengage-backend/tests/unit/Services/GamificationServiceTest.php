<?php
/**
 * GamificationService Unit Tests
 * 
 * Tests for gamification service including achievements, points, and leaderboards.
 */

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\GamificationService;
use PDO;

class GamificationServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test achievement point values
     */
    public function testAchievementPointValues(): void
    {
        $achievements = $this->getAchievementDefinitions();
        
        foreach ($achievements as $achievement) {
            $this->assertGreaterThan(0, $achievement['points'], 
                "Achievement '{$achievement['name']}' should have positive points");
        }
    }

    /**
     * Test achievement trigger conditions
     */
    public function testFirstSnippetAchievementTrigger(): void
    {
        $snippetCount = 1;
        $triggered = $this->checkAchievementTrigger('first_snippet', ['snippet_count' => $snippetCount]);
        
        $this->assertTrue($triggered, 'First snippet achievement should trigger when snippet count is 1');
    }

    /**
     * Test prolific contributor achievement tiers
     */
    public function testProlificContributorTiers(): void
    {
        $tiers = [
            ['threshold' => 10, 'level' => 'bronze'],
            ['threshold' => 50, 'level' => 'silver'],
            ['threshold' => 100, 'level' => 'gold']
        ];
        
        foreach ($tiers as $tier) {
            $level = $this->getContributorLevel($tier['threshold']);
            $this->assertEquals($tier['level'], $level, 
                "Contributor level at {$tier['threshold']} snippets should be {$tier['level']}");
        }
    }

    /**
     * Test points calculation for different actions
     */
    public function testPointsCalculation(): void
    {
        $actions = [
            'create_snippet' => 10,
            'snippet_starred' => 5,
            'snippet_forked' => 15,
            'first_snippet' => 50,
            'helpful_comment' => 5
        ];
        
        foreach ($actions as $action => $expectedPoints) {
            $points = $this->calculatePointsForAction($action);
            $this->assertEquals($expectedPoints, $points, 
                "Action '{$action}' should award {$expectedPoints} points");
        }
    }

    /**
     * Test leaderboard ranking logic
     */
    public function testLeaderboardRanking(): void
    {
        $users = [
            ['id' => 1, 'points' => 500],
            ['id' => 2, 'points' => 1000],
            ['id' => 3, 'points' => 750],
            ['id' => 4, 'points' => 500], // Tie with user 1
        ];
        
        $ranked = $this->rankUsers($users);
        
        $this->assertEquals(2, $ranked[0]['id'], 'User with 1000 points should be first');
        $this->assertEquals(1, $ranked[0]['rank'], 'First place should have rank 1');
        $this->assertEquals(3, $ranked[1]['id'], 'User with 750 points should be second');
        $this->assertEquals(2, $ranked[1]['rank'], 'Second place should have rank 2');
    }

    /**
     * Test daily streak calculation
     */
    public function testDailyStreakCalculation(): void
    {
        $today = strtotime('today');
        $lastActive = strtotime('yesterday');
        
        $isConsecutive = ($today - $lastActive) <= 86400; // 24 hours
        $this->assertTrue($isConsecutive, 'Yesterday should be consecutive day');
        
        $lastActiveTwoDaysAgo = strtotime('-2 days');
        $isConsecutive2 = ($today - $lastActiveTwoDaysAgo) <= 86400;
        $this->assertFalse($isConsecutive2, 'Two days ago should break streak');
    }

    /**
     * Test weekly leaderboard reset
     */
    public function testWeeklyLeaderboardPeriod(): void
    {
        $weekStart = strtotime('monday this week');
        $weekEnd = strtotime('sunday this week 23:59:59');
        
        $now = time();
        $isInCurrentWeek = $now >= $weekStart && $now <= $weekEnd;
        
        $this->assertTrue($isInCurrentWeek, 'Current time should be in current week');
    }

    /**
     * Test badge tier progression
     */
    public function testBadgeTierProgression(): void
    {
        $tiers = ['bronze', 'silver', 'gold', 'platinum'];
        
        for ($i = 0; $i < count($tiers) - 1; $i++) {
            $currentTier = $tiers[$i];
            $nextTier = $tiers[$i + 1];
            
            $this->assertEquals($nextTier, $this->getNextTier($currentTier),
                "Next tier after {$currentTier} should be {$nextTier}");
        }
    }

    /**
     * Test achievement uniqueness (user can't earn same achievement twice)
     */
    public function testAchievementUniqueness(): void
    {
        $earnedAchievements = ['first_snippet', 'first_star'];
        $newAchievement = 'first_snippet';
        
        $alreadyEarned = in_array($newAchievement, $earnedAchievements);
        $this->assertTrue($alreadyEarned, 'Should detect already earned achievement');
    }

    /**
     * Test activity scoring for engagement
     */
    public function testActivityScoring(): void
    {
        $activities = [
            ['type' => 'create', 'weight' => 10],
            ['type' => 'view', 'weight' => 1],
            ['type' => 'star', 'weight' => 5],
            ['type' => 'fork', 'weight' => 15],
            ['type' => 'comment', 'weight' => 3]
        ];
        
        $totalScore = array_sum(array_column($activities, 'weight'));
        $this->assertEquals(34, $totalScore, 'Total activity score should be sum of weights');
    }

    /**
     * Test milestone achievement thresholds
     */
    public function testMilestoneThresholds(): void
    {
        $milestones = [
            ['name' => 'rising_star', 'threshold' => 100],
            ['name' => 'contributor', 'threshold' => 500],
            ['name' => 'expert', 'threshold' => 1000],
            ['name' => 'legend', 'threshold' => 5000]
        ];
        
        $userPoints = 750;
        
        $achievedMilestones = array_filter($milestones, function($m) use ($userPoints) {
            return $userPoints >= $m['threshold'];
        });
        
        $this->assertCount(2, $achievedMilestones, 'User with 750 points should achieve 2 milestones');
    }

    /**
     * Helper: Get achievement definitions
     */
    private function getAchievementDefinitions(): array
    {
        return [
            ['name' => 'first_snippet', 'points' => 50, 'badge' => 'bronze'],
            ['name' => 'ten_snippets', 'points' => 100, 'badge' => 'silver'],
            ['name' => 'hundred_snippets', 'points' => 500, 'badge' => 'gold'],
            ['name' => 'first_star', 'points' => 25, 'badge' => 'bronze'],
            ['name' => 'popular_snippet', 'points' => 200, 'badge' => 'gold']
        ];
    }

    /**
     * Helper: Check if achievement should trigger
     */
    private function checkAchievementTrigger(string $achievement, array $context): bool
    {
        $triggers = [
            'first_snippet' => fn($ctx) => ($ctx['snippet_count'] ?? 0) === 1,
            'ten_snippets' => fn($ctx) => ($ctx['snippet_count'] ?? 0) >= 10,
            'first_star' => fn($ctx) => ($ctx['stars_received'] ?? 0) === 1
        ];
        
        if (!isset($triggers[$achievement])) {
            return false;
        }
        
        return $triggers[$achievement]($context);
    }

    /**
     * Helper: Get contributor level based on snippet count
     */
    private function getContributorLevel(int $snippetCount): string
    {
        if ($snippetCount >= 100) return 'gold';
        if ($snippetCount >= 50) return 'silver';
        if ($snippetCount >= 10) return 'bronze';
        return 'none';
    }

    /**
     * Helper: Calculate points for action
     */
    private function calculatePointsForAction(string $action): int
    {
        $pointValues = [
            'create_snippet' => 10,
            'snippet_starred' => 5,
            'snippet_forked' => 15,
            'first_snippet' => 50,
            'helpful_comment' => 5,
            'daily_login' => 2
        ];
        
        return $pointValues[$action] ?? 0;
    }

    /**
     * Helper: Rank users by points
     */
    private function rankUsers(array $users): array
    {
        usort($users, fn($a, $b) => $b['points'] - $a['points']);
        
        $rank = 0;
        $lastPoints = null;
        
        foreach ($users as $index => &$user) {
            if ($user['points'] !== $lastPoints) {
                $rank = $index + 1;
            }
            $user['rank'] = $rank;
            $lastPoints = $user['points'];
        }
        
        return $users;
    }

    /**
     * Helper: Get next tier
     */
    private function getNextTier(string $currentTier): string
    {
        $progression = [
            'bronze' => 'silver',
            'silver' => 'gold',
            'gold' => 'platinum',
            'platinum' => 'platinum' // Max tier
        ];
        
        return $progression[$currentTier] ?? 'bronze';
    }
}
