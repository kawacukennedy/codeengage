<?php

namespace App\Services;

use PDO;
use App\Repositories\SnippetRepository;
use App\Repositories\SnippetVersionRepository;
use App\Repositories\TagRepository;
use App\Helpers\SecurityHelper;

class ExportService
{
    private PDO $db;
    private SnippetRepository $snippetRepository;
    private SnippetVersionRepository $versionRepository;
    private TagRepository $tagRepository;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->snippetRepository = new SnippetRepository($db);
        $this->versionRepository = new SnippetVersionRepository($db);
        $this->tagRepository = new TagRepository($db);
    }

    public function exportToJson(int $snippetId, bool $includeVersions = true): array
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        if (!$snippet) {
            throw new \Exception('Snippet not found');
        }

        $export = [
            'snippet' => $snippet->toArray(),
            'tags' => $this->snippetRepository->getTags($snippetId),
            'exported_at' => date('Y-m-d H:i:s'),
            'format' => 'json',
            'version' => '1.0'
        ];

        if ($includeVersions) {
            $export['versions'] = $this->versionRepository->findBySnippetId($snippetId);
        }

        return $export;
    }

    public function exportToMarkdown(int $snippetId): string
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        if (!$snippet) {
            throw new \Exception('Snippet not found');
        }

        $latestVersion = $this->versionRepository->findLatestBySnippetId($snippetId);
        $tags = $this->snippetRepository->getTags($snippetId);

        $markdown = "# " . SecurityHelper::escapeHtml($snippet->getTitle()) . "\n\n";
        
        if ($snippet->getDescription()) {
            $markdown .= SecurityHelper::escapeHtml($snippet->getDescription()) . "\n\n";
        }

        $markdown .= "**Language:** " . SecurityHelper::escapeHtml($snippet->getLanguage()) . "\n";
        $markdown .= "**Author:** " . SecurityHelper::escapeHtml($snippet->getAuthorDisplayName()) . "\n";
        $markdown .= "**Created:** " . $snippet->getCreatedAt()->format('Y-m-d H:i:s') . "\n";

        if (!empty($tags)) {
            $markdown .= "**Tags:** " . implode(', ', array_map(fn($tag) => SecurityHelper::escapeHtml($tag['name']), $tags)) . "\n";
        }

        $markdown .= "\n## Code\n\n";
        $markdown .= "```" . $snippet->getLanguage() . "\n";
        $markdown .= $latestVersion ? $latestVersion->getCode() : '// No code content';
        $markdown .= "\n```\n";

        $markdown .= "\n---\n";
        $markdown .= "*Exported from CodeEngage on " . date('Y-m-d H:i:s') . "*\n";

        return $markdown;
    }

    public function exportToVsCodeSnippet(int $snippetId): array
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        if (!$snippet) {
            throw new \Exception('Snippet not found');
        }

        $latestVersion = $this->versionRepository->findLatestBySnippetId($snippetId);

        $snippetData = [
            'name' => SecurityHelper::escapeHtml($snippet->getTitle()),
            'scope' => $this->getVsCodeScope($snippet->getLanguage()),
            'description' => SecurityHelper::escapeHtml($snippet->getDescription() ?? ''),
            'body' => $this->formatSnippetBody($latestVersion ? $latestVersion->getCode() : ''),
            'prefix' => $this->generatePrefix($snippet->getTitle())
        ];

        return [
            'CodeEngage - ' . SecurityHelper::escapeHtml($snippet->getTitle()) => $snippetData
        ];
    }

    public function exportToJetBrainsTemplate(int $snippetId): string
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        if (!$snippet) {
            throw new \Exception('Snippet not found');
        }

        $latestVersion = $this->versionRepository->findLatestBySnippetId($snippetId);

        $template = "<template name=\"" . SecurityHelper::escapeHtml($snippet->getTitle()) . "\" ";
        $template .= "value=\"" . SecurityHelper::escapeHtml($this->generatePrefix($snippet->getTitle())) . "\" ";
        $template .= "description=\"" . SecurityHelper::escapeHtml($snippet->getDescription() ?? '') . "\" ";
        $template .= "toReformat=\"true\" toShortenFQNames=\"true\">\n";

        $template .= "  <variable name=\"VAR\" expression=\"\" defaultValue=\"\"\" alwaysStopAt=\"true\" />\n";
        $template .= "  <context>\n";
        $template .= "    <option name=\"{$this->getJetBrainsContext($snippet->getLanguage())}\" value=\"true\" />\n";
        $template .= "  </context>\n";
        $template .= "  <script language=\"{$this->getJetBrainsLanguage($snippet->getLanguage())}\"><![CDATA[\n";
        $template .= SecurityHelper::escapeHtml($latestVersion ? $latestVersion->getCode() : '');
        $template .= "\n]]></script>\n";
        $template .= "</template>\n";

        return $template;
    }

    public function exportToHtmlEmbed(int $snippetId, array $options = []): string
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        if (!$snippet) {
            throw new \Exception('Snippet not found');
        }

        $latestVersion = $this->versionRepository->findLatestBySnippetId($snippetId);
        $tags = $this->snippetRepository->getTags($snippetId);

        $theme = $options['theme'] ?? 'dark';
        $showMeta = $options['showMeta'] ?? true;
        $height = $options['height'] ?? '400';

        $html = '<div class="codeengage-embed" data-theme="' . $theme . '" style="';
        $html .= 'font-family: \'Inter\', -apple-system, BlinkMacSystemFont, sans-serif; ';
        $html .= 'border-radius: 8px; overflow: hidden; ';
        $html .= 'background: ' . ($theme === 'dark' ? '#1f2937' : '#ffffff') . '; ';
        $html .= 'border: 1px solid ' . ($theme === 'dark' ? '#374151' : '#e5e7eb') . ';';
        $html .= '">';

        if ($showMeta) {
            $html .= '<div style="padding: 12px 16px; background: ' . ($theme === 'dark' ? '#374151' : '#f9fafb') . '; border-bottom: 1px solid ' . ($theme === 'dark' ? '#4b5563' : '#e5e7eb') . ';">';
            $html .= '<div style="display: flex; align-items: center; justify-content: space-between;">';
            $html .= '<div>';
            $html .= '<h3 style="margin: 0; font-size: 14px; font-weight: 600; color: ' . ($theme === 'dark' ? '#ffffff' : '#111827') . ';">' . SecurityHelper::escapeHtml($snippet->getTitle()) . '</h3>';
            $html .= '<p style="margin: 4px 0 0 0; font-size: 12px; color: ' . ($theme === 'dark' ? '#9ca3af' : '#6b7280') . ';">';
            $html .= SecurityHelper::escapeHtml($snippet->getLanguage()) . ' • ' . SecurityHelper::escapeHtml($snippet->getAuthorDisplayName());
            $html .= '</p>';
            $html .= '</div>';
            $html .= '<div style="display: flex; align-items: center; gap: 8px;">';
            $html .= '<span style="font-size: 11px; padding: 2px 6px; background: ' . ($theme === 'dark' ? '#4b5563' : '#e5e7eb') . '; border-radius: 4px; color: ' . ($theme === 'dark' ? '#e5e7eb' : '#374151') . ';">';
            $html .= SecurityHelper::escapeHtml($snippet->getLanguage());
            $html .= '</span>';
            $html .= '</div>';
            $html .= '</div>';
            $html .= '</div>';
        }

        $html .= '<div style="height: ' . $height . 'px; overflow: auto;">';
        $html .= '<pre style="margin: 0; padding: 16px; background: transparent; color: ' . ($theme === 'dark' ? '#e5e7eb' : '#111827') . '; font-family: \'Fira Mono\', Consolas, monospace; font-size: 13px; line-height: 1.5; white-space: pre; overflow-x: auto;">';
        $html .= SecurityHelper::escapeHtml($latestVersion ? $latestVersion->getCode() : '// No code content');
        $html .= '</pre>';
        $html .= '</div>';

        $html .= '<div style="padding: 8px 16px; background: ' . ($theme === 'dark' ? '#374151' : '#f9fafb') . '; border-top: 1px solid ' . ($theme === 'dark' ? '#4b5563' : '#e5e7eb') . '; text-align: right;">';
        $html .= '<a href="https://codeengage.app/snippets/' . $snippetId . '" ';
        $html .= 'style="font-size: 11px; color: ' . ($theme === 'dark' ? '#60a5fa' : '#2563eb') . '; text-decoration: none;">';
        $html .= 'View on CodeEngage →';
        $html .= '</a>';
        $html .= '</div>';

        $html .= '</div>';

        return $html;
    }

    public function exportBatch(array $snippetIds, string $format = 'json'): string
    {
        $zip = new \ZipArchive();
        $tempFile = tempnam(sys_get_temp_dir(), 'codeengage_export_');

        if ($zip->open($tempFile, \ZipArchive::CREATE) !== TRUE) {
            throw new \Exception('Cannot create ZIP file');
        }

        foreach ($snippetIds as $snippetId) {
            try {
                switch ($format) {
                    case 'json':
                        $content = json_encode($this->exportToJson($snippetId), JSON_PRETTY_PRINT);
                        $filename = "snippet_{$snippetId}.json";
                        break;
                    case 'markdown':
                        $content = $this->exportToMarkdown($snippetId);
                        $snippet = $this->snippetRepository->findById($snippetId);
                        $filename = $this->sanitizeFileName($snippet->getTitle()) . '.md';
                        break;
                    case 'html':
                        $content = $this->exportToHtmlEmbed($snippetId);
                        $filename = "snippet_{$snippetId}.html";
                        break;
                    default:
                        throw new \Exception("Unsupported format: {$format}");
                }

                $zip->addFromString($filename, $content);
            } catch (\Exception $e) {
                // Skip problematic snippets but continue with others
                error_log("Failed to export snippet {$snippetId}: " . $e->getMessage());
            }
        }

        $zip->close();
        $content = file_get_contents($tempFile);
        unlink($tempFile);

        return $content;
    }

    public function createGitHubGist(int $snippetId, string $githubToken = null): array
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        if (!$snippet) {
            throw new \Exception('Snippet not found');
        }

        $latestVersion = $this->versionRepository->findLatestBySnippetId($snippetId);

        $gistData = [
            'description' => SecurityHelper::escapeHtml($snippet->getDescription() ?? $snippet->getTitle()),
            'public' => $snippet->getVisibility() === 'public',
            'files' => [
                $this->sanitizeFileName($snippet->getTitle()) . '.' . $this->getFileExtension($snippet->getLanguage()) => [
                    'content' => $latestVersion ? $latestVersion->getCode() : '// No code content'
                ]
            ]
        ];

        if (!$githubToken) {
            throw new \Exception('GitHub token is required for Gist creation');
        }

        $ch = curl_init('https://api.github.com/gists');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($gistData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: token ' . $githubToken,
            'User-Agent: CodeEngage'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 201) {
            throw new \Exception('Failed to create GitHub Gist: ' . $response);
        }

        return json_decode($response, true);
    }

    private function getVsCodeScope(string $language): string
    {
        $scopes = [
            'javascript' => 'javascript',
            'typescript' => 'typescript',
            'python' => 'python',
            'php' => 'php',
            'html' => 'html',
            'css' => 'css',
            'sql' => 'sql',
            'json' => 'json',
            'xml' => 'xml'
        ];

        return $scopes[$language] ?? 'plaintext';
    }

    private function getJetBrainsContext(string $language): string
    {
        $contexts = [
            'javascript' => 'JS_STATEMENT',
            'typescript' => 'TS_STATEMENT',
            'python' => 'PYTHON_STATEMENT',
            'php' => 'PHP',
            'html' => 'HTML',
            'css' => 'CSS',
            'sql' => 'SQL'
        ];

        return $contexts[$language] ?? 'OTHER';
    }

    private function getJetBrainsLanguage(string $language): string
    {
        $languages = [
            'javascript' => 'JavaScript',
            'typescript' => 'TypeScript',
            'python' => 'Python',
            'php' => 'PHP',
            'html' => 'HTML',
            'css' => 'CSS',
            'sql' => 'SQL'
        ];

        return $languages[$language] ?? 'TEXT';
    }

    private function formatSnippetBody(string $code): array
    {
        // Split code into lines and convert to VSCode snippet format
        $lines = explode("\n", $code);
        $body = [];
        
        foreach ($lines as $line) {
            // Escape any existing $ symbols in VSCode format
            $escapedLine = str_replace('$', '\\$', $line);
            $body[] = $escapedLine;
        }
        
        return $body;
    }

    private function generatePrefix(string $title): string
    {
        // Generate a short, memorable prefix from the title
        $prefix = preg_replace('/[^a-zA-Z0-9]/', '', $title);
        $prefix = strtolower(substr($prefix, 0, 6));
        
        return empty($prefix) ? 'snippet' : $prefix;
    }

    private function getFileExtension(string $language): string
    {
        $extensions = [
            'javascript' => 'js',
            'typescript' => 'ts',
            'python' => 'py',
            'php' => 'php',
            'html' => 'html',
            'css' => 'css',
            'sql' => 'sql',
            'json' => 'json',
            'xml' => 'xml',
            'markdown' => 'md',
            'yaml' => 'yml'
        ];

        return $extensions[$language] ?? 'txt';
    }

    private function sanitizeFileName(string $fileName): string
    {
        // Remove special characters and limit length
        $fileName = preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);
        return substr($fileName, 0, 50);
    }
}