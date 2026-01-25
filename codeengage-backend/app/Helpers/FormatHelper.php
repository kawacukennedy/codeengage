<?php

namespace App\Helpers;

class FormatHelper
{
    public static function toJson(array $data): string
    {
        return json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }

    public static function fromJson(string $json): array
    {
        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }

    public static function toMarkdown(string $code, string $language = ''): string
    {
        return "```{$language}\n{$code}\n```";
    }

    public static function toVsCodeSnippet(array $snippet): string
    {
        $vsCode = [
            $snippet['title'] => [
                'prefix' => $snippet['title'],
                'body' => explode("\n", $snippet['code']),
                'description' => $snippet['description'] ?? '',
            ]
        ];
        
        return self::toJson($vsCode);
    }

    public static function toJetBrainsTemplate(array $snippet): string
    {
        $variables = '';
        if (!empty($snippet['template_variables'])) {
            foreach ($snippet['template_variables'] as $var => $default) {
                $variables .= "\n  <variable name=\"{$var}\" expression=\"{$default}\" defaultValue=\"{$default}\" alwaysStopAt=\"true\" />";
            }
        }
        
        return <<<XML
<template name="{$snippet['title']}" value="{$snippet['code']}" description="{$snippet['description']}" toReformat="false" toShortenFQNames="true">{$variables}
</template>
XML;
    }

    public static function toHtmlEmbed(array $snippet): string
    {
        $language = htmlspecialchars($snippet['language']);
        $code = htmlspecialchars($snippet['code']);
        $title = htmlspecialchars($snippet['title']);
        
        return <<<HTML
<div class="codeengage-embed" data-snippet-id="{$snippet['id']}">
    <div class="codeengage-header">
        <h3>{$title}</h3>
        <span class="language">{$language}</span>
    </div>
    <pre><code class="language-{$language}">{$code}</code></pre>
    <div class="codeengage-footer">
        <a href="https://codeengage.app/snippets/{$snippet['id']}" target="_blank">View on CodeEngage</a>
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

    public static function formatFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;
        
        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }
        
        return round($bytes, 2) . ' ' . $units[$unitIndex];
    }

    public static function formatDate(\DateTime $date): string
    {
        return $date->format('Y-m-d H:i:s');
    }

    public static function formatDuration(int $seconds): string
    {
        if ($seconds < 60) {
            return "{$seconds}s";
        }
        
        $minutes = floor($seconds / 60);
        if ($minutes < 60) {
            return "{$minutes}m " . ($seconds % 60) . "s";
        }
        
        $hours = floor($minutes / 60);
        $remainingMinutes = $minutes % 60;
        return "{$hours}h {$remainingMinutes}m";
    }

    public static function slugify(string $text): string
    {
        $text = strtolower($text);
        $text = preg_replace('/[^a-z0-9 -]/', '', $text);
        $text = str_replace(' ', '-', $text);
        $text = preg_replace('/-+/', '-', $text);
        
        return trim($text, '-');
    }

    public static function excerpt(string $text, int $length = 100): string
    {
        if (strlen($text) <= $length) {
            return $text;
        }
        
        $excerpt = substr($text, 0, $length);
        $lastSpace = strrpos($excerpt, ' ');
        
        if ($lastSpace !== false) {
            $excerpt = substr($excerpt, 0, $lastSpace);
        }
        
        return $excerpt . '...';
    }
}