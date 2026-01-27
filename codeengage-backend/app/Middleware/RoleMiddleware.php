<?php

namespace App\Middleware;

use App\Helpers\ApiResponse;
use App\Repositories\UserRepository;
use App\Repositories\RoleRepository;

class RoleMiddleware
{
    private UserRepository $userRepository;
    private RoleRepository $roleRepository;
    private array $requiredRoles;

    public function __construct(UserRepository $userRepository, RoleRepository $roleRepository, array $requiredRoles = [])
    {
        $this->userRepository = $userRepository;
        $this->roleRepository = $roleRepository;
        $this->requiredRoles = $requiredRoles;
    }

    public function handle(int $userId): void
    {
        $user = $this->userRepository->findById($userId);
        
        if (!$user) {
            ApiResponse::error('User not found', 404);
        }

        $userRoles = $this->userRepository->getUserRoles($userId);
        
        if (empty($this->requiredRoles)) {
            return; // No specific roles required
        }

        if (!$this->hasRequiredRole($userRoles, $this->requiredRoles)) {
            ApiResponse::error('Insufficient permissions', 403);
        }
    }

    public function hasPermission(int $userId, string $permission): bool
    {
        $userRoles = $this->userRepository->getUserRoles($userId);
        
        foreach ($userRoles as $role) {
            $rolePermissions = $this->roleRepository->getRolePermissions($role['role_id']);
            
            foreach ($rolePermissions as $perm) {
                if ($perm['name'] === $permission) {
                    return true;
                }
            }
        }

        return false;
    }

    public function requirePermission(int $userId, string $permission): void
    {
        if (!$this->hasPermission($userId, $permission)) {
            ApiResponse::error('Permission denied', 403);
        }
    }

    public function requireAnyRole(array $roles): self
    {
        return new self($this->userRepository, $this->roleRepository, $roles);
    }

    public function requireAllRoles(array $roles): self
    {
        // This implementation would require all roles to be present
        return new self($this->userRepository, $this->roleRepository, $roles);
    }

    private function hasRequiredRole(array $userRoles, array $requiredRoles): bool
    {
        foreach ($requiredRoles as $requiredRole) {
            $hasRole = false;
            
            foreach ($userRoles as $userRole) {
                if ($userRole['name'] === $requiredRole) {
                    $hasRole = true;
                    break;
                }
            }
            
            if (!$hasRole) {
                return false;
            }
        }

        return true;
    }

    public function getRequiredRoles(): array
    {
        return $this->requiredRoles;
    }

    public function addRequiredRole(string $role): void
    {
        if (!in_array($role, $this->requiredRoles)) {
            $this->requiredRoles[] = $role;
        }
    }

    public function removeRequiredRole(string $role): void
    {
        $key = array_search($role, $this->requiredRoles);
        if ($key !== false) {
            unset($this->requiredRoles[$key]);
            $this->requiredRoles = array_values($this->requiredRoles);
        }
    }
}