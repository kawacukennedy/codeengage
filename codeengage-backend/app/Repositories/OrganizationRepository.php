<?php

namespace App\Repositories;

use PDO;
use App\Models\Organization;

class OrganizationRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(array $data): int
    {
        $sql = "INSERT INTO organizations (name, slug, description, owner_id) VALUES (:name, :slug, :description, :owner_id)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':name' => $data['name'],
            ':slug' => $data['slug'],
            ':description' => $data['description'] ?? null,
            ':owner_id' => $data['owner_id']
        ]);
        
        $orgId = (int)$this->db->lastInsertId();
        
        // Add owner as member with 'owner' role
        $this->addMember($orgId, $data['owner_id'], 'owner');
        
        return $orgId;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM organizations WHERE id = ?");
        $stmt->execute([$id]);
        $org = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $org ?: null;
    }

    public function findByUser(int $userId): array
    {
        $sql = "
            SELECT o.*, om.role as user_role 
            FROM organizations o
            JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_id = ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM organizations WHERE slug = ?");
        $stmt->execute([$slug]);
        $org = $stmt->fetch(PDO::FETCH_ASSOC);
        return $org ?: null;
    }
    
    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [':id' => $id];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['name', 'slug', 'description', 'color_theme', 'settings'])) {
                $fields[] = "{$key} = :{$key}";
                $params[":{$key}"] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $sql = "UPDATE organizations SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function addMember(int $orgId, int $userId, string $role = 'member'): bool
    {
        $sql = "INSERT IGNORE INTO organization_members (organization_id, user_id, role) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$orgId, $userId, $role]);
    }

    public function removeMember(int $orgId, int $userId): bool
    {
        $sql = "DELETE FROM organization_members WHERE organization_id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$orgId, $userId]);
    }

    public function getMembers(int $orgId): array
    {
        $sql = "
            SELECT u.id, u.username, u.display_name, u.avatar_url, om.role, om.joined_at
            FROM users u
            JOIN organization_members om ON u.id = om.user_id
            WHERE om.organization_id = ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$orgId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getUserRole(int $orgId, int $userId): ?string
    {
        $sql = "SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$orgId, $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ? $result['role'] : null;
    }

    public function updateMemberRole(int $orgId, int $userId, string $role): bool
    {
        $sql = "UPDATE organization_members SET role = ? WHERE organization_id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$role, $orgId, $userId]);
    }

    public function createInvite(array $data): bool
    {
        $sql = "INSERT INTO organization_invites (organization_id, email, token, role, inviter_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['organization_id'],
            $data['email'],
            $data['token'],
            $data['role'],
            $data['inviter_id'],
            $data['expires_at']
        ]);
    }

    public function getInviteByToken(string $token): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM organization_invites WHERE token = ? AND accepted_at IS NULL AND expires_at > NOW()");
        $stmt->execute([$token]);
        $invite = $stmt->fetch(PDO::FETCH_ASSOC);
        return $invite ?: null;
    }

    public function markInviteAccepted(int $inviteId): bool
    {
        $stmt = $this->db->prepare("UPDATE organization_invites SET accepted_at = NOW() WHERE id = ?");
        return $stmt->execute([$inviteId]);
    }
}
