<?php

namespace App\Models;

use PDO;

class Organization
{
    private PDO $db;
    private ?int $id = null;
    private ?string $name = null;
    private ?string $slug = null;
    private ?string $description = null;
    private ?int $ownerId = null;
    private ?string $colorTheme = null;
    private ?array $settings = null;
    private ?\DateTime $createdAt = null;
    private ?\DateTime $updatedAt = null;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->colorTheme = 'blue';
        $this->settings = [];
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getName(): ?string { return $this->name; }
    public function getSlug(): ?string { return $this->slug; }
    public function getDescription(): ?string { return $this->description; }
    public function getOwnerId(): ?int { return $this->ownerId; }
    public function getColorTheme(): ?string { return $this->colorTheme; }
    public function getSettings(): ?array { return $this->settings; }
    public function getCreatedAt(): ?\DateTime { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTime { return $this->updatedAt; }

    // Setters
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function setSlug(string $slug): self { $this->slug = $slug; return $this; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }
    public function setOwnerId(int $ownerId): self { $this->ownerId = $ownerId; return $this; }
    public function setColorTheme(string $colorTheme): self { $this->colorTheme = $colorTheme; return $this; }
    public function setSettings(array $settings): self { $this->settings = $settings; return $this; }

    public function save(): bool
    {
        if ($this->id === null) {
            return $this->insert();
        }
        return $this->update();
    }

    private function insert(): bool
    {
        $sql = "INSERT INTO organizations (name, slug, description, owner_id, color_theme, settings) 
                VALUES (:name, :slug, :description, :owner_id, :color_theme, :settings)";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':name' => $this->name,
            ':slug' => $this->slug,
            ':description' => $this->description,
            ':owner_id' => $this->ownerId,
            ':color_theme' => $this->colorTheme,
            ':settings' => json_encode($this->settings)
        ]);
    }

    private function update(): bool
    {
        $sql = "UPDATE organizations SET 
                name = :name, 
                slug = :slug,
                description = :description,
                owner_id = :owner_id,
                color_theme = :color_theme,
                settings = :settings,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':id' => $this->id,
            ':name' => $this->name,
            ':slug' => $this->slug,
            ':description' => $this->description,
            ':owner_id' => $this->ownerId,
            ':color_theme' => $this->colorTheme,
            ':settings' => json_encode($this->settings)
        ]);
    }

    public static function findById(PDO $db, int $id): ?self
    {
        $sql = "SELECT * FROM organizations WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function fromData(PDO $db, array $data): self
    {
        $org = new self($db);
        
        $org->id = (int)$data['id'];
        $org->name = $data['name'];
        $org->slug = $data['slug'];
        $org->description = $data['description'];
        $org->ownerId = (int)$data['owner_id'];
        $org->colorTheme = $data['color_theme'];
        $org->settings = json_decode($data['settings'], true);
        $org->createdAt = new \DateTime($data['created_at']);
        $org->updatedAt = new \DateTime($data['updated_at']);
        
        return $org;
    }
}