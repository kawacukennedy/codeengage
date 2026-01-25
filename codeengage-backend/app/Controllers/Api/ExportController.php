<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\SnippetRepository;
use App\Repositories\UserRepository;
use App\Helpers\ApiResponse;
use App\Helpers\FormatHelper;
use App\Helpers\ValidationHelper;
use App\Middleware\AuthMiddleware;
use ZipArchive;

class ExportController
{
    private PDO $db;
    private SnippetRepository $snippetRepository;
    private UserRepository $userRepository;
    private AuthMiddleware $auth;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->snippetRepository = new SnippetRepository($db);
        $this->userRepository = new UserRepository($db);
        $this->auth = new AuthMiddleware($db);
    }

    public function snippet(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->optional();
        $id = (int)($params[0] ?? 0);
        $format = $_GET['format'] ?? 'json';

        try {
            $snippet = $this->snippetRepository->findById($id);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check permissions
            if (!$this->canExportSnippet($snippet, $currentUser)) {
                ApiResponse::error('Access denied', 403);
            }

            // Get latest version
            $versions = $this->snippetRepository->getVersions($id);
            $latestVersion = !empty($versions) ? $versions[0] : null;

            if (!$latestVersion) {
                ApiResponse::error('No code found for this snippet', 400);
            }

            $snippet->loadAuthor();
            $snippet->loadTags();

            $exportData = [
                'id' => $snippet->getId(),
                'title' => $snippet->getTitle(),
                'description' => $snippet->getDescription(),
                'language' => $snippet->getLanguage(),
                'code' => $latestVersion->getCode(),
                'author' => $snippet->getAuthor() ? $snippet->getAuthor()->toArray() : null,
                'tags' => array_map(fn($t) => $t->toArray(), $snippet->getTags()),
                'created_at' => $snippet->getCreatedAt()->format('Y-m-d H:i:s'),
                'updated_at' => $snippet->getUpdatedAt()->format('Y-m-d H:i:s'),
                'analysis' => $latestVersion->getAnalysisResults()
            ];

            $this->sendExportResponse($exportData, $format, "snippet-{$id}");

        } catch (\Exception $e) {
            ApiResponse::error('Export failed');
        }
    }

    public function user(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->handle();
        $id = (int)($params[0] ?? $currentUser->getId());
        $format = $_GET['format'] ?? 'json';

        if ($id !== $currentUser->getId()) {
            ApiResponse::error('Can only export your own data', 403);
        }

        try {
            $userSnippets = $this->snippetRepository->findMany(['author_id' => $id], 1000);
            $userAchievements = $this->userRepository->getAchievements($id);

            $exportData = [
                'user' => $currentUser->toArray(),
                'snippets' => array_map(fn($s) => $s->toArray(), $userSnippets),
                'achievements' => array_map(fn($a) => $a->toArray(), $userAchievements),
                'exported_at' => date('Y-m-d H:i:s')
            ];

            $this->sendExportResponse($exportData, $format, "user-{$id}-data");

        } catch (\Exception $e) {
            ApiResponse::error('Export failed');
        }
    }

    public function collection(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->optional();
        $format = $_GET['format'] ?? 'json';
        $ids = $_GET['ids'] ?? '';

        try {
            if (empty($ids)) {
                ApiResponse::error('Snippet IDs required for collection export');
            }

            $snippetIds = array_map('intval', explode(',', $ids));
            $snippets = [];

            foreach ($snippetIds as $snippetId) {
                $snippet = $this->snippetRepository->findById($snippetId);
                if ($snippet && $this->canExportSnippet($snippet, $currentUser)) {
                    $snippet->loadAuthor();
                    $snippet->loadTags();
                    $snippets[] = $snippet->toArray();
                }
            }

            $exportData = [
                'snippets' => $snippets,
                'count' => count($snippets),
                'exported_at' => date('Y-m-d H:i:s')
            ];

            $this->sendExportResponse($exportData, $format, 'snippet-collection');

        } catch (\Exception $e) {
            ApiResponse::error('Collection export failed');
        }
    }

    public function formats(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $formats = [
                [
                    'name' => 'JSON',
                    'extension' => 'json',
                    'mime_type' => 'application/json',
                    'description' => 'JavaScript Object Notation with full metadata'
                ],
                [
                    'name' => 'Markdown',
                    'extension' => 'md',
                    'mime_type' => 'text/markdown',
                    'description' => 'Markdown with syntax highlighting'
                ],
                [
                    'name' => 'VS Code Snippets',
                    'extension' => 'code-snippets',
                    'mime_type' => 'application/json',
                    'description' => 'VS Code snippet format'
                ],
                [
                    'name' => 'JetBrains Live Template',
                    'extension' => 'xml',
                    'mime_type' => 'application/xml',
                    'description' => 'JetBrains IDE template format'
                ],
                [
                    'name' => 'HTML Embed',
                    'extension' => 'html',
                    'mime_type' => 'text/html',
                    'description' => 'HTML embeddable widget'
                ],
                [
                    'name' => 'ZIP Archive',
                    'extension' => 'zip',
                    'mime_type' => 'application/zip',
                    'description' => 'Compressed archive with multiple files'
                ]
            ];

            ApiResponse::success($formats);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to get export formats');
        }
    }

    private function sendExportResponse(array $data, string $format, string $filename): void
    {
        switch (strtolower($format)) {
            case 'json':
                $this->sendJsonResponse($data, $filename);
                break;
            case 'markdown':
                $this->sendMarkdownResponse($data, $filename);
                break;
            case 'vscode':
                $this->sendVSCodeResponse($data, $filename);
                break;
            case 'jetbrains':
                $this->sendJetBrainsResponse($data, $filename);
                break;
            case 'html':
                $this->sendHtmlResponse($data, $filename);
                break;
            case 'zip':
                $this->sendZipResponse($data, $filename);
                break;
            default:
                ApiResponse::error('Unsupported export format');
        }
    }

    private function sendJsonResponse(array $data, string $filename): void
    {
        header_remove('X-Powered-By');
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $filename . '.json"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    private function sendMarkdownResponse(array $data, string $filename): void
    {
        header_remove('X-Powered-By');
        header('Content-Type: text/markdown');
        header('Content-Disposition: attachment; filename="' . $filename . '.md"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        if (isset($data['snippets'])) {
            // Collection export
            $markdown = $this->generateCollectionMarkdown($data);
        } else {
            // Single snippet export
            $markdown = $this->generateSnippetMarkdown($data);
        }

        echo $markdown;
        exit;
    }

    private function sendVSCodeResponse(array $data, string $filename): void
    {
        header_remove('X-Powered-By');
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $filename . '.code-snippets"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        $vscodeData = [];

        if (isset($data['snippets'])) {
            foreach ($data['snippets'] as $snippet) {
                $vscodeData[$snippet['title']] = [
                    'prefix' => $snippet['title'],
                    'body' => $snippet['code'],
                    'description' => $snippet['description'] ?? ''
                ];
            }
        } else {
            $vscodeData[$data['title']] = [
                'prefix' => $data['title'],
                'body' => $data['code'],
                'description' => $data['description'] ?? ''
            ];
        }

        echo json_encode($vscodeData, JSON_PRETTY_PRINT);
        exit;
    }

    private function sendJetBrainsResponse(array $data, string $filename): void
    {
        header_remove('X-Powered-By');
        header('Content-Type: application/xml');
        header('Content-Disposition: attachment; filename="' . $filename . '.xml"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        if (isset($data['snippets'])) {
            // Collection export - not supported for multiple templates in XML
            ApiResponse::error('JetBrains template export only supports single snippets');
        }

        $xml = $this->generateJetBrainsXML($data);
        echo $xml;
        exit;
    }

    private function sendHtmlResponse(array $data, string $filename): void
    {
        header_remove('X-Powered-By');
        header('Content-Type: text/html');
        header('Content-Disposition: attachment; filename="' . $filename . '.html"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        $html = $this->generateHtmlEmbed($data);
        echo $html;
        exit;
    }

    private function sendZipResponse(array $data, string $filename): void
    {
        if (!extension_loaded('zip')) {
            ApiResponse::error('ZIP extension not available');
        }

        header_remove('X-Powered-By');
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $filename . '.zip"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        $zip = new ZipArchive();
        $zipFilename = sys_get_temp_dir() . '/' . $filename . '.zip';
        
        if ($zip->open($zipFilename, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            if (isset($data['snippets'])) {
                // Multiple snippets
                foreach ($data['snippets'] as $index => $snippet) {
                    $zip->addFromString(
                        "snippet-{$snippet['id']}.json",
                        json_encode($snippet, JSON_PRETTY_PRINT)
                    );
                }
            } else {
                // Single snippet with multiple formats
                $zip->addFromString(
                    'snippet.json',
                    json_encode($data, JSON_PRETTY_PRINT)
                );
                $zip->addFromString(
                    'snippet.md',
                    $this->generateSnippetMarkdown($data)
                );
                $zip->addFromString(
                    'snippet.html',
                    $this->generateHtmlEmbed($data)
                );
            }
            
            $zip->close();
            
            // Read and output the ZIP file
            $zipContent = file_get_contents($zipFilename);
            unlink($zipFilename);
            
            echo $zipContent;
        }
        
        exit;
    }

    private function generateSnippetMarkdown(array $data): string
    {
        $code = $data['code'];
        $language = $data['language'];
        $title = $data['title'];
        $description = $data['description'] ?? '';

        return "# {$title}\n\n{$description}\n\n```{$language}\n{$code}\n```\n\n---\n\n*Exported from CodeEngage on " . date('Y-m-d H:i:s') . "*";
    }

    private function generateCollectionMarkdown(array $data): string
    {
        $markdown = "# Code Snippets Collection\n\nExported from CodeEngage on " . date('Y-m-d H:i:s') . "\n\n";

        foreach ($data['snippets'] as $snippet) {
            $markdown .= "## " . $snippet['title'] . "\n\n";
            $markdown .= $snippet['description'] . "\n\n";
            $markdown .= "```" . $snippet['language'] . "\n";
            $markdown .= $snippet['code'] . "\n";
            $markdown .= "```\n\n";
            $markdown .= "---\n\n";
        }

        return $markdown;
    }

    private function generateJetBrainsXML(array $data): string
    {
        $variables = '';
        if (!empty($data['template_variables'])) {
            foreach ($data['template_variables'] as $var => $default) {
                $variables .= "\n  <variable name=\"{$var}\" expression=\"{$default}\" defaultValue=\"{$default}\" alwaysStopAt=\"true\" />";
            }
        }

        return <<<XML
<template name="{$data['title']}" value="{$this->escapeXml($data['code'])}" description="{$this->escapeXml($data['description'] ?? '')}" toReformat="false" toShortenFQNames="true">{$variables}
</template>
XML;
    }

    private function generateHtmlEmbed(array $data): string
    {
        $language = htmlspecialchars($data['language']);
        $code = htmlspecialchars($data['code']);
        $title = htmlspecialchars($data['title']);

        return <<<HTML
<div class="codeengage-embed" data-snippet-id="{$data['id']}">
    <div class="codeengage-header">
        <h3>{$title}</h3>
        <span class="language">{$language}</span>
    </div>
    <pre><code class="language-{$language}">{$code}</code></pre>
    <div class="codeengage-footer">
        <a href="https://codeengage.app/snippets/{$data['id']}" target="_blank">View on CodeEngage</a>
    </div>
    <style>
        .codeengage-embed { font-family: 'Fira Mono', monospace; border: 1px solid #e1e5e9; border-radius: 8px; overflow: hidden; }
        .codeengage-header { background: #f8f9fa; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
        .codeengage-header h3 { margin: 0; font-size: 16px; }
        .language { background: #e1e5e9; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        pre { margin: 0; padding: 16px; overflow-x: auto; background: #f8f9fa; }
        .codeengage-footer { padding: 8px 16px; background: #f8f9fa; border-top: 1px solid #e1e5e9; }
        .codeengage-footer a { color: #0066cc; text-decoration: none; font-size: 12px; }
    </style>
</div>
HTML;
    }

    private function escapeXml(string $string): string
    {
        return htmlspecialchars($string, ENT_XML1, 'UTF-8');
    }

    private function canExportSnippet($snippet, $user): bool
    {
        if (!$user) {
            return $snippet->getVisibility() === 'public';
        }

        return $snippet->getAuthorId() === $user->getId();
    }
}