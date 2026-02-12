const { supabase } = require('../middleware/auth');

/**
 * Logs AI feature usage to the ai_usage_logs table.
 */
const logAIUsage = async ({
    user_id,
    ai_feature,
    input_tokens,
    output_tokens,
    model_used,
    request_duration_ms
}) => {
    try {
        const total_cost = calculateCost(input_tokens, output_tokens, model_used);

        const { error } = await supabase.from('ai_usage_logs').insert({
            user_id,
            ai_feature,
            input_tokens,
            output_tokens,
            model_used,
            request_duration_ms,
            total_cost
        });

        if (error) console.error('AI Usage Log Error:', error.message);
    } catch (err) {
        console.error('AI Usage Log System Failure:', err.message);
    }
};

/**
 * Calculates the cost of an AI request based on token counts and model pricing.
 */
const calculateCost = (input, output, model) => {
    const pricing = {
        'gemini-1.5-pro': { input: 0.0035 / 1000, output: 0.0105 / 1000 },
        'gemini-1.5-flash': { input: 0.000125 / 1000, output: 0.000375 / 1000 }
    };
    const rate = pricing[model] || pricing['gemini-1.5-flash'];
    return (input * rate.input) + (output * rate.output);
};

/**
 * Performs functional code analysis (Complexity & Security) using internal rules.
 */
const analyzeCodeStatic = (code) => {
    // 1. Complexity Analysis (Simplified Halstead/Cyclomatic)
    const lines = code.split('\n').length;
    const tokens = code.match(/[\w$]+/g) || [];
    const uniqueTokens = new Set(tokens).size;
    const cyclomaticHint = (code.match(/(if|for|while|case|\.map|\.filter)/g) || []).length + 1;

    const complexity_score = Math.min(100, (cyclomaticHint * 10) + (uniqueTokens / 20));

    // 2. Security Scan (Pattern Matching)
    const security_issues = [];
    const patterns = [
        { id: 'SEC001', regex: /eval\(|new Function\(/, title: 'Dynamic Code Execution', severity: 'critical' },
        { id: 'SEC002', regex: /innerHTML|outerHTML/, title: 'Potential XSS Vector', severity: 'high' },
        { id: 'SEC003', regex: /password|secret|key|token/i, title: 'Potential Hardcoded Credential', severity: 'medium' },
        { id: 'SEC004', regex: /child_process\.exec|spawn/, title: 'Shell Command Injection Risk', severity: 'critical' }
    ];

    patterns.forEach(p => {
        if (p.regex.test(code)) {
            security_issues.push({ ...p, regex: undefined }); // Remove regex object for JSON
        }
    });

    return {
        complexity_score: parseFloat(complexity_score.toFixed(2)),
        security_issues,
        performance_metrics: {
            token_count: tokens.length,
            unique_token_density: parseFloat((uniqueTokens / tokens.length).toFixed(2)) || 0,
            loc: lines
        }
    };
};

/**
 * Performs deep neural code analysis using Gemini.
 * @param {string} code - The code to analyze.
 * @param {string} [language='JavaScript'] - The programming language of the code.
 * @returns {Promise<Object|null>} Analysis results including security, performance, and readability scores.
 */
const analyzeCodeAI = async (code, language = 'JavaScript') => {
    const prompt = `
        Analyze the following ${language} code for security, performance, and readability.
        Provide a JSON response with the following schema:
        {
            "security": { "score": 0-100, "description": "short summary", "issues": [{ "title": "title", "severity": "low|medium|high|critical", "description": "detail" }] },
            "performance": { "score": 0-100, "description": "short summary", "bottlenecks": ["bottleneck 1"] },
            "readability": { "score": 0-100, "description": "short summary", "suggestions": ["suggestion 1"] }
        }

        Code:
        \`\`\`${language.toLowerCase()}
        ${code}
        \`\`\`
    `;

    try {
        const result = await callGemini(prompt, { temperature: 0.2 });
        // Clean JSON from markdown if present
        const cleaned = result.text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('[AI Analysis Failure]', error.message);
        return null;
    }
};

/**
 * Orchestrates code analysis, combining static and AI results if enabled.
 * @param {string} code - The code to analyze.
 * @param {Object} [options={}] - Analysis options.
 * @param {boolean} [options.useAI] - Whether to use neural analysis.
 * @param {string} [options.language] - Code language.
 * @returns {Promise<Object>} Combined analysis results.
 */
const analyzeCode = async (code, options = {}) => {
    const staticResults = analyzeCodeStatic(code);

    if (options.useAI) {
        const aiResults = await analyzeCodeAI(code, options.language);
        if (aiResults) {
            return {
                ...staticResults,
                neural_analysis: aiResults,
                score_aggregate: {
                    security: aiResults.security?.score || 100,
                    performance: aiResults.performance?.score || 100,
                    readability: aiResults.readability?.score || 100
                }
            };
        }
    }

    return staticResults;
};

const axios = require('axios');

let cachedModel = null;

/**
 * Dynamically fetches available models and selects the best one.
 */
const getBestAvailableModel = async (apiKey) => {
    if (cachedModel) return cachedModel;

    try {
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        const models = response.data.models || [];
        const modelNames = models.map(m => m.name);

        // Priority order for models
        const priority = [
            'models/gemini-1.5-pro-latest',
            'models/gemini-1.5-pro',
            'models/gemini-1.5-flash-latest',
            'models/gemini-1.5-flash',
            'models/gemini-1.0-pro'
        ];

        for (const target of priority) {
            if (modelNames.includes(target)) {
                cachedModel = target;
                console.log(`[AI] Auto-detected best model: ${cachedModel}`);
                return cachedModel;
            }
        }

        if (modelNames.length > 0) {
            cachedModel = modelNames[0];
            return cachedModel;
        }

        return 'models/gemini-1.5-flash';
    } catch (error) {
        console.error('[AI] Model detection failed, using fallback:', error.message);
        return 'models/gemini-1.5-flash';
    }
};

/**
 * Core function to interact with the Google Gemini API.
 * Supports system instructions, conversation history, and JSON response mode.
 * @param {string} prompt - The primary user prompt.
 * @param {Object} [options={}] - Request configuration.
 * @param {string} [modelOverride] - Force use of a specific Gemini model.
 * @returns {Promise<Object>} AI response including text and token usage.
 */
const callGemini = async (prompt, options = {}, modelOverride = null) => {
    const start = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = modelOverride || await getBestAvailableModel(apiKey);

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
            {
                contents: options.history ? [...options.history, { role: 'user', parts: [{ text: prompt }] }] : [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ],
                systemInstruction: options.systemInstruction ? {
                    parts: [{ text: options.systemInstruction }]
                } : undefined,
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.max_tokens || 4096,
                    responseMimeType: options.jsonResponse ? 'application/json' : 'text/plain'
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiResponse) {
            throw new Error('Invalid response structure from Gemini API');
        }

        return {
            text: aiResponse,
            input_tokens: Math.floor(prompt.length / 4), // Rough estimate for tokens
            output_tokens: Math.floor(aiResponse.length / 4),
            duration: Date.now() - start,
            model_used: model
        };
    } catch (error) {
        console.error('Gemini API Error:', error.response?.data || error.message);
        throw new Error(`AI processing failed (${model}): ${error.message}`);
    }
};

module.exports = { logAIUsage, callGemini, analyzeCode, analyzeCodeStatic, calculateCost };

