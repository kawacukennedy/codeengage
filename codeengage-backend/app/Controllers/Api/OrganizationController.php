<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\OrganizationRepository;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;

class OrganizationController
{
    private OrganizationService $service;
    private AuthMiddleware $auth;

    public function __construct(PDO $pdo)
    {
        $this->service = new \App\Services\OrganizationService($pdo);
        $this->auth = new AuthMiddleware($pdo);
    }

    public function index($method, $params)
    {
        if ($method !== 'GET') ApiResponse::error('Method not allowed', 405);
        $user = $this->auth->handle();
        
        $orgs = $this->service->getUserOrganizations($user->getId());
        ApiResponse::success($orgs);
    }

    public function create($method, $params)
    {
        if ($method !== 'POST') ApiResponse::error('Method not allowed', 405);
        $user = $this->auth->handle();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            $result = $this->service->createOrganization($user->getId(), $input);
            ApiResponse::success($result, 'Organization created', 201);
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 400); // Bad request for validation errors
        }
    }

    public function show($method, $params)
    {
        if ($method !== 'GET') ApiResponse::error('Method not allowed', 405);
        $user = $this->auth->handle();
        $id = $params[0] ?? null;
        
        try {
            $org = $this->service->getOrganization($id, $user->getId());
            ApiResponse::success($org);
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 404);
        }
    }

    public function members($method, $params)
    {
        $user = $this->auth->handle();
        $id = $params[0] ?? null;
        
        try {
            if ($method === 'GET') {
                $members = $this->service->getMembers($id, $user->getId());
                ApiResponse::success($members);
            } elseif ($method === 'POST') {
                 $input = json_decode(file_get_contents('php://input'), true);
                 // If updating existing member
                 if (isset($input['update_role'])) {
                     $this->service->updateMemberRole($id, $user->getId(), $input['user_id'], $input['role']);
                     ApiResponse::success(null, 'Role updated');
                 } else {
                     $this->service->addMember($id, $user->getId(), $input['user_id'], $input['role'] ?? 'member');
                     ApiResponse::success(null, 'Member added');
                 }
            } elseif ($method === 'DELETE') {
                 $targetUserId = $_GET['user_id'] ?? null;
                 if (!$targetUserId) ApiResponse::error('Target user ID required', 400);
                 
                 $this->service->removeMember($id, $user->getId(), $targetUserId);
                 ApiResponse::success(null, 'Member removed');
            }
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 403);
        }
    }

    public function invite($method, $params)
    {
        if ($method !== 'POST') ApiResponse::error('Method not allowed', 405);
        $user = $this->auth->handle();
        $id = $params[0] ?? null;
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['email'])) ApiResponse::error('Email required', 400);

        try {
            $token = $this->service->inviteMember($id, $user->getId(), $input['email'], $input['role'] ?? 'member');
            
            // In a real app, send email here. For now return token.
            ApiResponse::success(['token' => $token], 'Invitation created');
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 403);
        }
    }

    public function accept($method, $params)
    {
        if ($method !== 'POST') ApiResponse::error('Method not allowed', 405);
        $user = $this->auth->handle();
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['token'])) ApiResponse::error('Token required', 400);

        try {
            $orgId = $this->service->acceptInvite($input['token'], $user->getId());
            ApiResponse::success(['organization_id' => $orgId], 'Invitation accepted');
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 400);
        }
    }
    
    public function __call($name, $arguments) {
        ApiResponse::error('Not found', 404);
    }
}
