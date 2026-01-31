<?php

namespace App\Services;

use App\Repositories\OrganizationRepository;
use App\Repositories\UserRepository;
use App\Exceptions\ValidationException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ForbiddenException;

class OrganizationService
{
    private OrganizationRepository $organizationRepository;
    private UserRepository $userRepository;

    public function __construct($pdo)
    {
        $this->organizationRepository = new OrganizationRepository($pdo);
        $this->userRepository = new UserRepository($pdo);
    }

    public function getUserOrganizations(int $userId): array
    {
        return $this->organizationRepository->findByUser($userId);
    }

    public function createOrganization(int $userId, array $data): array
    {
        if (empty($data['name']) || empty($data['slug'])) {
            throw new ValidationException('Name and slug are required');
        }

        // Check if slug exists
        if ($this->organizationRepository->findBySlug($data['slug'])) {
            throw new ValidationException('Organization slug already exists');
        }

        $data['owner_id'] = $userId;
        $id = $this->organizationRepository->create($data);

        return ['id' => $id, 'slug' => $data['slug']];
    }

    public function getOrganization(int $orgId, int $userId): array
    {
        $org = $this->organizationRepository->findById($orgId);
        if (!$org) {
            throw new NotFoundException('Organization not found');
        }

        $role = $this->organizationRepository->getUserRole($orgId, $userId);
        if (!$role) {
            throw new ForbiddenException('You are not a member of this organization');
        }

        $org['current_user_role'] = $role;
        return $org;
    }

    public function getMembers(int $orgId, int $userId): array
    {
        $this->ensureMember($orgId, $userId);
        return $this->organizationRepository->getMembers($orgId);
    }

    public function addMember(int $orgId, int $actorId, int $targetUserId, string $role = 'member'): void
    {
        $this->ensureAdminOrOwner($orgId, $actorId);

        if ($this->organizationRepository->getUserRole($orgId, $targetUserId)) {
            throw new ValidationException('User is already a member');
        }

        $this->organizationRepository->addMember($orgId, $targetUserId, $role);
    }

    public function removeMember(int $orgId, int $actorId, int $targetUserId): void
    {
        $this->ensureAdminOrOwner($orgId, $actorId);

        $org = $this->organizationRepository->findById($orgId);
        if ($org['owner_id'] == $targetUserId) {
            throw new ValidationException('Cannot remove the organization owner');
        }

        $this->organizationRepository->removeMember($orgId, $targetUserId);
    }

    public function updateMemberRole(int $orgId, int $actorId, int $targetUserId, string $role): void
    {
        $this->ensureAdminOrOwner($orgId, $actorId);
        
        if (!in_array($role, ['admin', 'member', 'viewer'])) {
            throw new ValidationException('Invalid role');
        }

        $org = $this->organizationRepository->findById($orgId);
        if ($org['owner_id'] == $targetUserId) {
            throw new ValidationException('Cannot change the organization owner role');
        }

        $this->organizationRepository->updateMemberRole($orgId, $targetUserId, $role);
    }

    public function inviteMember(int $orgId, int $actorId, string $email, string $role = 'member'): string
    {
        $this->ensureAdminOrOwner($orgId, $actorId);
        
        $token = bin2hex(random_bytes(32));
        $this->organizationRepository->createInvite([
            'organization_id' => $orgId,
            'email' => $email,
            'token' => $token,
            'role' => $role,
            'inviter_id' => $actorId,
            'expires_at' => date('Y-m-d H:i:s', time() + 7 * 86400) // 7 days
        ]);

        return $token;
    }

    public function acceptInvite(string $token, int $userId): int
    {
        $invite = $this->organizationRepository->getInviteByToken($token);
        if (!$invite) {
            throw new ValidationException('Invalid or expired invitation');
        }

        // Add user to organization
        $this->organizationRepository->addMember($invite['organization_id'], $userId, $invite['role']);
        
        // Mark invite accepted
        $this->organizationRepository->markInviteAccepted($invite['id']);

        return $invite['organization_id'];
    }

    private function ensureMember(int $orgId, int $userId): void
    {
        if (!$this->organizationRepository->getUserRole($orgId, $userId)) {
            throw new ForbiddenException('Access denied');
        }
    }

    private function ensureAdminOrOwner(int $orgId, int $userId): void
    {
        $role = $this->organizationRepository->getUserRole($orgId, $userId);
        if (!in_array($role, ['owner', 'admin'])) {
            throw new ForbiddenException('Insufficient permissions');
        }
    }
}
