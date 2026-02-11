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
 * Performs functional code analysis (Complexity & Security).
 */
const analyzeCode = (code) => {
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

        // Fallback to whatever is available first if no priority matches
        if (modelNames.length > 0) {
            cachedModel = modelNames[0];
            return cachedModel;
        }

        return 'models/gemini-1.5-flash'; // Last resort
    } catch (error) {
        console.error('[AI] Model detection failed, using fallback:', error.message);
        return 'models/gemini-1.5-flash';
    }
};

/**
 * Real Gemini API call with auto-model detection.
 */
const callGemini = async (prompt, options = {}, modelOverride = null) => {
    const start = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    // Auto-detect model if not provided or if we want to follow user's request to "remove specific model"
    const model = modelOverride || await getBestAvailableModel(apiKey);

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
            {
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.max_tokens || 4096,
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
            input_tokens: Math.floor(prompt.length / 4),
            output_tokens: Math.floor(aiResponse.length / 4),
            duration: Date.now() - start,
            model_used: model
        };
    } catch (error) {
        console.error('Gemini API Error:', error.response?.data || error.message);
        throw new Error(`AI processing failed (${model}): ${error.message}`);
    }
};

module.exports = { logAIUsage, callGemini, analyzeCode, calculateCost };
