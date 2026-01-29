<?php

namespace App\Models;

use PDO;

class User
{
    private PDO $pdo;
    
    // Properties
    private ?int $id = null;
    private string $username = '';
    private string $email = '';
    private string $passwordHash = '';
    private string $displayName = '';
    private ?string $bio = null;
    private ?string $avatarUrl = null;
    private string $role = 'member';
    private array $preferences = [];
    private ?string $createdAt = null;
    private ?string $updatedAt = null;
    private ?string $lastActiveAt = null;
    private ?string $emailVerifiedAt = null;
    private int $achievementPoints = 0;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // Static Factory Methods
    public static function fromData(PDO $pdo, array $data): self
    {
        $user = new self($pdo);
        $user->id = $data['id'] ?? null;
        $user->username = $data['username'] ?? '';
        $user->email = $data['email'] ?? '';
        $user->passwordHash = $data['password_hash'] ?? '';
        $user->displayName = $data['display_name'] ?? '';
        $user->bio = $data['bio'] ?? null;
        $user->avatarUrl = $data['avatar_url'] ?? null;
        $user->role = $data['role'] ?? 'member';
        $user->role = $data['role'] ?? 'member';
        
        $prefs = isset($data['preferences']) ? json_decode($data['preferences'], true) : [];
        $user->preferences = is_array($prefs) ? $prefs : [];
        
        $user->createdAt = $data['created_at'] ?? null;
        $user->updatedAt = $data['updated_at'] ?? null;
        $user->lastActiveAt = $data['last_active_at'] ?? null;
        $user->emailVerifiedAt = $data['email_verified_at'] ?? null;
        $user->achievementPoints = $data['achievement_points'] ?? 0;
        
        return $user;
    }



    public static function findById(PDO $pdo, int $id): ?self
    {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $data ? self::fromData($pdo, $data) : null;
    }

    public static function findByEmail(PDO $pdo, string $email): ?self
    {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL");
        $stmt->execute([$email]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $data ? self::fromData($pdo, $data) : null;
    }

    public static function findByUsername(PDO $pdo, string $username): ?self
    {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND deleted_at IS NULL");
        $stmt->execute([$username]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $data ? self::fromData($pdo, $data) : null;
    }

    // Instance Methods
    public function save(): bool
    {
        if ($this->id) {
            return $this->update();
        } else {
            return $this->create();
        }
    }

    private function create(): bool
    {
        $this->createdAt = date('Y-m-d H:i:s');
        $this->updatedAt = $this->createdAt;

        $stmt = $this->pdo->prepare("
            INSERT INTO users (
                username, email, password_hash, display_name, bio, avatar_url, 
                role, preferences, achievement_points, created_at, updated_at
            ) VALUES (
                :username, :email, :password_hash, :display_name, :bio, :avatar_url,
                :role, :preferences, :achievement_points, :created_at, :updated_at
            )
        ");

        $result = $stmt->execute([
            ':username' => $this->username,
            ':email' => $this->email,
            ':password_hash' => $this->passwordHash,
            ':display_name' => $this->displayName,
            ':bio' => $this->bio,
            ':avatar_url' => $this->avatarUrl,
            ':role' => $this->role,
            ':preferences' => json_encode($this->preferences),
            ':achievement_points' => $this->achievementPoints,
            ':created_at' => $this->createdAt,
            ':updated_at' => $this->updatedAt
        ]);

        if ($result) {
            $this->id = (int) $this->pdo->lastInsertId();
        }

        return $result;
    }

    private function update(): bool
    {
        $this->updatedAt = date('Y-m-d H:i:s');

        $stmt = $this->pdo->prepare("
            UPDATE users SET 
                username = :username,
                email = :email,
                password_hash = :password_hash,
                display_name = :display_name,
                bio = :bio,
                avatar_url = :avatar_url,
                role = :role,
                preferences = :preferences,
                achievement_points = :achievement_points,
                updated_at = :updated_at
            WHERE id = :id
        ");

        return $stmt->execute([
            ':id' => $this->id,
            ':username' => $this->username,
            ':email' => $this->email,
            ':password_hash' => $this->passwordHash,
            ':display_name' => $this->displayName,
            ':bio' => $this->bio,
            ':avatar_url' => $this->avatarUrl,
            ':role' => $this->role,
            ':preferences' => json_encode($this->preferences),
            ':achievement_points' => $this->achievementPoints,
            ':updated_at' => $this->updatedAt
        ]);
    }

    public function delete(): bool
    {
        $stmt = $this->pdo->prepare("UPDATE users SET deleted_at = NOW() WHERE id = ?");
        return $stmt->execute([$this->id]);
    }

    public function hydrate(array $data): void
    {
        $this->id = isset($data['id']) ? (int)$data['id'] : null;
        $this->username = $data['username'] ?? '';
        $this->email = $data['email'] ?? '';
        $this->passwordHash = $data['password_hash'] ?? '';
        $this->displayName = $data['display_name'] ?? '';
        $this->bio = $data['bio'] ?? null;
        $this->avatarUrl = $data['avatar_url'] ?? null;
        $this->role = $data['role'] ?? 'member';
        $this->createdAt = $data['created_at'] ?? null;
        $this->updatedAt = $data['updated_at'] ?? null;
        $this->lastActiveAt = $data['last_active_at'] ?? null;
        $this->emailVerifiedAt = $data['email_verified_at'] ?? null;
        $this->achievementPoints = isset($data['achievement_points']) ? (int)$data['achievement_points'] : 0;
        
        $prefs = $data['preferences'] ?? null;
        if (is_string($prefs)) {
            $this->preferences = json_decode($prefs, true) ?? [];
        } elseif (is_array($prefs)) {
            $this->preferences = $prefs;
        } else {
            $this->preferences = [];
        }
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'display_name' => $this->displayName,
            'bio' => $this->bio,
            'avatar_url' => $this->avatarUrl,
            'role' => $this->role,
            'preferences' => $this->preferences,
            'achievement_points' => $this->achievementPoints,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
            'last_active_at' => $this->lastActiveAt,
            'email_verified_at' => $this->emailVerifiedAt
        ];
    }

    // Getters and Setters
    public function getId(): ?int { return $this->id; }

    public function setUsername(string $username): void { $this->username = $username; }
    public function getUsername(): string { return $this->username; }

    public function setEmail(string $email): void { $this->email = $email; }
    public function getEmail(): string { return $this->email; }

    public function setPasswordHash(string $hash): void { $this->passwordHash = $hash; }
    public function setPassword(string $password): void { 
        $this->passwordHash = password_hash($password, PASSWORD_ARGON2ID); 
    }
    public function getPasswordHash(): string { return $this->passwordHash; }

    public function setDisplayName(string $name): void { $this->displayName = $name; }
    public function getDisplayName(): string { return $this->displayName; }

    public function setBio(?string $bio): void { $this->bio = $bio; }
    public function getBio(): ?string { return $this->bio; }

    public function setAvatarUrl(?string $url): void { $this->avatarUrl = $url; }
    public function getAvatarUrl(): ?string { return $this->avatarUrl; }

    public function setRole(string $role): void { $this->role = $role; }
    public function getRole(): string { return $this->role; }

    public function setPreferences(array $prefs): void { $this->preferences = $prefs; }
    public function getPreferences(): array { return $this->preferences; }

    public function setAchievementPoints(int $points): void { $this->achievementPoints = $points; }
    public function getAchievementPoints(): int { return $this->achievementPoints; }
    
    public function getCreatedAt(): ?\DateTimeImmutable 
    { 
        return $this->createdAt ? new \DateTimeImmutable($this->createdAt) : null; 
    }

    public function getUpdatedAt(): ?\DateTimeImmutable 
    { 
        return $this->updatedAt ? new \DateTimeImmutable($this->updatedAt) : null; 
    }

    public function getLastActiveAt(): ?\DateTimeImmutable 
    { 
        return $this->lastActiveAt ? new \DateTimeImmutable($this->lastActiveAt) : null; 
    }

    public function getEmailVerifiedAt(): ?\DateTimeImmutable 
    { 
        return $this->emailVerifiedAt ? new \DateTimeImmutable($this->emailVerifiedAt) : null; 
    }
}