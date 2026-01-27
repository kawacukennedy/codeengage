<?php

namespace App\Models;

use PDO;
use App\Helpers\SecurityHelper;

class User
{
    private PDO $db;
    private ?int $id = null;
    private ?string $username = null;
    private ?string $email = null;
    private ?string $passwordHash = null;
    private ?string $displayName = null;
    private ?string $avatarUrl = null;
    private ?string $bio = null;
    private ?array $preferences = null;
    private ?int $achievementPoints = null;
    private ?\DateTime $lastActiveAt = null;
    private ?\DateTime $emailVerifiedAt = null;
    private ?\DateTime $createdAt = null;
    private ?\DateTime $updatedAt = null;
    private ?\DateTime $deletedAt = null;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->preferences = ['theme' => 'dark', 'editor_mode' => 'default'];
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getUsername(): ?string { return $this->username; }
    public function getEmail(): ?string { return $this->email; }
    public function getPasswordHash(): ?string { return $this->passwordHash; }
    public function getDisplayName(): ?string { return $this->displayName; }
    public function getAvatarUrl(): ?string { return $this->avatarUrl; }
    public function getBio(): ?string { return $this->bio; }
    public function getPreferences(): ?array { return $this->preferences; }
    public function getAchievementPoints(): ?int { return $this->achievementPoints; }
    public function getLastActiveAt(): ?\DateTime { return $this->lastActiveAt; }
    public function getEmailVerifiedAt(): ?\DateTime { return $this->emailVerifiedAt; }
    public function getCreatedAt(): ?\DateTime { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTime { return $this->updatedAt; }
    public function getDeletedAt(): ?\DateTime { return $this->deletedAt; }

    // Setters
    public function setUsername(string $username): self { $this->username = $username; return $this; }
    public function setEmail(string $email): self { $this->email = $email; return $this; }
    public function setPasswordHash(string $hash): self { $this->passwordHash = $hash; return $this; }
    public function setPassword(string $password): self { $this->passwordHash = SecurityHelper::hashPassword($password); return $this; }
    public function setDisplayName(?string $displayName): self { $this->displayName = $displayName; return $this; }
    public function setAvatarUrl(?string $avatarUrl): self { $this->avatarUrl = $avatarUrl; return $this; }
    public function setBio(?string $bio): self { $this->bio = $bio; return $this; }
    public function setPreferences(array $preferences): self { $this->preferences = $preferences; return $this; }
    public function setAchievementPoints(int $points): self { $this->achievementPoints = $points; return $this; }
    public function setLastActiveAt(\DateTime $date): self { $this->lastActiveAt = $date; return $this; }
    public function setEmailVerifiedAt(\DateTime $date): self { $this->emailVerifiedAt = $date; return $this; }
    public function setDeletedAt(\DateTime $date): self { $this->deletedAt = $date; return $this; }

    public function save(): bool
    {
        if ($this->id === null) {
            return $this->insert();
        }
        return $this->update();
    }

    private function insert(): bool
    {
        $sql = "INSERT INTO users (username, email, password_hash, display_name, avatar_url, bio, preferences, achievement_points, email_verified_at) 
                VALUES (:username, :email, :password_hash, :display_name, :avatar_url, :bio, :preferences, :achievement_points, :email_verified_at)";
        
        $stmt = $this->db->prepare($sql);
        
        $result = $stmt->execute([
            ':username' => $this->username,
            ':email' => $this->email,
            ':password_hash' => $this->passwordHash,
            ':display_name' => $this->displayName ?: $this->username,
            ':avatar_url' => $this->avatarUrl,
            ':bio' => $this->bio,
            ':preferences' => json_encode($this->preferences),
            ':achievement_points' => $this->achievementPoints ?: 0,
            ':email_verified_at' => $this->emailVerifiedAt?->format('Y-m-d H:i:s')
        ]);

        if ($result) {
            $this->id = (int) $this->db->lastInsertId();
        }

        return $result;
    }

    private function update(): bool
    {
        $sql = "UPDATE users SET 
                username = :username, 
                email = :email, 
                password_hash = :password_hash,
                display_name = :display_name,
                avatar_url = :avatar_url,
                bio = :bio,
                preferences = :preferences,
                achievement_points = :achievement_points,
                last_active_at = :last_active_at,
                email_verified_at = :email_verified_at,
                updated_at = CURRENT_TIMESTAMP,
                deleted_at = :deleted_at
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':id' => $this->id,
            ':username' => $this->username,
            ':email' => $this->email,
            ':password_hash' => $this->passwordHash,
            ':display_name' => $this->displayName,
            ':avatar_url' => $this->avatarUrl,
            ':bio' => $this->bio,
            ':preferences' => json_encode($this->preferences),
            ':achievement_points' => $this->achievementPoints,
            ':last_active_at' => $this->lastActiveAt?->format('Y-m-d H:i:s'),
            ':email_verified_at' => $this->emailVerifiedAt?->format('Y-m-d H:i:s'),
            ':deleted_at' => $this->deletedAt?->format('Y-m-d H:i:s')
        ]);
    }

    public function delete(): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $sql = "UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([':id' => $this->id]);
    }

    public function verifyPassword(string $password): bool
    {
        if ($this->passwordHash === null) {
            return false;
        }
        
        return SecurityHelper::verifyPassword($password, $this->passwordHash);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'display_name' => $this->displayName,
            'avatar_url' => $this->avatarUrl,
            'bio' => $this->bio,
            'preferences' => $this->preferences,
            'achievement_points' => $this->achievementPoints,
            'last_active_at' => $this->lastActiveAt?->format('Y-m-d H:i:s'),
            'email_verified_at' => $this->emailVerifiedAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->createdAt?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updatedAt?->format('Y-m-d H:i:s')
        ];
    }

    public static function findById(PDO $db, int $id): ?self
    {
        $sql = "SELECT * FROM users WHERE id = :id AND deleted_at IS NULL";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function findByUsername(PDO $db, string $username): ?self
    {
        $sql = "SELECT * FROM users WHERE username = :username AND deleted_at IS NULL";
        $stmt = $db->prepare($sql);
        $stmt->execute([':username' => $username]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function findByEmail(PDO $db, string $email): ?self
    {
        $sql = "SELECT * FROM users WHERE email = :email AND deleted_at IS NULL";
        $stmt = $db->prepare($sql);
        $stmt->execute([':email' => $email]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function fromData(PDO $db, array $data): self
    {
        $user = new self($db);
        
        $user->id = (int)$data['id'];
        $user->username = $data['username'];
        $user->email = $data['email'];
        $user->passwordHash = $data['password_hash'];
        $user->displayName = $data['display_name'];
        $user->avatarUrl = $data['avatar_url'];
        $user->bio = $data['bio'];
        $user->preferences = json_decode($data['preferences'], true);
        $user->achievementPoints = (int)$data['achievement_points'];
        $user->lastActiveAt = $data['last_active_at'] ? new \DateTime($data['last_active_at']) : null;
        $user->emailVerifiedAt = $data['email_verified_at'] ? new \DateTime($data['email_verified_at']) : null;
        $user->createdAt = new \DateTime($data['created_at']);
        $user->updatedAt = new \DateTime($data['updated_at']);
        $user->deletedAt = $data['deleted_at'] ? new \DateTime($data['deleted_at']) : null;
        
        return $user;
    }
}