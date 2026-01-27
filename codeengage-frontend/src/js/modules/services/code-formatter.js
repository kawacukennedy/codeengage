// Code Formatter Service
class CodeFormatter {
    constructor() {
        this.languages = {
            javascript: {
                indentSize: 2,
                useTabs: false,
                quoteStyle: 'single',
                semicolons: true,
                trailingComma: 'es5'
            },
            typescript: {
                indentSize: 2,
                useTabs: false,
                quoteStyle: 'single',
                semicolons: true,
                trailingComma: 'es5'
            },
            python: {
                indentSize: 4,
                useTabs: false,
                quoteStyle: 'single',
                semicolons: false,
                maxLineLength: 88
            },
            php: {
                indentSize: 4,
                useTabs: false,
                quoteStyle: 'double',
                semicolons: true
            },
            java: {
                indentSize: 4,
                useTabs: false,
                quoteStyle: 'double',
                semicolons: true
            },
            css: {
                indentSize: 2,
                useTabs: false,
                quoteStyle: 'single',
                semicolons: true
            },
            html: {
                indentSize: 2,
                useTabs: false,
                quoteStyle: 'double',
                selfClosingTags: true
            },
            json: {
                indentSize: 2,
                useTabs: false,
                quoteStyle: 'double',
                trailingComma: false
            },
            xml: {
                indentSize: 2,
                useTabs: false,
                quoteStyle: 'double',
                selfClosingTags: true
            },
            sql: {
                indentSize: 2,
                useTabs: false,
                keywordCase: 'upper',
                identifierCase: 'lower'
            }
        };
    }

    format(code, language, options = {}) {
        const config = { ...this.getLanguageConfig(language), ...options };
        
        try {
            switch (language.toLowerCase()) {
                case 'javascript':
                case 'typescript':
                    return this.formatJavaScript(code, config);
                case 'python':
                    return this.formatPython(code, config);
                case 'php':
                    return this.formatPHP(code, config);
                case 'java':
                case 'c':
                case 'cpp':
                case 'csharp':
                    return this.formatCStyle(code, config);
                case 'css':
                    return this.formatCSS(code, config);
                case 'html':
                case 'xml':
                    return this.formatMarkup(code, config);
                case 'json':
                    return this.formatJSON(code, config);
                case 'sql':
                    return this.formatSQL(code, config);
                default:
                    return this.formatGeneric(code, config);
            }
        } catch (error) {
            console.warn(`Failed to format ${language} code:`, error);
            return code;
        }
    }

    getLanguageConfig(language) {
        return this.languages[language.toLowerCase()] || {
            indentSize: 2,
            useTabs: false,
            quoteStyle: 'single'
        };
    }

    formatJavaScript(code, config) {
        let formatted = code;
        
        // Basic JavaScript formatting
        formatted = this.normalizeWhitespace(formatted);
        formatted = this.formatBraces(formatted, config);
        formatted = this.formatQuotes(formatted, config);
        formatted = this.formatSemicolons(formatted, config);
        formatted = this.addIndentation(formatted, config);
        
        return formatted;
    }

    formatPython(code, config) {
        let formatted = code;
        
        // Python-specific formatting
        formatted = this.normalizeWhitespace(formatted);
        formatted = this.formatPythonImports(formatted);
        formatted = this.formatPythonFunctions(formatted, config);
        formatted = this.formatPythonIndentation(formatted, config);
        
        return formatted;
    }

    formatPHP(code, config) {
        let formatted = code;
        
        // PHP-specific formatting
        formatted = this.normalizeWhitespace(formatted);
        formatted = this.formatPHPTags(formatted);
        formatted = this.formatPHPVariables(formatted);
        formatted = this.formatBraces(formatted, config);
        formatted = this.addIndentation(formatted, config);
        
        return formatted;
    }

    formatCStyle(code, config) {
        let formatted = code;
        
        // C-style languages formatting
        formatted = this.normalizeWhitespace(formatted);
        formatted = this.formatBraces(formatted, config);
        formatted = this.formatSemicolons(formatted, config);
        formatted = this.addIndentation(formatted, config);
        
        return formatted;
    }

    formatCSS(code, config) {
        let formatted = code;
        
        // CSS formatting
        formatted = this.normalizeWhitespace(formatted);
        formatted = this.formatCSSRules(formatted, config);
        formatted = this.formatCSSProperties(formatted, config);
        formatted = this.addIndentation(formatted, config);
        
        return formatted;
    }

    formatMarkup(code, config) {
        let formatted = code;
        
        // HTML/XML formatting
        formatted = this.normalizeWhitespace(formatted);
        formatted = this.formatTags(formatted, config);
        formatted = this.formatAttributes(formatted, config);
        formatted = this.addIndentation(formatted, config);
        
        return formatted;
    }

    formatJSON(code, config) {
        try {
            const parsed = JSON.parse(code);
            return JSON.stringify(parsed, null, config.useTabs ? '\t' : ' '.repeat(config.indentSize));
        } catch {
            // If invalid JSON, return as-is with basic formatting
            return this.formatGeneric(code, config);
        }
    }

    formatSQL(code, config) {
        let formatted = code;
        
        // SQL formatting
        formatted = this.normalizeWhitespace(formatted);
        formatted = this.formatSQLKeywords(formatted, config);
        formatted = this.formatSQLClauses(formatted, config);
        formatted = this.addIndentation(formatted, config);
        
        return formatted;
    }

    formatGeneric(code, config) {
        let formatted = code;
        
        // Generic formatting
        formatted = this.normalizeWhitespace(formatted);
        formatted = this.addIndentation(formatted, config);
        
        return formatted;
    }

    // Helper methods
    normalizeWhitespace(code) {
        return code
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t+/g, ' ')
            .replace(/[ \t]+$/gm, '') // Trim trailing spaces
            .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
    }

    formatBraces(code, config) {
        // Basic brace formatting
        return code
            .replace(/\s*{\s*/g, ' {\n')
            .replace(/\s*}\s*/g, '\n}\n')
            .replace(/;(\s*)}/g, ';\n}');
    }

    formatQuotes(code, config) {
        if (config.quoteStyle === 'single') {
            return code.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, "'$1'");
        } else {
            return code.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');
        }
    }

    formatSemicolons(code, config) {
        if (config.semicolons) {
            return code.replace(/([^{])\s*\n/g, '$1;\n');
        } else {
            return code.replace(/;\s*\n/g, '\n');
        }
    }

    addIndentation(code, config) {
        const indent = config.useTabs ? '\t' : ' '.repeat(config.indentSize);
        const lines = code.split('\n');
        let indentLevel = 0;
        
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            
            // Decrease indent for closing braces
            if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.endsWith(')')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            const indentedLine = indent.repeat(Math.max(0, indentLevel)) + trimmed;
            
            // Increase indent for opening braces
            if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
                indentLevel++;
            }
            
            return indentedLine;
        });
        
        return formattedLines.join('\n');
    }

    // Language-specific helper methods
    formatPythonImports(code) {
        return code.replace(/^import\s+/gm, 'import ')
                  .replace(/^from\s+/gm, 'from ');
    }

    formatPythonFunctions(code, config) {
        const indent = config.useTabs ? '\t' : ' '.repeat(config.indentSize);
        
        // Format function definitions
        return code.replace(/^def\s+(\w+)\s*\(/gm, `def $1(`)
                  .replace(/^class\s+(\w+)/gm, `class $1:`);
    }

    formatPythonIndentation(code, config) {
        // Python uses 4 spaces by convention
        const pythonIndent = ' '.repeat(config.indentSize || 4);
        return this.addIndentation(code, { ...config, indentSize: 4, useTabs: false });
    }

    formatPHPTags(code) {
        return code.replace(/<\?php/g, '<?php')
                  .replace(/\?>/g, '?>');
    }

    formatPHPVariables(code) {
        return code.replace(/\$\s*(\w+)/g, '$$1');
    }

    formatCSSRules(code, config) {
        return code.replace(/(\w+)\s*{/g, '$1 {')
                  .replace(/}/g, '}\n')
                  .replace(/;/g, ';\n');
    }

    formatCSSProperties(code, config) {
        return code.replace(/(\w+):\s*([^;]+)/g, '$1: $2');
    }

    formatTags(code, config) {
        if (config.selfClosingTags) {
            return code.replace(/(\w+)\/>/g, '$1 />');
        }
        return code;
    }

    formatAttributes(code, config) {
        return code.replace(/(\w+)=(["'])([^"']*)\2/g, '$1=$2$3$2');
    }

    formatSQLKeywords(code, config) {
        const keywords = [
            'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
            'GROUP', 'BY', 'ORDER', 'HAVING', 'INSERT', 'UPDATE', 'DELETE',
            'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW'
        ];
        
        let formatted = code;
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (config.keywordCase === 'upper') {
                formatted = formatted.replace(regex, keyword);
            } else {
                formatted = formatted.replace(regex, keyword.toLowerCase());
            }
        });
        
        return formatted;
    }

    formatSQLClauses(code, config) {
        return code.replace(/\bWHERE\b/gi, '\nWHERE')
                  .replace(/\bORDER BY\b/gi, '\nORDER BY')
                  .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
                  .replace(/\bHAVING\b/gi, '\nHAVING');
    }

    // Utility methods
    detectLanguage(code) {
        // Simple language detection
        if (code.includes('<?php')) return 'php';
        if (code.includes('def ') && code.includes(':')) return 'python';
        if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript';
        if (code.includes('<!DOCTYPE') || code.includes('<html')) return 'html';
        if (code.includes('SELECT') || code.includes('FROM')) return 'sql';
        if (code.includes('{') && code.includes(';')) return 'javascript';
        
        return 'generic';
    }

    minify(code, language) {
        // Basic minification
        switch (language.toLowerCase()) {
            case 'javascript':
                return code
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
                    .replace(/\/\/.*$/gm, '') // Remove line comments
                    .replace(/\s+/g, ' ') // Collapse whitespace
                    .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
                    .trim();
            case 'css':
                return code
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
                    .replace(/\s+/g, ' ') // Collapse whitespace
                    .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
                    .trim();
            case 'html':
                return code
                    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
                    .replace(/\s+/g, ' ') // Collapse whitespace
                    .trim();
            default:
                return code.replace(/\s+/g, ' ').trim();
        }
    }

    beautify(code, language) {
        // Alias for format
        return this.format(code, language);
    }

    // Format selection only (for partial formatting)
    formatSelection(code, selection, language, options = {}) {
        const before = code.substring(0, selection.start);
        const selected = code.substring(selection.start, selection.end);
        const after = code.substring(selection.end);
        
        const formattedSelected = this.format(selected, language, options);
        
        return before + formattedSelected + after;
    }
}

export default CodeFormatter;