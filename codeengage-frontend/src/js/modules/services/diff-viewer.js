// Diff Viewer Service
class DiffViewer {
    constructor() {
        this.diffTypes = {
            ADD: 'add',
            REMOVE: 'remove',
            MODIFY: 'modify',
            EQUAL: 'equal'
        };
    }

    createDiff(oldText, newText, options = {}) {
        const config = {
            contextLines: 3,
            ignoreWhitespace: false,
            caseSensitive: true,
            ...options
        };

        const oldLines = this.splitIntoLines(oldText, config);
        const newLines = this.splitIntoLines(newText, config);
        
        const diff = this.computeDiff(oldLines, newLines, config);
        const hunks = this.groupIntoHunks(diff, config);
        
        return {
            hunks,
            stats: this.computeStats(diff),
            oldText,
            newText,
            config
        };
    }

    splitIntoLines(text, config) {
        if (!text) return [];
        
        let lines = text.split(/\r?\n/);
        
        if (config.ignoreWhitespace) {
            lines = lines.map(line => line.trim());
        }
        
        if (!config.caseSensitive) {
            lines = lines.map(line => line.toLowerCase());
        }
        
        return lines;
    }

    computeDiff(oldLines, newLines, config) {
        const lcs = this.longestCommonSubsequence(oldLines, newLines);
        const diff = [];
        
        let oldIndex = 0;
        let newIndex = 0;
        
        for (const line of lcs) {
            // Add removed lines
            while (oldIndex < oldLines.length && oldLines[oldIndex] !== line) {
                diff.push({
                    type: this.diffTypes.REMOVE,
                    oldLine: oldLines[oldIndex],
                    oldLineNumber: oldIndex + 1,
                    newLine: null,
                    newLineNumber: null
                });
                oldIndex++;
            }
            
            // Add added lines
            while (newIndex < newLines.length && newLines[newIndex] !== line) {
                diff.push({
                    type: this.diffTypes.ADD,
                    oldLine: null,
                    oldLineNumber: null,
                    newLine: newLines[newIndex],
                    newLineNumber: newIndex + 1
                });
                newIndex++;
            }
            
            // Add equal line
            diff.push({
                type: this.diffTypes.EQUAL,
                oldLine: line,
                oldLineNumber: oldIndex + 1,
                newLine: line,
                newLineNumber: newIndex + 1
            });
            
            oldIndex++;
            newIndex++;
        }
        
        // Handle remaining lines
        while (oldIndex < oldLines.length) {
            diff.push({
                type: this.diffTypes.REMOVE,
                oldLine: oldLines[oldIndex],
                oldLineNumber: oldIndex + 1,
                newLine: null,
                newLineNumber: null
            });
            oldIndex++;
        }
        
        while (newIndex < newLines.length) {
            diff.push({
                type: this.diffTypes.ADD,
                oldLine: null,
                oldLineNumber: null,
                newLine: newLines[newIndex],
                newLineNumber: newIndex + 1
            });
            newIndex++;
        }
        
        return diff;
    }

    longestCommonSubsequence(oldLines, newLines) {
        const m = oldLines.length;
        const n = newLines.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill([]));
        
        for (let i = 0; i <= m; i++) {
            for (let j = 0; j <= n; j++) {
                if (i === 0 || j === 0) {
                    dp[i][j] = [];
                } else if (oldLines[i - 1] === newLines[j - 1]) {
                    dp[i][j] = [...dp[i - 1][j - 1], oldLines[i - 1]];
                } else {
                    dp[i][j] = dp[i - 1][j].length > dp[i][j - 1].length ? dp[i - 1][j] : dp[i][j - 1];
                }
            }
        }
        
        return dp[m][n];
    }

    groupIntoHunks(diff, config) {
        const hunks = [];
        let currentHunk = null;
        
        for (let i = 0; i < diff.length; i++) {
            const change = diff[i];
            
            if (change.type === this.diffTypes.EQUAL) {
                if (currentHunk) {
                    // Check if we should end the current hunk
                    const remainingEqual = diff.slice(i).filter(d => d.type === this.diffTypes.EQUAL).length;
                    if (remainingEqual > config.contextLines) {
                        hunks.push(currentHunk);
                        currentHunk = null;
                    } else {
                        currentHunk.changes.push(change);
                    }
                }
            } else {
                if (!currentHunk) {
                    currentHunk = {
                        oldStart: change.oldLineNumber || 1,
                        newStart: change.newLineNumber || 1,
                        oldLines: 0,
                        newLines: 0,
                        changes: []
                    };
                    
                    // Add context lines before the change
                    const contextStart = Math.max(0, i - config.contextLines);
                    for (let j = contextStart; j < i; j++) {
                        if (diff[j].type === this.diffTypes.EQUAL) {
                            currentHunk.changes.push(diff[j]);
                        }
                    }
                }
                
                currentHunk.changes.push(change);
                
                if (change.type === this.diffTypes.REMOVE) {
                    currentHunk.oldLines++;
                } else if (change.type === this.diffTypes.ADD) {
                    currentHunk.newLines++;
                }
            }
        }
        
        if (currentHunk) {
            hunks.push(currentHunk);
        }
        
        return hunks;
    }

    computeStats(diff) {
        const stats = {
            additions: 0,
            deletions: 0,
            modifications: 0,
            changes: 0
        };
        
        for (const change of diff) {
            switch (change.type) {
                case this.diffTypes.ADD:
                    stats.additions++;
                    stats.changes++;
                    break;
                case this.diffTypes.REMOVE:
                    stats.deletions++;
                    stats.changes++;
                    break;
                case this.diffTypes.MODIFY:
                    stats.modifications++;
                    stats.changes += 2; // Count as both addition and deletion
                    break;
            }
        }
        
        return stats;
    }

    renderDiff(diff, container) {
        container.innerHTML = '';
        container.className = 'diff-viewer bg-gray-900 text-gray-100 font-mono text-sm';
        
        const header = document.createElement('div');
        header.className = 'diff-header bg-gray-800 px-4 py-2 border-b border-gray-700';
        header.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <span class="text-green-400">+${diff.stats.additions}</span>
                    <span class="text-red-400">-${diff.stats.deletions}</span>
                    <span class="text-gray-400">${diff.stats.changes} changes</span>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="diff-toggle-context px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">
                        Context: ${diff.config.contextLines}
                    </button>
                    <button class="diff-toggle-whitespace px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">
                        Whitespace: ${diff.config.ignoreWhitespace ? 'Off' : 'On'}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'diff-content';
        
        for (const hunk of diff.hunks) {
            const hunkElement = this.renderHunk(hunk);
            content.appendChild(hunkElement);
        }
        
        container.appendChild(content);
        
        // Add event listeners
        this.addDiffEventListeners(container, diff);
    }

    renderHunk(hunk) {
        const hunkElement = document.createElement('div');
        hunkElement.className = 'diff-hunk border-b border-gray-800';
        
        // Hunk header
        const header = document.createElement('div');
        header.className = 'diff-hunk-header bg-gray-800 px-4 py-1 text-xs text-gray-400';
        header.textContent = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
        hunkElement.appendChild(header);
        
        // Hunk content
        const content = document.createElement('div');
        content.className = 'diff-hunk-content';
        
        for (const change of hunk.changes) {
            const lineElement = this.renderLine(change);
            content.appendChild(lineElement);
        }
        
        hunkElement.appendChild(content);
        return hunkElement;
    }

    renderLine(change) {
        const lineElement = document.createElement('div');
        lineElement.className = `diff-line flex items-stretch`;
        
        // Line numbers
        const oldLineNumber = document.createElement('div');
        oldLineNumber.className = 'diff-line-number old-line bg-gray-800 text-gray-500 px-2 text-right border-r border-gray-700';
        oldLineNumber.style.width = '4ch';
        oldLineNumber.textContent = change.oldLineNumber || '';
        
        const newLineNumber = document.createElement('div');
        newLineNumber.className = 'diff-line-number new-line bg-gray-800 text-gray-500 px-2 text-right border-r border-gray-700';
        newLineNumber.style.width = '4ch';
        newLineNumber.textContent = change.newLineNumber || '';
        
        // Line content
        const content = document.createElement('div');
        content.className = 'diff-line-content flex-1 px-2 whitespace-pre';
        
        switch (change.type) {
            case this.diffTypes.ADD:
                lineElement.classList.add('diff-add');
                oldLineNumber.classList.add('bg-gray-900');
                newLineNumber.classList.add('bg-green-900', 'text-green-400');
                content.classList.add('bg-green-900', 'text-green-300');
                content.textContent = '+';
                break;
            case this.diffTypes.REMOVE:
                lineElement.classList.add('diff-remove');
                oldLineNumber.classList.add('bg-red-900', 'text-red-400');
                newLineNumber.classList.add('bg-gray-900');
                content.classList.add('bg-red-900', 'text-red-300');
                content.textContent = '-';
                break;
            case this.diffTypes.EQUAL:
                lineElement.classList.add('diff-equal');
                content.classList.add('bg-gray-900');
                content.textContent = ' ';
                break;
        }
        
        // Add line content
        const lineText = change.oldLine || change.newLine || '';
        const textSpan = document.createElement('span');
        textSpan.textContent = lineText;
        content.appendChild(textSpan);
        
        lineElement.appendChild(oldLineNumber);
        lineElement.appendChild(newLineNumber);
        lineElement.appendChild(content);
        
        return lineElement;
    }

    addDiffEventListeners(container, diff) {
        // Toggle context button
        const toggleContextBtn = container.querySelector('.diff-toggle-context');
        if (toggleContextBtn) {
            toggleContextBtn.addEventListener('click', () => {
                const newContext = diff.config.contextLines === 3 ? 10 : 3;
                const newDiff = this.createDiff(diff.oldText, diff.newText, {
                    ...diff.config,
                    contextLines: newContext
                });
                this.renderDiff(newDiff, container);
            });
        }
        
        // Toggle whitespace button
        const toggleWhitespaceBtn = container.querySelector('.diff-toggle-whitespace');
        if (toggleWhitespaceBtn) {
            toggleWhitespaceBtn.addEventListener('click', () => {
                const newDiff = this.createDiff(diff.oldText, diff.newText, {
                    ...diff.config,
                    ignoreWhitespace: !diff.config.ignoreWhitespace
                });
                this.renderDiff(newDiff, container);
            });
        }
        
        // Line hover effects
        container.addEventListener('mouseover', (e) => {
            const line = e.target.closest('.diff-line');
            if (line) {
                line.classList.add('bg-gray-800');
            }
        });
        
        container.addEventListener('mouseout', (e) => {
            const line = e.target.closest('.diff-line');
            if (line) {
                line.classList.remove('bg-gray-800');
            }
        });
    }

    // Side-by-side diff view
    renderSideBySideDiff(diff, container) {
        container.innerHTML = '';
        container.className = 'diff-viewer-side-by-side bg-gray-900 text-gray-100 font-mono text-sm';
        
        const header = document.createElement('div');
        header.className = 'diff-header bg-gray-800 px-4 py-2 border-b border-gray-700';
        header.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <span class="text-red-400">Old Version</span>
                    <span class="text-gray-400">vs</span>
                    <span class="text-green-400">New Version</span>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-green-400">+${diff.stats.additions}</span>
                    <span class="text-red-400">-${diff.stats.deletions}</span>
                    <span class="text-gray-400">${diff.stats.changes} changes</span>
                </div>
            </div>
        `;
        container.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'diff-content flex';
        
        const oldContent = document.createElement('div');
        oldContent.className = 'diff-old flex-1 border-r border-gray-700';
        
        const newContent = document.createElement('div');
        newContent.className = 'diff-new flex-1';
        
        for (const hunk of diff.hunks) {
            this.renderSideBySideHunk(hunk, oldContent, newContent);
        }
        
        content.appendChild(oldContent);
        content.appendChild(newContent);
        container.appendChild(content);
    }

    renderSideBySideHunk(hunk, oldContainer, newContainer) {
        for (const change of hunk.changes) {
            switch (change.type) {
                case this.diffTypes.ADD:
                    this.renderSideBySideLine(null, change, newContainer, 'add');
                    break;
                case this.diffTypes.REMOVE:
                    this.renderSideBySideLine(change, null, oldContainer, 'remove');
                    break;
                case this.diffTypes.EQUAL:
                    this.renderSideBySideLine(change, change, oldContainer, 'equal');
                    this.renderSideBySideLine(change, change, newContainer, 'equal');
                    break;
            }
        }
    }

    renderSideBySideLine(oldChange, newChange, container, type) {
        const lineElement = document.createElement('div');
        lineElement.className = `diff-line flex items-stretch`;
        
        const lineNumber = document.createElement('div');
        lineNumber.className = 'diff-line-number bg-gray-800 text-gray-500 px-2 text-right border-r border-gray-700';
        lineNumber.style.width = '4ch';
        lineNumber.textContent = (oldChange?.oldLineNumber || newChange?.newLineNumber || '');
        
        const content = document.createElement('div');
        content.className = 'diff-line-content flex-1 px-2 whitespace-pre';
        
        switch (type) {
            case 'add':
                lineElement.classList.add('diff-add');
                lineNumber.classList.add('bg-green-900', 'text-green-400');
                content.classList.add('bg-green-900', 'text-green-300');
                content.textContent = newChange.newLine || '';
                break;
            case 'remove':
                lineElement.classList.add('diff-remove');
                lineNumber.classList.add('bg-red-900', 'text-red-400');
                content.classList.add('bg-red-900', 'text-red-300');
                content.textContent = oldChange.oldLine || '';
                break;
            case 'equal':
                lineElement.classList.add('diff-equal');
                content.classList.add('bg-gray-900');
                content.textContent = oldChange?.oldLine || newChange?.newLine || '';
                break;
        }
        
        lineElement.appendChild(lineNumber);
        lineElement.appendChild(content);
        container.appendChild(lineElement);
    }

    // Unified diff format export
    exportUnifiedDiff(diff) {
        let output = '';
        
        output += `--- old.txt\t${new Date().toISOString()}\n`;
        output += `+++ new.txt\t${new Date().toISOString()}\n`;
        
        for (const hunk of diff.hunks) {
            output += `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n`;
            
            for (const change of hunk.changes) {
                switch (change.type) {
                    case this.diffTypes.ADD:
                        output += `+${change.newLine}\n`;
                        break;
                    case this.diffTypes.REMOVE:
                        output += `-${change.oldLine}\n`;
                        break;
                    case this.diffTypes.EQUAL:
                        output += ` ${change.oldLine}\n`;
                        break;
                }
            }
        }
        
        return output;
    }
}

export default DiffViewer;