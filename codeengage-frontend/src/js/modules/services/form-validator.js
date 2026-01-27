// Form Validator Service
class FormValidator {
    constructor() {
        this.rules = {
            required: (value) => {
                if (value === null || value === undefined || value === '') {
                    return 'This field is required';
                }
                return true;
            },
            
            email: (value) => {
                if (!value) return true;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value) ? true : 'Please enter a valid email address';
            },
            
            minLength: (min) => (value) => {
                if (!value) return true;
                return value.length >= min ? true : `Must be at least ${min} characters long`;
            },
            
            maxLength: (max) => (value) => {
                if (!value) return true;
                return value.length <= max ? true : `Must be no more than ${max} characters long`;
            },
            
            password: (value) => {
                if (!value) return true;
                
                const errors = [];
                if (value.length < 8) errors.push('at least 8 characters');
                if (!/[A-Z]/.test(value)) errors.push('one uppercase letter');
                if (!/[a-z]/.test(value)) errors.push('one lowercase letter');
                if (!/[0-9]/.test(value)) errors.push('one number');
                if (!/[^A-Za-z0-9]/.test(value)) errors.push('one special character');
                
                return errors.length === 0 ? true : `Password must contain ${errors.join(', ')}`;
            },
            
            url: (value) => {
                if (!value) return true;
                try {
                    new URL(value);
                    return true;
                } catch {
                    return 'Please enter a valid URL';
                }
            },
            
            username: (value) => {
                if (!value) return true;
                const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
                return usernameRegex.test(value) ? true : 'Username must be 3-20 characters, letters, numbers, underscore, or hyphen only';
            },
            
            code: (value) => {
                if (!value) return true;
                // Basic code validation - check for potentially dangerous patterns
                const dangerousPatterns = [
                    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                    /javascript:/gi,
                    /on\w+\s*=/gi
                ];
                
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(value)) {
                        return 'Code contains potentially dangerous content';
                    }
                }
                
                return true;
            },
            
            language: (value) => {
                if (!value) return true;
                const validLanguages = [
                    'javascript', 'python', 'php', 'java', 'c', 'cpp', 'csharp',
                    'ruby', 'go', 'rust', 'typescript', 'html', 'css', 'sql',
                    'bash', 'powershell', 'json', 'xml', 'yaml', 'markdown'
                ];
                
                return validLanguages.includes(value.toLowerCase()) ? true : 'Please select a valid programming language';
            },
            
            title: (value) => {
                if (!value) return true;
                if (value.length < 3) return 'Title must be at least 3 characters long';
                if (value.length > 100) return 'Title must be no more than 100 characters long';
                return true;
            },
            
            description: (value) => {
                if (!value) return true;
                if (value.length > 1000) return 'Description must be no more than 1000 characters long';
                return true;
            }
        };
    }

    validate(value, ruleName, ruleParams = {}) {
        const rule = this.rules[ruleName];
        if (!rule) {
            console.warn(`Validation rule '${ruleName}' not found`);
            return true;
        }

        if (typeof rule === 'function') {
            return rule(value);
        } else if (typeof rule === 'string') {
            const [ruleFnName, ...params] = rule.split(':');
            const ruleFn = this.rules[ruleFnName];
            if (ruleFn && typeof ruleFn === 'function') {
                return ruleFn(value, ...params, ...Object.values(ruleParams));
            }
        }

        return true;
    }

    validateField(field, rules = {}) {
        const value = field.value || field.textContent || '';
        const errors = [];
        const isValid = true;

        for (const [ruleName, ruleParams] of Object.entries(rules)) {
            const result = this.validate(value, ruleName, ruleParams);
            
            if (result !== true) {
                errors.push({
                    rule: ruleName,
                    message: typeof result === 'string' ? result : 'Validation failed',
                    value: value
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            field,
            value
        };
    }

    validateForm(form, schema = {}) {
        const results = {};
        let formValid = true;

        for (const [fieldName, fieldRules] of Object.entries(schema)) {
            const field = form.querySelector(`[name="${fieldName}"]`) || 
                         form.querySelector(`#${fieldName}`);
            
            if (field) {
                const result = this.validateField(field, fieldRules);
                results[fieldName] = result;
                
                if (!result.valid) {
                    formValid = false;
                    this.showFieldError(field, result.errors);
                } else {
                    this.clearFieldError(field);
                }
            }
        }

        return {
            valid: formValid,
            results,
            formData: this.getFormData(form)
        };
    }

    showFieldError(field, errors) {
        // Clear existing errors
        this.clearFieldError(field);

        // Add error classes
        field.classList.add('border-red-500', 'focus:ring-red-500');

        // Create error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'mt-1 text-sm text-red-600';
        errorContainer.setAttribute('data-field-error', field.name || field.id);
        
        errors.forEach(error => {
            const errorElement = document.createElement('div');
            errorElement.textContent = error.message;
            errorContainer.appendChild(errorElement);
        });

        // Insert error after field
        field.parentNode.insertBefore(errorContainer, field.nextSibling);
    }

    clearFieldError(field) {
        field.classList.remove('border-red-500', 'focus:ring-red-500');
        
        const errorContainer = field.parentNode.querySelector(`[data-field-error="${field.name || field.id}"]`);
        if (errorContainer) {
            errorContainer.remove();
        }
    }

    getFormData(form) {
        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            // Handle multiple values (checkboxes, multi-select)
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    // Real-time validation
    enableRealTimeValidation(form, schema) {
        for (const [fieldName, fieldRules] of Object.entries(schema)) {
            const field = form.querySelector(`[name="${fieldName}"]`) || 
                         form.querySelector(`#${fieldName}`);
            
            if (field) {
                const events = ['blur', 'input', 'change'];
                
                events.forEach(eventType => {
                    field.addEventListener(eventType, () => {
                        const result = this.validateField(field, fieldRules);
                        
                        if (result.valid) {
                            this.clearFieldError(field);
                        } else if (eventType === 'blur' || (eventType === 'input' && field.classList.contains('border-red-500'))) {
                            this.showFieldError(field, result.errors);
                        }
                    });
                });
            }
        }
    }

    // Debounced validation for performance
    enableDebouncedValidation(form, schema, delay = 300) {
        const debouncedValidate = this.debounce(() => {
            this.validateForm(form, schema);
        }, delay);

        form.addEventListener('input', debouncedValidate);
        form.addEventListener('change', debouncedValidate);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Custom validation rule registration
    addRule(name, ruleFunction) {
        this.rules[name] = ruleFunction;
    }

    // Remove validation rule
    removeRule(name) {
        delete this.rules[name];
    }

    // Get all available rules
    getRules() {
        return Object.keys(this.rules);
    }

    // Validate single value against multiple rules
    validateValue(value, rules = []) {
        const errors = [];
        
        for (const rule of rules) {
            let ruleName, ruleParams;
            
            if (typeof rule === 'string') {
                ruleName = rule;
                ruleParams = {};
            } else if (typeof rule === 'object') {
                ruleName = rule.name;
                ruleParams = rule.params || {};
            }
            
            const result = this.validate(value, ruleName, ruleParams);
            if (result !== true) {
                errors.push({
                    rule: ruleName,
                    message: typeof result === 'string' ? result : 'Validation failed'
                });
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default FormValidator;