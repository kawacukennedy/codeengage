// Export Generator Service
class ExportGenerator {
    constructor() {
        this.formats = {
            JSON: 'json',
            MARKDOWN: 'markdown',
            HTML: 'html',
            PDF: 'pdf',
            CODE_SNIPPETS: 'code-snippets',
            JETBRAINS: 'jetbrains',
            GITHUB_GIST: 'github-gist',
            ZIP: 'zip'
        };
        
        this.supportedLanguages = [
            'javascript', 'typescript', 'python', 'php', 'java', 'c', 'cpp',
            'csharp', 'ruby', 'go', 'rust', 'html', 'css', 'sql', 'bash',
            'json', 'xml', 'yaml', 'markdown'
        ];
    }

    async export(snippets, format, options = {}) {
        const config = {
            includeMetadata: true,
            includeComments: false,
            syntaxHighlighting: true,
            theme: 'dark',
            ...options
        };

        try {
            switch (format.toLowerCase()) {
                case this.formats.JSON:
                    return this.exportJSON(snippets, config);
                case this.formats.MARKDOWN:
                    return this.exportMarkdown(snippets, config);
                case this.formats.HTML:
                    return this.exportHTML(snippets, config);
                case this.formats.PDF:
                    return await this.exportPDF(snippets, config);
                case this.formats.CODE_SNIPPETS:
                    return this.exportCodeSnippets(snippets, config);
                case this.formats.JETBRAINS:
                    return this.exportJetBrains(snippets, config);
                case this.formats.GITHUB_GIST:
                    return await this.exportGitHubGist(snippets, config);
                case this.formats.ZIP:
                    return await this.exportZIP(snippets, config);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            console.error(`Export to ${format} failed:`, error);
            throw error;
        }
    }

    exportJSON(snippets, config) {
        const data = {
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
            format: 'codeengage-json',
            snippets: snippets.map(snippet => this.formatSnippetForJSON(snippet, config))
        };

        return JSON.stringify(data, null, 2);
    }

    formatSnippetForJSON(snippet, config) {
        const formatted = {
            id: snippet.id,
            title: snippet.title,
            description: snippet.description,
            language: snippet.language,
            code: snippet.code,
            visibility: snippet.visibility,
            tags: snippet.tags || [],
            createdAt: snippet.created_at,
            updatedAt: snippet.updated_at
        };

        if (config.includeMetadata) {
            formatted.author = snippet.author;
            formatted.viewCount = snippet.view_count;
            formatted.starCount = snippet.star_count;
            formatted.forkedFrom = snippet.forked_from_id;
            formatted.isTemplate = snippet.is_template;
        }

        if (config.includeComments && snippet.comments) {
            formatted.comments = snippet.comments;
        }

        return formatted;
    }

    exportMarkdown(snippets, config) {
        let markdown = `# Code Snippets Export\n\n`;
        markdown += `*Exported on ${new Date().toLocaleDateString()}*\n\n`;
        markdown += `*Total snippets: ${snippets.length}*\n\n`;

        if (config.includeMetadata) {
            markdown += `## Table of Contents\n\n`;
            snippets.forEach((snippet, index) => {
                markdown += `${index + 1}. [${snippet.title}](#${this.slugify(snippet.title)})\n`;
            });
            markdown += `\n`;
        }

        snippets.forEach((snippet, index) => {
            markdown += `## ${index + 1}. ${snippet.title}\n\n`;
            
            if (snippet.description) {
                markdown += `${snippet.description}\n\n`;
            }

            markdown += `**Language:** ${snippet.language}\n\n`;
            
            if (snippet.tags && snippet.tags.length > 0) {
                markdown += `**Tags:** ${snippet.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
            }

            markdown += `### Code\n\n`;
            markdown += `\`\`\`${snippet.language}\n`;
            markdown += snippet.code;
            markdown += `\n\`\`\`\n\n`;

            if (config.includeMetadata) {
                markdown += `### Metadata\n\n`;
                markdown += `- **Author:** ${snippet.author?.display_name || 'Unknown'}\n`;
                markdown += `- **Created:** ${new Date(snippet.created_at).toLocaleDateString()}\n`;
                markdown += `- **Updated:** ${new Date(snippet.updated_at).toLocaleDateString()}\n`;
                markdown += `- **Views:** ${snippet.view_count || 0}\n`;
                markdown += `- **Stars:** ${snippet.star_count || 0}\n\n`;
            }

            markdown += `---\n\n`;
        });

        return markdown;
    }

    exportHTML(snippets, config) {
        const theme = config.theme === 'dark' ? 'dark' : 'light';
        const bgColor = theme === 'dark' ? '#1f2937' : '#ffffff';
        const textColor = theme === 'dark' ? '#f3f4f6' : '#111827';
        const codeBg = theme === 'dark' ? '#374151' : '#f3f4f6';

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Snippets Export</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: ${bgColor};
            color: ${textColor};
            line-height: 1.6;
            margin: 0;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
        }
        .snippet {
            margin-bottom: 3rem;
            padding: 1.5rem;
            border-radius: 0.5rem;
            background-color: ${theme === 'dark' ? '#111827' : '#f9fafb'};
            border: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
        }
        .snippet-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: ${theme === 'dark' ? '#f3f4f6' : '#111827'};
        }
        .snippet-description {
            margin-bottom: 1rem;
            color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
        }
        .snippet-meta {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
        }
        .snippet-meta span {
            background-color: ${codeBg};
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
        }
        .code-block {
            background-color: ${codeBg};
            border-radius: 0.375rem;
            padding: 1rem;
            overflow-x: auto;
            font-family: 'Fira Mono', 'Monaco', 'Consolas', monospace;
            font-size: 0.875rem;
            line-height: 1.5;
        }
        .code-block pre {
            margin: 0;
            white-space: pre-wrap;
        }
        .tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 1rem;
        }
        .tag {
            background-color: ${theme === 'dark' ? '#3b82f6' : '#2563eb'};
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
        }
        @media print {
            body { padding: 1rem; }
            .snippet { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Code Snippets Export</h1>
            <p>Exported on ${new Date().toLocaleDateString()} • ${snippets.length} snippets</p>
        </div>`;

        snippets.forEach((snippet, index) => {
            html += `
        <div class="snippet">
            <h2 class="snippet-title">${index + 1}. ${this.escapeHtml(snippet.title)}</h2>`;
            
            if (snippet.description) {
                html += `
            <p class="snippet-description">${this.escapeHtml(snippet.description)}</p>`;
            }

            html += `
            <div class="snippet-meta">
                <span>Language: ${snippet.language}</span>`;
            
            if (snippet.author?.display_name) {
                html += `<span>Author: ${this.escapeHtml(snippet.author.display_name)}</span>`;
            }
            
            html += `<span>Created: ${new Date(snippet.created_at).toLocaleDateString()}</span>
            </div>
            <div class="code-block">
                <pre><code>${this.escapeHtml(snippet.code)}</code></pre>
            </div>`;
            
            if (snippet.tags && snippet.tags.length > 0) {
                html += `
            <div class="tags">`;
                snippet.tags.forEach(tag => {
                    html += `<span class="tag">${this.escapeHtml(tag)}</span>`;
                });
                html += `
            </div>`;
            }

            html += `
        </div>`;
        });

        html += `
    </div>
</body>
</html>`;

        return html;
    }

    async exportPDF(snippets, config) {
        // For PDF export, we'll create HTML first and then use browser's print functionality
        // In a real implementation, you might use a library like jsPDF or Puppeteer
        const html = this.exportHTML(snippets, { ...config, theme: 'light' });
        
        // Create a blob and open in new window for printing
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        return {
            type: 'pdf',
            url,
            html,
            filename: `code-snippets-${new Date().toISOString().split('T')[0]}.pdf`
        };
    }

    exportCodeSnippets(snippets, config) {
        const codeSnippets = {};
        
        snippets.forEach(snippet => {
            const name = this.generateSnippetName(snippet);
            codeSnippets[name] = {
                prefix: this.generatePrefix(snippet),
                body: this.formatSnippetBody(snippet),
                description: snippet.description || snippet.title
            };
        });

        return JSON.stringify(codeSnippets, null, 2);
    }

    exportJetBrains(snippets, config) {
        let xml = `<templateSet group="CodeEngage Export">\n`;
        
        snippets.forEach(snippet => {
            const name = this.generateSnippetName(snippet);
            const body = this.escapeXml(snippet.code);
            const description = this.escapeXml(snippet.description || snippet.title);
            
            xml += `  <template name="${name}" value="${body}" description="${description}" toReformat="true" toShortenFasterNames="true">\n`;
            
            if (snippet.language) {
                xml += `    <context>\n`;
                xml += `      <option name="JAVA_CODE" value="${snippet.language === 'java'}" />\n`;
                xml += `      <option name="JAVASCRIPT_CODE" value="${snippet.language === 'javascript'}" />\n`;
                xml += `      <option name="PYTHON_CODE" value="${snippet.language === 'python'}" />\n`;
                xml += `      <option name="PHP_CODE" value="${snippet.language === 'php'}" />\n`;
                xml += `    </context>\n`;
            }
            
            xml += `  </template>\n`;
        });
        
        xml += `</templateSet>`;
        
        return xml;
    }

    async exportGitHubGist(snippets, config) {
        // This would require GitHub API integration
        // For now, return the data structure needed for Gist creation
        const gistData = {
            description: `Code snippets export - ${new Date().toLocaleDateString()}`,
            public: config.public || false,
            files: {}
        };

        snippets.forEach(snippet => {
            const filename = `${this.slugify(snippet.title)}.${this.getFileExtension(snippet.language)}`;
            gistData.files[filename] = {
                content: snippet.code,
                description: snippet.description || snippet.title
            };
        });

        return {
            type: 'github-gist',
            data: gistData,
            url: 'https://api.github.com/gists',
            method: 'POST'
        };
    }

    async exportZIP(snippets, config) {
        const JSZip = await import('jszip');
        const zip = new JSZip.default();

        snippets.forEach(snippet => {
            const filename = `${this.slugify(snippet.title)}.${this.getFileExtension(snippet.language)}`;
            zip.file(filename, snippet.code);
            
            if (config.includeMetadata) {
                const metadata = this.formatSnippetForJSON(snippet, config);
                zip.file(`${filename}.json`, JSON.stringify(metadata, null, 2));
            }
        });

        // Add README
        const readme = this.generateReadme(snippets, config);
        zip.file('README.md', readme);

        const blob = await zip.generateAsync({ type: 'blob' });
        
        return {
            type: 'zip',
            blob,
            filename: `code-snippets-${new Date().toISOString().split('T')[0]}.zip`
        };
    }

    // Utility methods
    generateSnippetName(snippet) {
        const name = snippet.title
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        return name.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
    }

    generatePrefix(snippet) {
        const title = snippet.title.toLowerCase();
        const words = title.split(/\s+/).slice(0, 3);
        return words.join('-');
    }

    formatSnippetBody(snippet) {
        // Format snippet for VS Code snippets format
        const lines = snippet.code.split('\n');
        const formattedLines = lines.map(line => {
            // Escape special characters
            return line
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\$/g, '\\$');
        });
        
        return formattedLines.join('\\n');
    }

    getFileExtension(language) {
        const extensions = {
            javascript: 'js',
            typescript: 'ts',
            python: 'py',
            php: 'php',
            java: 'java',
            c: 'c',
            cpp: 'cpp',
            csharp: 'cs',
            ruby: 'rb',
            go: 'go',
            rust: 'rs',
            html: 'html',
            css: 'css',
            sql: 'sql',
            bash: 'sh',
            json: 'json',
            xml: 'xml',
            yaml: 'yml',
            markdown: 'md'
        };
        
        return extensions[language.toLowerCase()] || 'txt';
    }

    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    generateReadme(snippets, config) {
        let readme = `# Code Snippets Export\n\n`;
        readme += `Exported on ${new Date().toLocaleDateString()}\n\n`;
        readme += `## Snippets\n\n`;
        
        snippets.forEach((snippet, index) => {
            readme += `${index + 1}. **${snippet.title}** (\`${snippet.language}\`)\n`;
            if (snippet.description) {
                readme += `   ${snippet.description}\n`;
            }
            readme += `\n`;
        });

        return readme;
    }

    // Download helper
    download(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    // Batch export
    async batchExport(snippets, formats, options = {}) {
        const results = {};
        
        for (const format of formats) {
            try {
                results[format] = await this.export(snippets, format, options);
            } catch (error) {
                console.error(`Failed to export to ${format}:`, error);
                results[format] = { error: error.message };
            }
        }
        
        return results;
    }

    // Get supported formats
    getSupportedFormats() {
        return Object.keys(this.formats);
    }

    // Validate format
    isFormatSupported(format) {
        return Object.values(this.formats).includes(format.toLowerCase());
    }
}

export default ExportGenerator;