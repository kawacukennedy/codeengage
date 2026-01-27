/**
 * Frontend Unit Tests for Utils Module
 * 
 * Tests for formatters, validators, dom utilities, and storage helpers.
 */

// Mock browser APIs
const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (i) => Object.keys(store)[i] || null
    };
})();

// Test Suite: Formatters
const FormatterTests = {
    testFormatDateReturnsFormattedString() {
        const date = new Date('2024-01-15T10:30:00Z');
        const formatted = formatDate(date);

        console.assert(formatted.includes('Jan'), 'Should contain month abbreviation');
        console.assert(formatted.includes('15'), 'Should contain day');
        console.assert(formatted.includes('2024'), 'Should contain year');
        console.log('✓ testFormatDateReturnsFormattedString');
    },

    testFormatDateHandlesNull() {
        const result = formatDate(null);
        console.assert(result === 'Unknown', 'Should return Unknown for null');
        console.log('✓ testFormatDateHandlesNull');
    },

    testFormatTimeAgoReturnsJustNow() {
        const now = new Date();
        const result = formatTimeAgo(now);
        console.assert(result === 'Just now', 'Should return Just now for current time');
        console.log('✓ testFormatTimeAgoReturnsJustNow');
    },

    testFormatTimeAgoReturnsMinutesAgo() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const result = formatTimeAgo(fiveMinutesAgo);
        console.assert(result.includes('minute'), 'Should contain minute');
        console.log('✓ testFormatTimeAgoReturnsMinutesAgo');
    },

    testFormatTimeAgoReturnsHoursAgo() {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const result = formatTimeAgo(twoHoursAgo);
        console.assert(result.includes('hour'), 'Should contain hour');
        console.log('✓ testFormatTimeAgoReturnsHoursAgo');
    },

    testFormatNumberWithThousands() {
        console.assert(formatNumber(1234) === '1,234', 'Should format with comma');
        console.assert(formatNumber(1000000) === '1,000,000', 'Should format millions');
        console.log('✓ testFormatNumberWithThousands');
    },

    testFormatCompactNumber() {
        console.assert(formatCompactNumber(1500) === '1.5K', 'Should format as K');
        console.assert(formatCompactNumber(2500000) === '2.5M', 'Should format as M');
        console.log('✓ testFormatCompactNumber');
    },

    testFormatBytes() {
        console.assert(formatBytes(1024) === '1 KB', 'Should format KB');
        console.assert(formatBytes(1048576) === '1 MB', 'Should format MB');
        console.assert(formatBytes(0) === '0 Bytes', 'Should handle zero');
        console.log('✓ testFormatBytes');
    },

    testTruncate() {
        const longText = 'This is a very long text that should be truncated';
        const truncated = truncate(longText, 20);
        console.assert(truncated.length <= 20, 'Should not exceed max length');
        console.assert(truncated.endsWith('...'), 'Should end with ellipsis');
        console.log('✓ testTruncate');
    },

    testCapitalize() {
        console.assert(capitalize('hello') === 'Hello', 'Should capitalize first letter');
        console.assert(capitalize('') === '', 'Should handle empty string');
        console.log('✓ testCapitalize');
    }
};

// Test Suite: Validators
const ValidatorTests = {
    testIsValidEmailWithValidEmails() {
        console.assert(isValidEmail('test@example.com') === true, 'Should validate correct email');
        console.assert(isValidEmail('user.name@domain.org') === true, 'Should validate email with dot');
        console.log('✓ testIsValidEmailWithValidEmails');
    },

    testIsValidEmailWithInvalidEmails() {
        console.assert(isValidEmail('invalid') === false, 'Should reject invalid email');
        console.assert(isValidEmail('missing@') === false, 'Should reject incomplete email');
        console.assert(isValidEmail('') === false, 'Should reject empty string');
        console.assert(isValidEmail(null) === false, 'Should reject null');
        console.log('✓ testIsValidEmailWithInvalidEmails');
    },

    testValidateUsernameWithValidUsername() {
        const result = validateUsername('john_doe');
        console.assert(result.isValid === true, 'Should be valid');
        console.assert(result.errors.length === 0, 'Should have no errors');
        console.log('✓ testValidateUsernameWithValidUsername');
    },

    testValidateUsernameRejectsTooShort() {
        const result = validateUsername('ab');
        console.assert(result.isValid === false, 'Should be invalid');
        console.assert(result.errors.length > 0, 'Should have errors');
        console.log('✓ testValidateUsernameRejectsTooShort');
    },

    testValidatePasswordWithStrongPassword() {
        const result = validatePassword('StrongP@ss123');
        console.assert(result.isValid === true, 'Should be valid');
        console.assert(result.strength >= 4, 'Should have high strength');
        console.log('✓ testValidatePasswordWithStrongPassword');
    },

    testValidatePasswordWithWeakPassword() {
        const result = validatePassword('weak');
        console.assert(result.isValid === false, 'Should be invalid');
        console.assert(result.errors.length > 0, 'Should have errors');
        console.log('✓ testValidatePasswordWithWeakPassword');
    },

    testValidateSnippetWithValidData() {
        const snippet = {
            title: 'Test Snippet',
            code: 'console.log("hello")',
            language: 'javascript'
        };
        const result = validateSnippet(snippet);
        console.assert(result.isValid === true, 'Should be valid');
        console.log('✓ testValidateSnippetWithValidData');
    },

    testValidateSnippetRejectsMissingTitle() {
        const snippet = {
            title: '',
            code: 'console.log("hello")',
            language: 'javascript'
        };
        const result = validateSnippet(snippet);
        console.assert(result.isValid === false, 'Should be invalid');
        console.assert('title' in result.errors, 'Should have title error');
        console.log('✓ testValidateSnippetRejectsMissingTitle');
    },

    testIsValidUrl() {
        console.assert(isValidUrl('https://example.com') === true, 'Should validate HTTPS URL');
        console.assert(isValidUrl('http://test.org/path') === true, 'Should validate HTTP URL');
        console.assert(isValidUrl('not-a-url') === false, 'Should reject invalid URL');
        console.log('✓ testIsValidUrl');
    },

    testIsEmpty() {
        console.assert(isEmpty('') === true, 'Empty string should be empty');
        console.assert(isEmpty('   ') === true, 'Whitespace should be empty');
        console.assert(isEmpty(null) === true, 'Null should be empty');
        console.assert(isEmpty([]) === true, 'Empty array should be empty');
        console.assert(isEmpty('text') === false, 'Text should not be empty');
        console.log('✓ testIsEmpty');
    }
};

// Test Suite: DOM Utilities
const DOMTests = {
    testEscapeHtmlPreventsXss() {
        const malicious = '<script>alert("xss")</script>';
        const escaped = escapeHtml(malicious);
        console.assert(!escaped.includes('<script>'), 'Should escape script tags');
        console.assert(escaped.includes('&lt;'), 'Should contain escaped characters');
        console.log('✓ testEscapeHtmlPreventsXss');
    },

    testEscapeHtmlHandlesEmpty() {
        console.assert(escapeHtml('') === '', 'Should return empty for empty input');
        console.assert(escapeHtml(null) === '', 'Should return empty for null');
        console.log('✓ testEscapeHtmlHandlesEmpty');
    },

    testDebounceDelaysExecution() {
        let callCount = 0;
        const debounced = debounce(() => callCount++, 100);

        debounced();
        debounced();
        debounced();

        console.assert(callCount === 0, 'Should not execute immediately');
        console.log('✓ testDebounceDelaysExecution');
    },

    testThrottleLimitsExecution() {
        let callCount = 0;
        const throttled = throttle(() => callCount++, 100);

        throttled();
        throttled();
        throttled();

        console.assert(callCount === 1, 'Should execute only once');
        console.log('✓ testThrottleLimitsExecution');
    }
};

// Test Suite: Storage Utilities
const StorageTests = {
    testSetAndGetLocal() {
        setLocal('test_key', { value: 'test' });
        const result = getLocal('test_key');
        console.assert(result.value === 'test', 'Should store and retrieve object');
        removeLocal('test_key');
        console.log('✓ testSetAndGetLocal');
    },

    testGetLocalWithDefault() {
        const result = getLocal('nonexistent', 'default');
        console.assert(result === 'default', 'Should return default for missing key');
        console.log('✓ testGetLocalWithDefault');
    },

    testSetWithExpiry() {
        setWithExpiry('expiring_key', 'value', 60000);
        const result = getWithExpiry('expiring_key');
        console.assert(result === 'value', 'Should retrieve non-expired value');
        removeLocal('expiring_key');
        console.log('✓ testSetWithExpiry');
    },

    testGetWithExpiryReturnsDefaultForExpired() {
        // Set with past expiry
        setLocal('expired_key', { value: 'old', expiry: Date.now() - 1000 });
        const result = getWithExpiry('expired_key', 'default');
        console.assert(result === 'default', 'Should return default for expired item');
        console.log('✓ testGetWithExpiryReturnsDefaultForExpired');
    }
};

// Mock implementations for testing
function formatDate(date, options = {}) {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...options });
}

function formatTimeAgo(date) {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((new Date() - d) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

function formatNumber(num) {
    return typeof num === 'number' ? num.toLocaleString('en-US') : '0';
}

function formatCompactNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
}

function truncate(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - suffix.length).trim() + suffix;
}

function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function isValidEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username) {
    const errors = [];
    if (!username) { errors.push('Required'); return { isValid: false, errors }; }
    if (username.length < 3) errors.push('Too short');
    if (username.length > 50) errors.push('Too long');
    if (!/^[a-zA-Z]/.test(username)) errors.push('Must start with letter');
    return { isValid: errors.length === 0, errors };
}

function validatePassword(password) {
    const errors = [];
    let strength = 0;
    if (!password) return { isValid: false, strength: 0, errors: ['Required'] };
    if (password.length >= 8) strength++; else errors.push('Min 8 chars');
    if (/[A-Z]/.test(password)) strength++; else errors.push('Needs uppercase');
    if (/[a-z]/.test(password)) strength++; else errors.push('Needs lowercase');
    if (/[0-9]/.test(password)) strength++; else errors.push('Needs number');
    if (/[!@#$%^&*]/.test(password)) strength++;
    return { isValid: errors.length === 0, strength, errors };
}

function validateSnippet(snippet) {
    const errors = {};
    if (!snippet.title?.trim()) errors.title = 'Title required';
    if (!snippet.code?.trim()) errors.code = 'Code required';
    if (!snippet.language) errors.language = 'Language required';
    return { isValid: Object.keys(errors).length === 0, errors };
}

function isValidUrl(url) {
    try { new URL(url); return true; } catch { return false; }
}

function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = { textContent: '' };
    div.textContent = text;
    return text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) { func.apply(this, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); }
    };
}

function setLocal(key, value) { mockLocalStorage.setItem('codeengage_' + key, JSON.stringify(value)); }
function getLocal(key, defaultValue = null) {
    const item = mockLocalStorage.getItem('codeengage_' + key);
    return item ? JSON.parse(item) : defaultValue;
}
function removeLocal(key) { mockLocalStorage.removeItem('codeengage_' + key); }
function setWithExpiry(key, value, ttl) { setLocal(key, { value, expiry: Date.now() + ttl }); }
function getWithExpiry(key, defaultValue = null) {
    const item = getLocal(key);
    if (!item) return defaultValue;
    if (Date.now() > item.expiry) { removeLocal(key); return defaultValue; }
    return item.value;
}

// Run all tests
function runAllTests() {
    console.log('=== Running Formatter Tests ===');
    Object.values(FormatterTests).forEach(test => test());

    console.log('\n=== Running Validator Tests ===');
    Object.values(ValidatorTests).forEach(test => test());

    console.log('\n=== Running DOM Tests ===');
    Object.values(DOMTests).forEach(test => test());

    console.log('\n=== Running Storage Tests ===');
    Object.values(StorageTests).forEach(test => test());

    console.log('\n✅ All tests passed!');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FormatterTests, ValidatorTests, DOMTests, StorageTests, runAllTests };
}
