/**
 * DecisionCore AI - Enterprise Rules Engine
 * Dynamic, data-driven business rule evaluation with full explainability
 * 
 * @author Taha Khattari
 * @copyright 2026 Taha Khattari
 * @version 2.0.0
 */

'use strict';

const LOG = '[RulesEngine]';

// ============================================================
// OPERATOR DEFINITIONS
// ============================================================

const OPERATORS = {
    EQ: (val, v1) => String(val) == String(v1),
    NE: (val, v1) => String(val) != String(v1),
    GT: (val, v1) => parseFloat(val) > parseFloat(v1),
    LT: (val, v1) => parseFloat(val) < parseFloat(v1),
    GTE: (val, v1) => parseFloat(val) >= parseFloat(v1),
    LTE: (val, v1) => parseFloat(val) <= parseFloat(v1),
    BETWEEN: (val, v1, v2) => {
        const n = parseFloat(val);
        return n >= parseFloat(v1) && n <= parseFloat(v2);
    },
    IN: (val, v1) => {
        const list = String(v1).split(',').map(s => s.trim());
        return list.includes(String(val));
    },
    NOT_IN: (val, v1) => {
        const list = String(v1).split(',').map(s => s.trim());
        return !list.includes(String(val));
    },
    CONTAINS: (val, v1) => String(val).toLowerCase().includes(String(v1).toLowerCase()),
    REGEX: (val, v1) => new RegExp(v1).test(String(val)),
    IS_NULL: (val) => val === null || val === undefined,
    IS_NOT_NULL: (val) => val !== null && val !== undefined
};

// ============================================================
// EXPRESSION EVALUATOR
// ============================================================

class ExpressionEvaluator {
    constructor(payload) {
        this.payload = payload;
        this.errors = [];
    }

    evaluate(expression) {
        if (!expression || expression.trim() === '') return true;

        try {
            let processed = this._processExpression(expression);
            return this._safeEval(processed);
        } catch (error) {
            this.errors.push(`Expression error: ${error.message}`);
            return false;
        }
    }

    _processExpression(expr) {
        // Handle IN operator
        expr = expr.replace(/(\w+(?:\.\w+)*)\s+IN\s*\((.*?)\)/gi, (_, field, values) => {
            const val = this._getValue(field);
            const list = values.split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
            return list.includes(String(val)) ? 'true' : 'false';
        });

        // Handle NOT IN operator
        expr = expr.replace(/(\w+(?:\.\w+)*)\s+NOT\s+IN\s*\((.*?)\)/gi, (_, field, values) => {
            const val = this._getValue(field);
            const list = values.split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
            return !list.includes(String(val)) ? 'true' : 'false';
        });

        // Handle BETWEEN operator
        expr = expr.replace(/(\w+(?:\.\w+)*)\s+BETWEEN\s+(\d+(?:\.\d+)?)\s+AND\s+(\d+(?:\.\d+)?)/gi, (_, field, min, max) => {
            const val = parseFloat(this._getValue(field));
            return (val >= parseFloat(min) && val <= parseFloat(max)) ? 'true' : 'false';
        });

        // Replace field references with values
        expr = expr.replace(/(?<!['".\d])([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)(?!['"(])/g, (match) => {
            const keywords = ['true', 'false', 'null', 'undefined', 'AND', 'OR', 'NOT'];
            if (keywords.includes(match.toLowerCase())) return match.toLowerCase();

            const value = this._getValue(match);
            if (value === undefined || value === null) return 'null';
            if (typeof value === 'string') return `"${value.replace(/"/g, '\\"')}"`;
            if (typeof value === 'boolean') return value.toString();
            return value;
        });

        // Replace logical operators
        expr = expr.replace(/\bAND\b/gi, '&&');
        expr = expr.replace(/\bOR\b/gi, '||');
        expr = expr.replace(/\bNOT\b/gi, '!');

        return expr;
    }

    _getValue(path) {
        const parts = path.split('.');
        let value = this.payload;
        for (const part of parts) {
            if (value === null || value === undefined) return undefined;
            value = value[part];
        }
        return value;
    }

    _safeEval(expr) {
        const fn = new Function(`"use strict"; return (${expr});`);
        return Boolean(fn());
    }
}

// ============================================================
// RULES ENGINE
// ============================================================

class RulesEngine {
    constructor(options = {}) {
        this.options = {
            defaultScore: 50,
            maxScore: 100,
            minScore: 0,
            logLevel: 'INFO',
            ...options
        };
        this.evaluationLog = [];
    }

    /**
     * Evaluate all rules for a scenario against payload
     * @param {Array} rules - Rules from database
     * @param {Object} payload - Input data
     * @param {Object} scenario - Scenario configuration
     * @returns {Object} Evaluation result
     */
    evaluate(rules, payload, scenario = {}) {
        const startTime = Date.now();
        this.evaluationLog = [];

        let totalScore = this.options.defaultScore;
        let forcedDecision = null;
        let blockedBy = null;
        const flags = [];
        const firedRules = [];
        const skippedRules = [];
        const explanations = [];

        // Sort by priority (lower = higher priority) and filter active
        const activeRules = rules
            .filter(r => r.status === 'ACTIVE')
            .sort((a, b) => (a.priority || 100) - (b.priority || 100));

        console.log(`${LOG} Evaluating ${activeRules.length} active rules`);

        for (const rule of activeRules) {
            // Skip if already blocked
            if (blockedBy) {
                skippedRules.push({
                    ruleCode: rule.ruleCode,
                    ruleName: rule.ruleName,
                    reason: 'Processing blocked by prior rule'
                });
                continue;
            }

            // Check validity period
            if (!this._isRuleValid(rule)) {
                skippedRules.push({
                    ruleCode: rule.ruleCode,
                    ruleName: rule.ruleName,
                    reason: 'Outside validity period'
                });
                continue;
            }

            // Evaluate rule
            const result = this._evaluateRule(rule, payload);
            this.evaluationLog.push(result);

            if (result.matched) {
                const ruleInfo = {
                    ruleCode: rule.ruleCode,
                    ruleName: rule.ruleName,
                    action: rule.action,
                    scoreModifier: rule.scoreModifier || 0,
                    confidence: rule.confidence || 100,
                    explanation: rule.explanation
                };
                firedRules.push(ruleInfo);

                // Process action
                switch (rule.action) {
                    case 'ADD_SCORE':
                        totalScore += (rule.scoreModifier || 0);
                        explanations.push({
                            rule: rule.ruleCode,
                            action: 'ADD_SCORE',
                            impact: rule.scoreModifier,
                            text: rule.explanation || `${rule.ruleName}: ${rule.scoreModifier > 0 ? '+' : ''}${rule.scoreModifier} points`
                        });
                        break;

                    case 'SET_DECISION':
                        if (!forcedDecision) {
                            forcedDecision = rule.decisionOverride;
                            explanations.push({
                                rule: rule.ruleCode,
                                action: 'SET_DECISION',
                                decision: rule.decisionOverride,
                                text: rule.explanation || `${rule.ruleName}: Decision set to ${rule.decisionOverride}`
                            });
                        }
                        break;

                    case 'BLOCK':
                        blockedBy = rule.ruleCode;
                        forcedDecision = 'REJECTED';
                        explanations.push({
                            rule: rule.ruleCode,
                            action: 'BLOCK',
                            text: rule.explanation || `${rule.ruleName}: Request blocked`
                        });
                        break;

                    case 'FLAG':
                        flags.push({
                            rule: rule.ruleCode,
                            message: rule.explanation || rule.ruleName,
                            severity: 'WARNING'
                        });
                        explanations.push({
                            rule: rule.ruleCode,
                            action: 'FLAG',
                            text: `⚠️ ${rule.explanation || rule.ruleName}`
                        });
                        break;

                    case 'REQUIRE_REVIEW':
                        if (!forcedDecision || forcedDecision !== 'REJECTED') {
                            forcedDecision = 'REVIEW';
                            explanations.push({
                                rule: rule.ruleCode,
                                action: 'REQUIRE_REVIEW',
                                text: rule.explanation || `${rule.ruleName}: Manual review required`
                            });
                        }
                        break;
                }

                // Stop processing if rule has stopOnMatch
                if (rule.stopOnMatch) {
                    console.log(`${LOG} Stop on match triggered by ${rule.ruleCode}`);
                    break;
                }
            } else {
                skippedRules.push({
                    ruleCode: rule.ruleCode,
                    ruleName: rule.ruleName,
                    reason: result.reason || 'Condition not matched'
                });
            }
        }

        // Clamp score
        totalScore = Math.max(this.options.minScore, Math.min(this.options.maxScore, totalScore));

        const processingTime = Date.now() - startTime;

        console.log(`${LOG} Evaluation complete: score=${totalScore}, fired=${firedRules.length}, time=${processingTime}ms`);

        return {
            score: totalScore,
            forcedDecision,
            blocked: !!blockedBy,
            blockedBy,
            flags,
            firedRules,
            skippedRules,
            explanations,
            processingTimeMs: processingTime
        };
    }

    _evaluateRule(rule, payload) {
        const result = {
            ruleCode: rule.ruleCode,
            matched: false,
            reason: ''
        };

        try {
            // Expression-based condition (priority)
            if (rule.conditionExpression && rule.conditionExpression.trim()) {
                const evaluator = new ExpressionEvaluator(payload);
                result.matched = evaluator.evaluate(rule.conditionExpression);
                result.reason = result.matched
                    ? `Expression matched: ${rule.conditionExpression}`
                    : `Expression not matched: ${rule.conditionExpression}`;
                if (evaluator.errors.length) result.errors = evaluator.errors;
                return result;
            }

            // Field-based condition
            if (rule.fieldName && rule.operator) {
                const fieldValue = this._getNestedValue(payload, rule.fieldName);
                const operatorFn = OPERATORS[rule.operator];

                if (operatorFn) {
                    result.matched = operatorFn(fieldValue, rule.value1, rule.value2);
                    result.reason = `Field ${rule.fieldName} ${rule.operator} ${rule.value1}: ${result.matched ? 'matched' : 'not matched'} (value: ${fieldValue})`;
                } else {
                    result.reason = `Unknown operator: ${rule.operator}`;
                }
                return result;
            }

            // No condition = always matches
            result.matched = true;
            result.reason = 'No condition (always matches)';

        } catch (error) {
            result.matched = false;
            result.reason = `Evaluation error: ${error.message}`;
            console.error(`${LOG} Rule ${rule.ruleCode} error:`, error);
        }

        return result;
    }

    _getNestedValue(obj, path) {
        const parts = path.split('.');
        let value = obj;
        for (const part of parts) {
            if (value === null || value === undefined) return undefined;
            value = value[part];
        }
        return value;
    }

    _isRuleValid(rule) {
        const now = new Date();
        if (rule.validFrom && new Date(rule.validFrom) > now) return false;
        if (rule.validTo && new Date(rule.validTo) < now) return false;
        return true;
    }

    getEvaluationLog() {
        return this.evaluationLog;
    }

    /**
     * Test a single rule against test data
     */
    testRule(rule, testPayload) {
        const result = this._evaluateRule(rule, testPayload);
        return {
            matched: result.matched,
            explanation: result.reason,
            error: result.errors ? result.errors.join(', ') : null
        };
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    RulesEngine,
    ExpressionEvaluator,
    OPERATORS,

    // Convenience function
    evaluate: (rules, payload, scenario) => {
        const engine = new RulesEngine();
        return engine.evaluate(rules, payload, scenario);
    },

    testRule: (rule, payload) => {
        const engine = new RulesEngine();
        return engine.testRule(rule, payload);
    }
};
