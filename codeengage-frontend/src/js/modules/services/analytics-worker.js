// Analytics Worker - Web Worker for Code Analysis
class AnalyticsWorker {
    constructor() {
        this.worker = null;
        this.isSupported = typeof Worker !== 'undefined';
        this.pendingTasks = new Map();
        this.taskId = 0;
        
        this.init();
    }

    init() {
        if (!this.isSupported) {
            console.warn('Web Workers not supported - falling back to main thread');
            return;
        }

        // Create worker from blob
        const workerCode = this.getWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        this.worker = new Worker(workerUrl);
        
        // Setup message handler
        this.worker.onmessage = (event) => {
            this.handleWorkerMessage(event);
        };
        
        this.worker.onerror = (error) => {
            console.error('Worker error:', error);
        };
        
        // Cleanup blob URL
        URL.revokeObjectURL(workerUrl);
    }

    getWorkerCode() {
        return `
            // Web Worker code for code analysis
            let taskId = 0;
            let pendingTasks = new Map();

            // Message handler from main thread
            self.onmessage = function(event) {
                const { type, id, data } = event.data;
                
                switch (type) {
                    case 'analyze':
                        analyzeCode(id, data);
                        break;
                    case 'complexity':
                        calculateComplexity(id, data);
                        break;
                    case 'security':
                        analyzeSecurity(id, data);
                        break;
                    case 'performance':
                        analyzePerformance(id, data);
                        break;
                    case 'metrics':
                        calculateMetrics(id, data);
                        break;
                    default:
                        self.postMessage({
                            type: 'error',
                            id,
                            error: 'Unknown task type: ' + type
                        });
                }
            };

            function analyzeCode(id, data) {
                try {
                    const { code, language } = data;
                    
                    const analysis = {
                        complexity: calculateComplexity(code),
                        security: analyzeSecurity(code, language),
                        performance: analyzePerformance(code, language),
                        metrics: calculateMetrics(code, language),
                        language: detectLanguage(code),
                        timestamp: Date.now()
                    };
                    
                    self.postMessage({
                        type: 'analysis_complete',
                        id,
                        data: analysis
                    });
                    
                } catch (error) {
                    self.postMessage({
                        type: 'error',
                        id,
                        error: error.message
                    });
                }
            }

            function calculateComplexity(code) {
                let complexity = 1; // Base complexity
                
                const patterns = {
                    '/\\\\bif\\\\b/': 1,
                    '/\\\\belse\\\\s+if\\\\b/': 1,
                    '/\\\\belse\\\\b/': 0,
                    '/\\\\bwhile\\\\b/': 1,
                    '/\\\\bfor\\\\b/': 1,
                    '/\\\\bforeach\\\\b/': 1,
                    '/\\\\bswitch\\\\b/': 1,
                    '/\\\\bcase\\\\b/': 1,
                    '/\\\\bcatch\\\\b/': 1,
                    '/\\\\b\\\\?\\\\s*:/' => 1, // ternary operator
                    '/\\\\|\\\\|/': 0.5,
                    '/&&/': 0.5,
                };
                
                for (const [pattern, weight] of Object.entries(patterns)) {
                    const regex = new RegExp(pattern);
                    const matches = code.match(regex);
                    if (matches) {
                        complexity += matches.length * weight;
                    }
                }
                
                return Math.round(complexity * 100) / 100;
            }

            function analyzeSecurity(code, language) {
                const issues = [];
                
                // Common security patterns
                const securityPatterns = {
                    'SQL Injection': [
                        '/\\\\$_GET\\\\[.*\\\\].*mysql_query/',
                        '/\\\\$_POST\\\\[.*\\\\].*mysql_query/',
                        '/\\\\$_REQUEST\\\\[.*\\\\].*mysql_query/',
                        '/mysqli_query.*\\\\$_/',
                        '/PDO.*prepare.*\\\\$_/',
                    ],
                    'XSS': [
                        '/echo\\\\s*\\\\$_GET/',
                        '/echo\\\\s*\\\\$_POST/',
                        '/echo\\\\s*\\\\$_REQUEST/',
                        '/innerHTML\\\\s*=.*\\\\$_/',
                        '/document\\\\.write.*\\\\$_/',
                    ],
                    'Path Traversal': [
                        '/include.*\\\\$_GET/',
                        '/require.*\\\\$_GET/',
                        '/fopen.*\\\\$_GET/',
                        '/file_get_contents.*\\\\$_GET/',
                    ],
                    'Hardcoded Credentials': [
                        '/password\\\\s*=\\\\s*["\\'][^"\\']+["\\']/',
                        '/secret\\\\s*=\\\\s*["\\'][^"\\']+["\\']/',
                        '/api_key\\\\s*=\\\\s*["\\'][^"\\']+["\\']/',
                        '/token\\\\s*=\\\\s*["\\'][^"\\']+["\\']/',
                    ],
                    'Eval Usage': [
                        '/eval\\\\s*\\\\(/',
                        '/assert\\\\s*\\\\(/',
                        '/create_function\\\\s*\\\\(/',
                        '/preg_replace.*\\\\/e/',
                    ],
                };
                
                for (const [type, patterns] of Object.entries(securityPatterns)) {
                    for (const pattern of patterns) {
                        if (new RegExp(pattern).test(code)) {
                            issues.push({
                                type: type,
                                severity: 'high',
                                description: "Potential " + type + " vulnerability detected",
                            });
                        }
                    }
                }
                
                return issues;
            }

            function analyzePerformance(code, language) {
                const suggestions = [];
                
                // Performance patterns
                const performancePatterns = {
                    'Nested Loops': [
                        '/for.*{.*for.*{/',
                        '/while.*{.*while.*{/',
                        '/for.*{.*while.*{/',
                    ],
                    'Inefficient String Operations': [
                        '/\\\\+\\\\s*\\\\+\\\\s*\\\\+/', // Multiple string concatenation
                        '/str_replace.*\\\\/.*\\\\/.*\\\\/', // Multiple str_replace
                    ],
                    'Large Array Operations': [
                        '/array_map.*array_map/',
                        '/array_filter.*array_filter/',
                    ],
                    'Blocking Operations': [
                        '/sleep\\\\(/',
                        '/usleep\\\\(/',
                        '/file_get_contents.*\\\\$/',
                    ],
                };
                
                for (const [type, patterns] of Object.entries(performancePatterns)) {
                    for (const pattern of patterns) {
                        if (new RegExp(pattern).test(code)) {
                            suggestions.push({
                                type: type,
                                severity: 'medium',
                                description: "Consider optimizing " + type.toLowerCase(),
                            });
                        }
                    }
                }
                
                return suggestions;
            }

            function calculateMetrics(code, language) {
                const lines = code.split('\\n');
                const nonEmptyLines = lines.filter(line => line.trim().length > 0);
                
                return {
                    lines_of_code: lines.length,
                    non_empty_lines: nonEmptyLines.length,
                    characters: code.length,
                    characters_no_spaces: code.replace(/\\\\s/g, '').length,
                    average_line_length: nonEmptyLines.length > 0 ? 
                        Math.round(nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length) : 0,
                    comment_lines: countCommentLines(code, language),
                    code_lines: nonEmptyLines.length - countCommentLines(code, language),
                    functions: extractFunctions(code, language).length,
                    classes: extractClasses(code, language).length,
                    imports: extractImports(code, language).length
                };
            }

            function countCommentLines(code, language) {
                const commentPatterns = {
                    'javascript': ['//', '/\\\\*', '/\\\\*'],
                    'python': ['#', '"""', "'''"],
                    'php': ['//', '/\\\\*', '/\\\\*', '#'],
                    'java': ['//', '/\\\\*', '/\\\\*'],
                    'cpp': ['//', '/\\\\*', '/\\\\*'],
                    'csharp': ['//', '/\\\\*', '/\\\\*'],
                    'ruby': ['#'],
                    'sql': ['--', '/\\\\*', '/\\\\*'],
                };
                
                const patterns = commentPatterns[language] || [];
                let commentLines = 0;
                
                for (const pattern of patterns) {
                    const regex = new RegExp(pattern, 'gm');
                    const matches = code.match(regex);
                    if (matches) {
                        commentLines += matches.length;
                    }
                }
                
                return commentLines;
            }

            function extractFunctions(code, language) {
                const functions = [];
                
                const functionPatterns = {
                    'javascript': [
                        /function\\\\s+(\\\\w+)\\\\s*\\\\([^)]*\\\\)/g,
                        /const\\\\s+(\\\\w+)\\\\s*=\\\\s*\\\\([^)]*\\\\)\\\\s*=>/g,
                        /var\\\\s+(\\\\w+)\\\\s*=\\\\s*\\\\([^)]*\\\\)\\\\s*=>/g
                    ],
                    'python': [
                        /def\\\\s+(\\\\w+)\\\\s*\\\\([^)]*\\\\)/g
                    ],
                    'php': [
                        /function\\\\s+(\\\\w+)\\\\s*\\\\([^)]*\\\\)/g
                    ],
                    'java': [
                        /(?:public|private|protected)?\\\\s*(?:static)?\\\\s*(?:\\\\w+\\\\s+)?(\\\\w+)\\\\s*\\\\([^)]*\\\\)\\\\s*{/g
                    ],
                    'cpp': [
                        /(?:inline|virtual)?\\\\s*(?:\\\\w+\\\\s+)?(\\\\w+)\\\\s*\\\\([^)]*\\\\)\\\\s*{/g
                    ]
                };
                
                const patterns = functionPatterns[language] || [];
                
                for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(code)) !== null) {
                        functions.push(match[1] || match[2]);
                    }
                }
                
                return [...new Set(functions)]; // Remove duplicates
            }

            function extractClasses(code, language) {
                const classes = [];
                
                const classPatterns = {
                    'javascript': [
                        /class\\\\s+(\\\\w+)/g
                    ],
                    'python': [
                        /class\\\\s+(\\\\w+)/g
                    ],
                    'php': [
                        /class\\\\s+(\\\\w+)/g
                    ],
                    'java': [
                        /(?:public|private|protected)?\\\\s*class\\\\s+(\\\\w+)/g
                    ],
                    'cpp': [
                        /class\\\\s+(\\\\w+)/g
                    ],
                    'csharp': [
                        /(?:public|private|protected)?\\\\s*class\\\\s+(\\\\w+)/g
                    ]
                };
                
                const patterns = classPatterns[language] || [];
                
                for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(code)) !== null) {
                        classes.push(match[1]);
                    }
                }
                
                return [...new Set(classes)]; // Remove duplicates
            }

            function extractImports(code, language) {
                const imports = [];
                
                const importPatterns = {
                    'javascript': [
                        /import\\\\s+.*from\\\\s+['"]([^'"]+)['"]/g,
                        /require\\\\s*\\\\(['"]([^'"]+)['"]\\\\)/g
                    ],
                    'python': [
                        /import\\\\s+(.+)/g,
                        /from\\\\s+(.+)\\\\s+import/g
                    ],
                    'php': [
                        /require\\\\s*\\\\(['"]([^'"]+)['"]\\\\)/g,
                        /include\\\\s*\\\\(['"]([^'"]+)['"]\\\\)/g
                    ],
                    'java': [
                        /import\\\\s+(.+)/g
                    ],
                    'cpp': [
                        /#include\\\\s*<(.+)>/g,
                        /#include\\\\s*\\\\(['"](.+)['"]\\\\)/g
                    ]
                };
                
                const patterns = importPatterns[language] || [];
                
                for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(code)) !== null) {
                        imports.push(match[1] || match[2]);
                    }
                }
                
                return [...new Set(imports)]; // Remove duplicates
            }

            function detectLanguage(code) {
                const languages = {
                    'php': ['<?php', 'function', 'class', 'echo', 'var_dump'],
                    'javascript': ['function', 'const', 'let', 'var', 'console.log', '=>'],
                    'python': ['def', 'import', 'print', 'class', 'if __name__'],
                    'java': ['public class', 'private', 'public static void main', 'System.out'],
                    'cpp': ['#include', 'int main', 'cout', 'cin', 'std::'],
                    'csharp': ['using System', 'public class', 'Console.WriteLine', 'namespace'],
                    'go': ['package main', 'func main', 'fmt.Println', 'import'],
                    'rust': ['fn main', 'use std', 'println!', 'extern crate'],
                    'ruby': ['def ', 'require', 'puts', 'class', 'module'],
                    'html': ['<!DOCTYPE', '<html', '<div', '<script'],
                    'css': ['{', '}', 'margin:', 'padding:', '.class', '#id'],
                    'sql': ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE'],
                    'json': ['{', '}', '"', ':', '[', ']'],
                    'xml': ['<?xml', '<', '</', '>'],
                    'yaml': ['---', ':', '- ', 'key: value'],
                    'bash': ['#!/bin/bash', 'echo', 'export', 'function', 'if [']
                };
                
                let scores = {};
                
                for (const [lang, keywords] of Object.entries(languages)) {
                    let score = 0;
                    for (const keyword of keywords) {
                        score += (code.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
                    }
                    scores[lang] = score;
                }
                
                let bestLang = 'text';
                let bestScore = 0;
                
                for (const [lang, score] of Object.entries(scores)) {
                    if (score > bestScore) {
                        bestScore = score;
                        bestLang = lang;
                    }
                }
                
                return bestLang;
            }
        `;
    }

    async analyzeCode(code, language = null) {
        if (!this.isSupported) {
            // Fallback to main thread analysis
            return this.analyzeCodeMain(code, language);
        }

        return new Promise((resolve, reject) => {
            const taskId = ++this.taskId;
            
            this.pendingTasks.set(taskId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'analyze',
                id: taskId,
                data: { code, language }
            });
        });
    }

    async calculateComplexity(code) {
        if (!this.isSupported) {
            return this.calculateComplexityMain(code);
        }

        return new Promise((resolve, reject) => {
            const taskId = ++this.taskId;
            
            this.pendingTasks.set(taskId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'complexity',
                id: taskId,
                data: { code }
            });
        });
    }

    async analyzeSecurity(code, language) {
        if (!this.isSupported) {
            return this.analyzeSecurityMain(code, language);
        }

        return new Promise((resolve, reject) => {
            const taskId = ++this.taskId;
            
            this.pendingTasks.set(taskId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'security',
                id: taskId,
                data: { code, language }
            });
        });
    }

    async analyzePerformance(code, language) {
        if (!this.isSupported) {
            return this.analyzePerformanceMain(code, language);
        }

        return new Promise((resolve, reject) => {
            const taskId = ++this.taskId;
            
            this.pendingTasks.set(taskId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'performance',
                id: taskId,
                data: { code, language }
            });
        });
    }

    async calculateMetrics(code, language) {
        if (!this.isSupported) {
            return this.calculateMetricsMain(code, language);
        }

        return new Promise((resolve, reject) => {
            const taskId = ++this.taskId;
            
            this.pendingTasks.set(taskId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'metrics',
                id: taskId,
                data: { code, language }
            });
        });
    }

    handleWorkerMessage(event) {
        const { type, id, data, error } = event.data;
        
        if (type === 'error' && this.pendingTasks.has(id)) {
            const { reject } = this.pendingTasks.get(id);
            reject(new Error(error));
            this.pendingTasks.delete(id);
        } else if (type === 'analysis_complete' && this.pendingTasks.has(id)) {
            const { resolve } = this.pendingTasks.get(id);
            resolve(data);
            this.pendingTasks.delete(id);
        }
    }

    // Fallback methods for when Web Workers are not supported
    analyzeCodeMain(code, language) {
        const detectedLanguage = language || this.detectLanguage(code);
        
        return {
            complexity: this.calculateComplexityMain(code),
            security: this.analyzeSecurityMain(code, detectedLanguage),
            performance: this.analyzePerformanceMain(code, detectedLanguage),
            metrics: this.calculateMetricsMain(code, detectedLanguage),
            language: detectedLanguage,
            timestamp: Date.now()
        };
    }

    calculateComplexityMain(code) {
        let complexity = 1;
        
        const patterns = {
            '/\\bif\\b/': 1,
            '/\\belse\\s+if\\b/': 1,
            '/\\belse\\b/': 0,
            '/\\bwhile\\b/': 1,
            '/\\bfor\\b/': 1,
            '/\\bforeach\\b/': 1,
            '/\\bswitch\\b/': 1,
            '/\\bcase\\b/': 1,
            '/\\bcatch\\b/': 1,
            '/\\b\\?\\s*:/' => 1,
            '/\\|\\|/': 0.5,
            '/&&/': 0.5,
        };
        
        for (const [pattern, weight] of Object.entries(patterns)) {
            const regex = new RegExp(pattern);
            const matches = code.match(regex);
            if (matches) {
                complexity += matches.length * weight;
            }
        }
        
        return Math.round(complexity * 100) / 100;
    }

    analyzeSecurityMain(code, language) {
        const issues = [];
        
        const securityPatterns = {
            'SQL Injection': [
                '/\\$_GET\\[.*\\].*mysql_query/',
                '/\\$_POST\\[.*\\].*mysql_query/',
                '/\\$_REQUEST\\[.*\\].*mysql_query/',
                '/mysqli_query.*\\$_/',
                '/PDO.*prepare.*\\$_/',
            ],
            'XSS': [
                '/echo\\s*\\$_GET/',
                '/echo\\s*\\$_POST/',
                '/echo\\s*\\$_REQUEST/',
                '/innerHTML\\s*=.*\\$_/',
                '/document\\.write.*\\$_/',
            ],
            'Path Traversal': [
                '/include.*\\$_GET/',
                '/require.*\\$_GET/',
                '/fopen.*\\$_GET/',
                '/file_get_contents.*\\$_GET/',
            ],
            'Hardcoded Credentials': [
                '/password\\s*=\\s*["\'][^"\']+["\']/',
                '/secret\\s*=\\s*["\'][^"\']+["\']/',
                '/api_key\\s*=\\s*["\'][^"\']+["\']/',
                '/token\\s*=\\s*["\'][^"\']+["\']/',
            ],
            'Eval Usage': [
                '/eval\\s*\\(/',
                '/assert\\s*\\(/',
                '/create_function\\s*\\(/',
                '/preg_replace.*\\/e/',
            ],
        };
        
        for (const [type, patterns] of Object.entries(securityPatterns)) {
            for (const pattern of patterns) {
                if (new RegExp(pattern).test(code)) {
                    issues.push({
                        type: type,
                        severity: 'high',
                        description: `Potential ${type} vulnerability detected`,
                    });
                }
            }
        }
        
        return issues;
    }

    analyzePerformanceMain(code, language) {
        const suggestions = [];
        
        const performancePatterns = {
            'Nested Loops': [
                '/for.*{.*for.*{/',
                '/while.*{.*while.*{/',
                '/for.*{.*while.*{/',
            ],
            'Inefficient String Operations': [
                '/\\+\\s*\\+\\s*\\+/',
                '/str_replace.*\\/.*\\/.*\\//',
            ],
            'Large Array Operations': [
                '/array_map.*array_map/',
                '/array_filter.*array_filter/',
            ],
            'Blocking Operations': [
                '/sleep\\(/',
                '/usleep\\(/',
                '/file_get_contents.*\\$/',
            ],
        };
        
        for (const [type, patterns] of Object.entries(performancePatterns)) {
            for (const pattern of patterns) {
                if (new RegExp(pattern).test(code)) {
                    suggestions.push({
                        type: type,
                        severity: 'medium',
                        description: `Consider optimizing ${type.toLowerCase()}`,
                    });
                }
            }
        }
        
        return suggestions;
    }

    calculateMetricsMain(code, language) {
        const lines = code.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        return {
            lines_of_code: lines.length,
            non_empty_lines: nonEmptyLines.length,
            characters: code.length,
            characters_no_spaces: code.replace(/\s/g, '').length,
            average_line_length: nonEmptyLines.length > 0 ? 
                Math.round(nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length) : 0,
            comment_lines: this.countCommentLines(code, language),
            code_lines: nonEmptyLines.length - this.countCommentLines(code, language),
            functions: this.extractFunctions(code, language).length,
            classes: this.extractClasses(code, language).length,
            imports: this.extractImports(code, language).length
        };
    }

    detectLanguage(code) {
        const languages = {
            'php': ['<?php', 'function', 'class', 'echo', 'var_dump'],
            'javascript': ['function', 'const', 'let', 'var', 'console.log', '=>'],
            'python': ['def', 'import', 'print', 'class', 'if __name__'],
            'java': ['public class', 'private', 'public static void main', 'System.out'],
            'cpp': ['#include', 'int main', 'cout', 'cin', 'std::'],
            'csharp': ['using System', 'public class', 'Console.WriteLine', 'namespace'],
            'go': ['package main', 'func main', 'fmt.Println', 'import'],
            'rust': ['fn main', 'use std', 'println!', 'extern crate'],
            'ruby': ['def ', 'require', 'puts', 'class', 'module'],
            'html': ['<!DOCTYPE', '<html', '<div', '<script'],
            'css': ['{', '}', 'margin:', 'padding:', '.class', '#id'],
            'sql': ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE'],
            'json': ['{', '}', '"', ':', '[', ']'],
            'xml': ['<?xml', '<', '</', '>'],
            'yaml': ['---', ':', '- ', 'key: value'],
            'bash': ['#!/bin/bash', 'echo', 'export', 'function', 'if [']
        };
        
        let scores = {};
        
        for (const [lang, keywords] of Object.entries(languages)) {
            let score = 0;
            for (const keyword of keywords) {
                score += (code.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
            }
            scores[lang] = score;
        }
        
        let bestLang = 'text';
        let bestScore = 0;
        
        for (const [lang, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestLang = lang;
            }
        }
        
        return bestLang;
    }

    countCommentLines(code, language) {
        const commentPatterns = {
            'javascript': ['//', '/\\*', '/\\*'],
            'python': ['#', '"""', "'''"],
            'php': ['//', '/\\*', '/\\*', '#'],
            'java': ['//', '/\\*', '/\\*'],
            'cpp': ['//', '/\\*', '/\\*'],
            'csharp': ['//', '/\\*', '/\\*'],
            'ruby': ['#'],
            'sql': ['--', '/\\*', '/\\*'],
        };
        
        const patterns = commentPatterns[language] || [];
        let commentLines = 0;
        
        for (const pattern of patterns) {
            const regex = new RegExp(pattern, 'gm');
            const matches = code.match(regex);
            if (matches) {
                commentLines += matches.length;
            }
        }
        
        return commentLines;
    }

    extractFunctions(code, language) {
        const functions = [];
        
        const functionPatterns = {
            'javascript': [
                /function\s+(\w+)\s*\([^)]*\)/g,
                /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,
                /var\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g
            ],
            'python': [
                /def\s+(\w+)\s*\([^)]*\)/g
            ],
            'php': [
                /function\s+(\w+)\s*\([^)]*\)/g
            ],
            'java': [
                /(?:public|private|protected)?\s*(?:static)?\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/g
            ],
            'cpp': [
                /(?:inline|virtual)?\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/g
            ]
        };
        
        const patterns = functionPatterns[language] || [];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                functions.push(match[1] || match[2]);
            }
        }
        
        return [...new Set(functions)];
    }

    extractClasses(code, language) {
        const classes = [];
        
        const classPatterns = {
            'javascript': [
                /class\s+(\w+)/g
            ],
            'python': [
                /class\s+(\w+)/g
            ],
            'php': [
                /class\s+(\w+)/g
            ],
            'java': [
                /(?:public|private|protected)?\s*class\s+(\w+)/g
            ],
            'cpp': [
                /class\s+(\w+)/g
            ],
            'csharp': [
                /(?:public|private|protected)?\s*class\s+(\w+)/g
            ]
        };
        
        const patterns = classPatterns[language] || [];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                classes.push(match[1]);
            }
        }
        
        return [...new Set(classes)];
    }

    extractImports(code, language) {
        const imports = [];
        
        const importPatterns = {
            'javascript': [
                /import\s+.*from\s+['"]([^'"]+)['"]/g,
                /require\s*\(['"]([^'"]+)['"]\)/g
            ],
            'python': [
                /import\s+(.+)/g,
                /from\s+(.+)\s+import/g
            ],
            'php': [
                /require\s*\(['"]([^'"]+)['"]\)/g,
                /include\s*\(['"]([^'"]+)['"]\)/g
            ],
            'java': [
                /import\s+(.+)/g
            ],
            'cpp': [
                /#include\s*<(.+)>/g,
                /#include\s*\(['"](.+)['"]\)/g
            ]
        };
        
        const patterns = importPatterns[language] || [];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                imports.push(match[1] || match[2]);
            }
        }
        
        return [...new Set(imports)];
    }

    // Utility methods
    isSupported() {
        return this.isSupported;
    }

    getWorkerStatus() {
        return {
            supported: this.isSupported,
            active: !!this.worker,
            pendingTasks: this.pendingTasks.size
        };
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

// Export for use in other modules
window.AnalyticsWorker = AnalyticsWorker;