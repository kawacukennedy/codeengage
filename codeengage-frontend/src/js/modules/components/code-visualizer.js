// Code Visualizer Component
class CodeVisualizer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            theme: 'dark',
            showComplexity: true,
            showDependencies: true,
            showStructure: true,
            animated: true,
            ...options
        };
        
        this.code = '';
        this.language = '';
        this.analysis = null;
        this.visualization = null;
        
        this.init();
    }

    init() {
        this.container.className = 'code-visualizer bg-gray-900 rounded-lg p-4';
        this.createVisualizationArea();
    }

    createVisualizationArea() {
        this.container.innerHTML = `
            <div class="visualizer-header flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-white">Code Analysis</h3>
                <div class="visualizer-controls flex items-center space-x-2">
                    <button class="complexity-toggle px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white">
                        Complexity
                    </button>
                    <button class="dependencies-toggle px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white">
                        Dependencies
                    </button>
                    <button class="structure-toggle px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white">
                        Structure
                    </button>
                </div>
            </div>
            <div class="visualizer-content grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div class="complexity-panel">
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Complexity Analysis</h4>
                    <div class="complexity-metrics space-y-2"></div>
                </div>
                <div class="dependencies-panel">
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Dependencies</h4>
                    <div class="dependencies-graph"></div>
                </div>
                <div class="structure-panel">
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Code Structure</h4>
                    <div class="structure-tree"></div>
                </div>
            </div>
        `;
        
        this.addEventListeners();
    }

    async visualize(code, language, analysis = null) {
        this.code = code;
        this.language = language;
        this.analysis = analysis || await this.analyzeCode(code, language);
        
        this.updateComplexityPanel();
        this.updateDependenciesPanel();
        this.updateStructurePanel();
    }

    async analyzeCode(code, language) {
        // Simple code analysis - in a real app, this would call the backend API
        const analysis = {
            complexity: this.calculateComplexity(code, language),
            dependencies: this.extractDependencies(code, language),
            structure: this.analyzeStructure(code, language),
            metrics: this.calculateMetrics(code, language)
        };
        
        return analysis;
    }

    calculateComplexity(code, language) {
        const lines = code.split('\n');
        let complexity = 1; // Base complexity
        
        // Count control flow structures
        const controlStructures = {
            javascript: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'function'],
            python: ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'def', 'class'],
            php: ['if', 'else', 'elseif', 'for', 'foreach', 'while', 'switch', 'case', 'function', 'class'],
            java: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'],
            c: ['if', 'else', 'for', 'while', 'switch', 'case'],
            cpp: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try']
        };
        
        const structures = controlStructures[language.toLowerCase()] || controlStructures.javascript;
        
        lines.forEach(line => {
            structures.forEach(structure => {
                const regex = new RegExp(`\\b${structure}\\b`, 'gi');
                const matches = line.match(regex);
                if (matches) {
                    complexity += matches.length;
                }
            });
        });
        
        // Calculate nesting depth
        const nestingDepth = this.calculateNestingDepth(code);
        complexity += nestingDepth * 2;
        
        return {
            score: complexity,
            level: this.getComplexityLevel(complexity),
            nestingDepth,
            controlFlowCount: lines.filter(line => 
                structures.some(structure => line.toLowerCase().includes(structure))
            ).length
        };
    }

    calculateNestingDepth(code) {
        let maxDepth = 0;
        let currentDepth = 0;
        
        const lines = code.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Count opening braces/indents
            const openBraces = (trimmed.match(/{/g) || []).length;
            const closeBraces = (trimmed.match(/}/g) || []).length;
            
            currentDepth += openBraces - closeBraces;
            maxDepth = Math.max(maxDepth, currentDepth);
        });
        
        return maxDepth;
    }

    getComplexityLevel(score) {
        if (score <= 5) return 'Very Low';
        if (score <= 10) return 'Low';
        if (score <= 20) return 'Medium';
        if (score <= 40) return 'High';
        return 'Very High';
    }

    extractDependencies(code, language) {
        const dependencies = [];
        const lines = code.split('\n');
        
        const patterns = {
            javascript: [
                /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
                /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
                /from\s+['"]([^'"]+)['"]/g
            ],
            python: [
                /import\s+(\w+)/g,
                /from\s+(\w+)\s+import/g
            ],
            php: [
                /require\s+['"]([^'"]+)['"]/g,
                /include\s+['"]([^'"]+)['"]/g,
                /use\s+([^;]+);/g
            ],
            java: [
                /import\s+([^;]+);/g
            ]
        };
        
        const langPatterns = patterns[language.toLowerCase()] || patterns.javascript;
        
        langPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                dependencies.push({
                    name: match[1] || match[0],
                    type: this.getDependencyType(match[1] || match[0], language),
                    line: lines.findIndex(line => line.includes(match[0])) + 1
                });
            }
        });
        
        return dependencies;
    }

    getDependencyType(dependency, language) {
        const builtIn = {
            javascript: ['fs', 'path', 'http', 'https', 'url', 'util', 'events'],
            python: ['os', 'sys', 'json', 'datetime', 'math', 'random'],
            php: ['mysqli', 'pdo', 'curl', 'json', 'datetime'],
            java: ['java.lang', 'java.util', 'java.io', 'java.net']
        };
        
        const builtInDeps = builtIn[language.toLowerCase()] || [];
        
        if (builtInDeps.some(built => dependency.includes(built))) {
            return 'builtin';
        }
        
        if (dependency.startsWith('./') || dependency.startsWith('../')) {
            return 'local';
        }
        
        return 'external';
    }

    analyzeStructure(code, language) {
        const structure = {
            functions: [],
            classes: [],
            variables: [],
            imports: []
        };
        
        const lines = code.split('\n');
        
        // Extract functions
        const functionPatterns = {
            javascript: [/function\s+(\w+)/g, /const\s+(\w+)\s*=\s*\(/g, /(\w+)\s*:\s*function/g],
            python: [/def\s+(\w+)/g],
            php: [/function\s+(\w+)/g],
            java: [/(public|private|protected)?\s*(static)?\s*\w+\s+(\w+)\s*\(/g],
            c: [/(\w+)\s+(\w+)\s*\(/g]
        };
        
        const funcPatterns = functionPatterns[language.toLowerCase()] || functionPatterns.javascript;
        
        funcPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                const name = match[match.length - 1]; // Last capture group is usually the function name
                structure.functions.push({
                    name,
                    line: lines.findIndex(line => line.includes(match[0])) + 1,
                    type: 'function'
                });
            }
        });
        
        // Extract classes
        const classPatterns = {
            javascript: [/class\s+(\w+)/g],
            python: [/class\s+(\w+)/g],
            php: [/class\s+(\w+)/g],
            java: [/class\s+(\w+)/g],
            cpp: [/class\s+(\w+)/g]
        };
        
        const classPatternList = classPatterns[language.toLowerCase()];
        if (classPatternList) {
            classPatternList.forEach(pattern => {
                let match;
                while ((match = pattern.exec(code)) !== null) {
                    structure.classes.push({
                        name: match[1],
                        line: lines.findIndex(line => line.includes(match[0])) + 1,
                        type: 'class'
                    });
                }
            });
        }
        
        return structure;
    }

    calculateMetrics(code, language) {
        const lines = code.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        const commentLines = lines.filter(line => this.isCommentLine(line, language));
        
        return {
            totalLines: lines.length,
            codeLines: nonEmptyLines.length - commentLines.length,
            commentLines: commentLines.length,
            emptyLines: lines.length - nonEmptyLines.length,
            commentRatio: nonEmptyLines.length > 0 ? commentLines.length / nonEmptyLines.length : 0
        };
    }

    isCommentLine(line, language) {
        const trimmed = line.trim();
        const commentPatterns = {
            javascript: ['//', '/*', '*'],
            python: ['#'],
            php: ['//', '/*', '*'],
            java: ['//', '/*', '*'],
            c: ['//', '/*', '*'],
            cpp: ['//', '/*', '*'],
            sql: ['--', '/*'],
            html: ['<!--'],
            css: ['/*']
        };
        
        const patterns = commentPatterns[language.toLowerCase()] || commentPatterns.javascript;
        
        return patterns.some(pattern => trimmed.startsWith(pattern));
    }

    updateComplexityPanel() {
        const panel = this.container.querySelector('.complexity-metrics');
        if (!panel || !this.analysis) return;
        
        const complexity = this.analysis.complexity;
        const levelColor = this.getComplexityLevelColor(complexity.level);
        
        panel.innerHTML = `
            <div class="metric-item">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs text-gray-400">Complexity Score</span>
                    <span class="text-xs font-medium ${levelColor}">${complexity.score}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full" 
                         style="width: ${Math.min(complexity.score * 2, 100)}%"></div>
                </div>
            </div>
            <div class="metric-item">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-400">Level</span>
                    <span class="text-xs font-medium ${levelColor}">${complexity.level}</span>
                </div>
            </div>
            <div class="metric-item">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-400">Nesting Depth</span>
                    <span class="text-xs font-medium text-blue-400">${complexity.nestingDepth}</span>
                </div>
            </div>
            <div class="metric-item">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-400">Control Flow</span>
                    <span class="text-xs font-medium text-purple-400">${complexity.controlFlowCount}</span>
                </div>
            </div>
        `;
    }

    updateDependenciesPanel() {
        const panel = this.container.querySelector('.dependencies-graph');
        if (!panel || !this.analysis) return;
        
        const dependencies = this.analysis.dependencies;
        
        if (dependencies.length === 0) {
            panel.innerHTML = '<p class="text-xs text-gray-500">No dependencies found</p>';
            return;
        }
        
        const dependencyTypes = {
            builtin: 'text-green-400',
            external: 'text-blue-400',
            local: 'text-yellow-400'
        };
        
        panel.innerHTML = dependencies.map(dep => `
            <div class="dependency-item flex items-center justify-between py-1 border-b border-gray-700">
                <span class="text-xs text-gray-300 truncate flex-1">${dep.name}</span>
                <span class="text-xs ${dependencyTypes[dep.type]} ml-2">${dep.type}</span>
            </div>
        `).join('');
    }

    updateStructurePanel() {
        const panel = this.container.querySelector('.structure-tree');
        if (!panel || !this.analysis) return;
        
        const structure = this.analysis.structure;
        
        let html = '';
        
        if (structure.classes.length > 0) {
            html += '<div class="structure-section mb-3">';
            html += '<h5 class="text-xs font-medium text-gray-400 mb-2">Classes</h5>';
            html += structure.classes.map(cls => `
                <div class="structure-item flex items-center py-1">
                    <span class="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    <span class="text-xs text-gray-300">${cls.name}</span>
                    <span class="text-xs text-gray-500 ml-auto">line ${cls.line}</span>
                </div>
            `).join('');
            html += '</div>';
        }
        
        if (structure.functions.length > 0) {
            html += '<div class="structure-section">';
            html += '<h5 class="text-xs font-medium text-gray-400 mb-2">Functions</h5>';
            html += structure.functions.map(func => `
                <div class="structure-item flex items-center py-1">
                    <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    <span class="text-xs text-gray-300">${func.name}</span>
                    <span class="text-xs text-gray-500 ml-auto">line ${func.line}</span>
                </div>
            `).join('');
            html += '</div>';
        }
        
        if (html === '') {
            html = '<p class="text-xs text-gray-500">No structure found</p>';
        }
        
        panel.innerHTML = html;
    }

    getComplexityLevelColor(level) {
        const colors = {
            'Very Low': 'text-green-400',
            'Low': 'text-blue-400',
            'Medium': 'text-yellow-400',
            'High': 'text-orange-400',
            'Very High': 'text-red-400'
        };
        
        return colors[level] || 'text-gray-400';
    }

    addEventListeners() {
        // Toggle buttons
        const complexityToggle = this.container.querySelector('.complexity-toggle');
        const dependenciesToggle = this.container.querySelector('.dependencies-toggle');
        const structureToggle = this.container.querySelector('.structure-toggle');
        
        if (complexityToggle) {
            complexityToggle.addEventListener('click', () => {
                const panel = this.container.querySelector('.complexity-panel');
                panel.classList.toggle('hidden');
                complexityToggle.classList.toggle('bg-blue-600');
            });
        }
        
        if (dependenciesToggle) {
            dependenciesToggle.addEventListener('click', () => {
                const panel = this.container.querySelector('.dependencies-panel');
                panel.classList.toggle('hidden');
                dependenciesToggle.classList.toggle('bg-blue-600');
            });
        }
        
        if (structureToggle) {
            structureToggle.addEventListener('click', () => {
                const panel = this.container.querySelector('.structure-panel');
                panel.classList.toggle('hidden');
                structureToggle.classList.toggle('bg-blue-600');
            });
        }
    }

    // Public methods
    updateOptions(options) {
        this.options = { ...this.options, ...options };
        if (this.code && this.language) {
            this.visualize(this.code, this.language, this.analysis);
        }
    }

    clear() {
        this.createVisualizationArea();
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

export default CodeVisualizer;