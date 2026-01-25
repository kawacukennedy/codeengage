<?php

namespace App\Models;

use PDO;

class SnippetVersion
{
    private PDO $db;
    private ?int $id = null;
    private ?int $snippetId = null;
    private ?int $versionNumber = null;
    private ?string $code = null;
    private ?string $checksum = null;
    private ?int $editorId = null;
    private ?string $changeSummary = null;
    private ?array $analysisResults = null;
    private ?\DateTime $createdAt = null;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getSnippetId(): ?int { return $this->snippetId; }
    public function getVersionNumber(): ?int { return $this->versionNumber; }
    public function getCode(): ?string { return $this->code; }
    public function getChecksum(): ?string { return $this->checksum; }
    public function getEditorId(): ?int { return $this->editorId; }
    public function getChangeSummary(): ?string { return $this->changeSummary; }
    public function getAnalysisResults(): ?array { return $this->analysisResults; }
    public function getCreatedAt(): ?\DateTime { return $this->createdAt; }

    // Setters
    public function setSnippetId(int $snippetId): self { $this->snippetId = $snippetId; return $this; }
    public function setVersionNumber(int $versionNumber): self { $this->versionNumber = $versionNumber; return $this; }
    public function setCode(string $code): self { $this->code = $code; $this->checksum = hash('sha256', $code); return $this; }
    public function setEditorId(int $editorId): self { $this->editorId = $editorId; return $this; }
    public function setChangeSummary(string $changeSummary): self { $this->changeSummary = $changeSummary; return $this; }
    public function setAnalysisResults(?array $analysisResults): self { $this->analysisResults = $analysisResults; return $this; }

    public function save(): bool
    {
        if ($this->id === null) {
            return $this->insert();
        }
        
        return $this->update();
    }

    private function insert(): bool
    {
        $sql = "INSERT INTO snippet_versions (snippet_id, version_number, code, checksum, editor_id, change_summary, analysis_results, created_at) 
                VALUES (:snippet_id, :version_number, :code, :checksum, :editor_id, :change_summary, :analysis_results, :created_at)";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':snippet_id' => $this->snippetId,
            ':version_number' => $this->versionNumber,
            ':code' => $this->code,
            ':checksum' => $this->checksum,
            ':editor_id' => $this->editorId,
            ':change_summary' => $this->changeSummary,
            ':analysis_results' => $this->analysisResults ? json_encode($this->analysisResults) : null,
            ':created_at' => $this->createdAt ? $this->createdAt->format('Y-m-d H:i:s') : date('Y-m-d H:i:s')
        ]);
    }

    private function update(): bool
    {
        $sql = "UPDATE snippet_versions 
                SET code = :code, checksum = :checksum, change_summary = :change_summary, analysis_results = :analysis_results 
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':id' => $this->id,
            ':code' => $this->code,
            ':checksum' => $this->checksum,
            ':change_summary' => $this->changeSummary,
            ':analysis_results' => $this->analysisResults ? json_encode($this->analysisResults) : null
        ]);
    }

    public static function findBySnippet(PDO $db, int $snippetId): array
    {
        $sql = "SELECT * FROM snippet_versions WHERE snippet_id = :snippet_id ORDER BY version_number DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute([':snippet_id' => $snippetId]);
        
        $versions = [];
        while ($data = $stmt->fetch()) {
            $versions[] = self::fromData($db, $data);
        }
        
        return $versions;
    }

    public static function findLatest(PDO $db, int $snippetId): ?self
    {
        $sql = "SELECT * FROM snippet_versions WHERE snippet_id = :snippet_id ORDER BY version_number DESC LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':snippet_id' => $snippetId]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function findBySnippetAndVersion(PDO $db, int $snippetId, int $versionNumber): ?self
    {
        $sql = "SELECT * FROM snippet_versions WHERE snippet_id = :snippet_id AND version_number = :version_number";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':snippet_id' => $snippetId,
            ':version_number' => $versionNumber
        ]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function fromData(PDO $db, array $data): self
    {
        $version = new self($db);
        
        $version->id = (int)$data['id'];
        $version->snippetId = (int)$data['snippet_id'];
        $version->versionNumber = (int)$data['version_number'];
        $version->code = $data['code'];
        $version->checksum = $data['checksum'];
        $version->editorId = (int)$data['editor_id'];
        $version->changeSummary = $data['change_summary'];
        $version->analysisResults = $data['analysis_results'] ? json_decode($data['analysis_results'], true) : null;
        $version->createdAt = new \DateTime($data['created_at']);
        
        return $version;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'snippet_id' => $this->snippetId,
            'version_number' => $this->versionNumber,
            'code' => $this->code,
            'checksum' => $this->checksum,
            'editor_id' => $this->editorId,
            'change_summary' => $this->changeSummary,
            'analysis_results' => $this->analysisResults,
            'created_at' => $this->createdAt?->format('Y-m-d H:i:s')
        ];
    }
}