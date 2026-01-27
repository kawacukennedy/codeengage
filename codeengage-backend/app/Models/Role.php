<?php

namespace App\Models;

class Role
{
    private ?int $id;
    private string $name;
    private ?string $description;
    private bool $isSystemRole;
    private ?\DateTime $createdAt;

    public function __construct(
        ?int $id = null,
        string $name = '',
        ?string $description = null,
        bool $isSystemRole = false,
        ?\DateTime $createdAt = null
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->description = $description;
        $this->isSystemRole = $isSystemRole;
        $this->createdAt = $createdAt;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(int $id): void
    {
        $this->id = $id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): void
    {
        $this->name = $name;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): void
    {
        $this->description = $description;
    }

    public function isSystemRole(): bool
    {
        return $this->isSystemRole;
    }

    public function setIsSystemRole(bool $isSystemRole): void
    {
        $this->isSystemRole = $isSystemRole;
    }

    public function getCreatedAt(): ?\DateTime
    {
        return $this->createdAt;
    }

    public function setCreatedAt(?\DateTime $createdAt): void
    {
        $this->createdAt = $createdAt;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'is_system_role' => $this->isSystemRole,
            'created_at' => $this->createdAt?->format('Y-m-d H:i:s')
        ];
    }

    public static function fromArray(array $data): self
    {
        return new self(
            $data['id'] ?? null,
            $data['name'] ?? '',
            $data['description'] ?? null,
            (bool) ($data['is_system_role'] ?? false),
            isset($data['created_at']) ? new \DateTime($data['created_at']) : null
        );
    }
}