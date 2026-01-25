<?php

namespace App\Models;

use PDO;

class Achievement
{
    private PDO $db;
    private ?int $id = null;
    private ?int $userId = null;
    private ?string $badgeType = null;
    private ?string $badgeName = null;
    private ?string $badgeDescription = null;
    private ?string $badgeIcon = null;
    private ?int $pointsAwarded = null;
    private ?array $metadata = null;
    private ?\DateTime $earnedAt = null;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->metadata = [];
        $this->pointsAwarded = 0;
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getUserId(): ?int { return $this->userId; }
    public function getBadgeType(): ?string { return $this->badgeType; }
    public function getBadgeName(): ?string { return $this->badgeName; }
    public function getBadgeDescription(): ?string { return $this->badgeDescription; }
    public function getBadgeIcon(): ?string { return $this->badgeIcon; }
    public function getPointsAwarded(): ?int { return $this->pointsAwarded; }
    public function getMetadata(): ?array { return $this->metadata; }
    public function getEarnedAt(): ?\DateTime { return $this->earnedAt; }

    // Setters
    public function setUserId(int $userId): self { $this->userId = $userId; return $this; }
    public function setBadgeType(string $badgeType): self { $this->badgeType = $badgeType; return $this; }
    public function setBadgeName(string $badgeName): self { $this->badgeName = $badgeName; return $this; }
    public function setBadgeDescription(?string $badgeDescription): self { $this->badgeDescription = $badgeDescription; return $this; }
    public function setBadgeIcon(?string $badgeIcon): self { $this->badgeIcon = $badgeIcon; return $this; }
    public function setPointsAwarded(int $pointsAwarded): self { $this->pointsAwarded = $pointsAwarded; return $this; }
    public function setMetadata(array $metadata): self { $this->metadata = $metadata; return $this; }

    public function save(): bool
    {
        if ($this->id === null) {
            return $this->insert();
        }
        return false; // Achievements should not be updated once created
    }

    private function insert(): bool
    {
        $sql = "INSERT INTO achievements (user_id, badge_type, badge_name, badge_description, badge_icon, points_awarded, metadata) 
                VALUES (:user_id, :badge_type, :badge_name, :badge_description, :badge_icon, :points_awarded, :metadata)";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':user_id' => $this->userId,
            ':badge_type' => $this->badgeType,
            ':badge_name' => $this->badgeName,
            ':badge_description' => $this->badgeDescription,
            ':badge_icon' => $this->badgeIcon,
            ':points_awarded' => $this->pointsAwarded,
            ':metadata' => json_encode($this->metadata)
        ]);
    }

    public static function findByUser(PDO $db, int $userId, int $limit = 20): array
    {
        $sql = "SELECT * FROM achievements WHERE user_id = :user_id ORDER BY earned_at DESC LIMIT :limit";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $achievements = [];
        while ($data = $stmt->fetch()) {
            $achievements[] = self::fromData($db, $data);
        }
        
        return $achievements;
    }

    public static function fromData(PDO $db, array $data): self
    {
        $achievement = new self($db);
        
        $achievement->id = (int)$data['id'];
        $achievement->userId = (int)$data['user_id'];
        $achievement->badgeType = $data['badge_type'];
        $achievement->badgeName = $data['badge_name'];
        $achievement->badgeDescription = $data['badge_description'];
        $achievement->badgeIcon = $data['badge_icon'];
        $achievement->pointsAwarded = (int)$data['points_awarded'];
        $achievement->metadata = $data['metadata'] ? json_decode($data['metadata'], true) : null;
        $achievement->earnedAt = new \DateTime($data['earned_at']);
        
        return $achievement;
    }
}