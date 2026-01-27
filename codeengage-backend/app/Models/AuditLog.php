<?php

namespace App\Models;

class AuditLog
{
    private ?int $id;
    private ?int $actorId;
    private string $actionType;
    private string $entityType;
    private ?int $entityId;
    private ?array $oldValues;
    private ?array $newValues;
    private ?string $ipAddress;
    private ?string $userAgent;
    private ?string $requestId;
    private ?\DateTime $createdAt;

    public function __construct(
        ?int $id = null,
        ?int $actorId = null,
        string $actionType = '',
        string $entityType = '',
        ?int $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?string $requestId = null,
        ?\DateTime $createdAt = null
    ) {
        $this->id = $id;
        $this->actorId = $actorId;
        $this->actionType = $actionType;
        $this->entityType = $entityType;
        $this->entityId = $entityId;
        $this->oldValues = $oldValues;
        $this->newValues = $newValues;
        $this->ipAddress = $ipAddress;
        $this->userAgent = $userAgent;
        $this->requestId = $requestId;
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

    public function getActorId(): ?int
    {
        return $this->actorId;
    }

    public function setActorId(?int $actorId): void
    {
        $this->actorId = $actorId;
    }

    public function getActionType(): string
    {
        return $this->actionType;
    }

    public function setActionType(string $actionType): void
    {
        $this->actionType = $actionType;
    }

    public function getEntityType(): string
    {
        return $this->entityType;
    }

    public function setEntityType(string $entityType): void
    {
        $this->entityType = $entityType;
    }

    public function getEntityId(): ?int
    {
        return $this->entityId;
    }

    public function setEntityId(?int $entityId): void
    {
        $this->entityId = $entityId;
    }

    public function getOldValues(): ?array
    {
        return $this->oldValues;
    }

    public function setOldValues(?array $oldValues): void
    {
        $this->oldValues = $oldValues;
    }

    public function getNewValues(): ?array
    {
        return $this->newValues;
    }

    public function setNewValues(?array $newValues): void
    {
        $this->newValues = $newValues;
    }

    public function getIpAddress(): ?string
    {
        return $this->ipAddress;
    }

    public function setIpAddress(?string $ipAddress): void
    {
        $this->ipAddress = $ipAddress;
    }

    public function getUserAgent(): ?string
    {
        return $this->userAgent;
    }

    public function setUserAgent(?string $userAgent): void
    {
        $this->userAgent = $userAgent;
    }

    public function getRequestId(): ?string
    {
        return $this->requestId;
    }

    public function setRequestId(?string $requestId): void
    {
        $this->requestId = $requestId;
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
            'actor_id' => $this->actorId,
            'action_type' => $this->actionType,
            'entity_type' => $this->entityType,
            'entity_id' => $this->entityId,
            'old_values' => $this->oldValues,
            'new_values' => $this->newValues,
            'ip_address' => $this->ipAddress,
            'user_agent' => $this->userAgent,
            'request_id' => $this->requestId,
            'created_at' => $this->createdAt?->format('Y-m-d H:i:s')
        ];
    }

    public static function fromArray(array $data): self
    {
        return new self(
            $data['id'] ?? null,
            $data['actor_id'] ?? null,
            $data['action_type'] ?? '',
            $data['entity_type'] ?? '',
            $data['entity_id'] ?? null,
            isset($data['old_values']) ? json_decode($data['old_values'], true) : null,
            isset($data['new_values']) ? json_decode($data['new_values'], true) : null,
            $data['ip_address'] ?? null,
            $data['user_agent'] ?? null,
            $data['request_id'] ?? null,
            isset($data['created_at']) ? new \DateTime($data['created_at']) : null
        );
    }

    public static function create(
        ?int $actorId,
        string $actionType,
        string $entityType,
        ?int $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?string $requestId = null
    ): self {
        return new self(
            null,
            $actorId,
            $actionType,
            $entityType,
            $entityId,
            $oldValues,
            $newValues,
            $ipAddress,
            $userAgent,
            $requestId,
            new \DateTime()
        );
    }
}