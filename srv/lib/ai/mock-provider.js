/**
 * DecisionCore AI - Mock Provider
 * Sophisticated heuristic-based scoring for development and fallback
 */

'use strict';

const AIProvider = require('./ai-provider');

class MockProvider extends AIProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'Mock AI Provider';
        this.type = 'MOCK';
    }

    async score(payload, context = {}) {
        const startTime = Date.now();

        // Simulate network latency (50-150ms)
        await this._delay(50 + Math.random() * 100);

        const result = this._calculateHeuristicScore(payload, context);

        return {
            score: result.score,
            confidence: result.confidence,
            explanation: result.explanation,
            factors: result.factors,
            recommendation: result.recommendation,
            provider: this.type,
            model: 'mock-heuristic-v2.0',
            processingTimeMs: Date.now() - startTime,
            details: {
                algorithm: 'weighted-heuristic',
                version: '2.0.0',
                timestamp: new Date().toISOString()
            }
        };
    }

    _calculateHeuristicScore(payload, context) {
        let score = 50;
        let confidence = 75;
        const factors = [];

        // === AMOUNT SCORING ===
        const amount = parseFloat(payload.amount || payload.transactionAmount || payload.dealSize || payload.contractValue || 0);
        if (amount > 0) {
            if (amount <= 1000) {
                score += 20;
                factors.push({ factor: 'Low amount', impact: +20, reason: `Amount ${amount} is low risk` });
            } else if (amount <= 10000) {
                score += 10;
                factors.push({ factor: 'Medium amount', impact: +10, reason: `Amount ${amount} is moderate` });
            } else if (amount <= 50000) {
                score -= 5;
                factors.push({ factor: 'High amount', impact: -5, reason: `Amount ${amount} requires attention` });
            } else if (amount <= 100000) {
                score -= 15;
                factors.push({ factor: 'Very high amount', impact: -15, reason: `Amount ${amount} is significant` });
            } else {
                score -= 25;
                factors.push({ factor: 'Extreme amount', impact: -25, reason: `Amount ${amount} requires review` });
            }
        }

        // === RISK LEVEL SCORING ===
        const risk = parseInt(payload.riskLevel || payload.riskScore || payload.vendorScore || 5);
        if (risk <= 2) {
            score += 25;
            factors.push({ factor: 'Low risk profile', impact: +25, reason: `Risk level ${risk}/10` });
        } else if (risk <= 4) {
            score += 15;
            factors.push({ factor: 'Moderate risk', impact: +15, reason: `Risk level ${risk}/10` });
        } else if (risk <= 6) {
            score -= 10;
            factors.push({ factor: 'Elevated risk', impact: -10, reason: `Risk level ${risk}/10` });
        } else if (risk <= 8) {
            score -= 25;
            factors.push({ factor: 'High risk', impact: -25, reason: `Risk level ${risk}/10` });
        } else {
            score -= 40;
            factors.push({ factor: 'Critical risk', impact: -40, reason: `Risk level ${risk}/10` });
        }

        // === CUSTOMER/ENTITY TYPE ===
        const entityType = String(payload.customerType || payload.customerTier || payload.vendorType || '').toUpperCase();
        const typeScores = {
            'VIP': { score: 25, conf: 10, reason: 'VIP customer - priority treatment' },
            'PLATINUM': { score: 20, conf: 10, reason: 'Platinum tier customer' },
            'PREMIUM': { score: 15, conf: 5, reason: 'Premium customer' },
            'GOLD': { score: 15, conf: 5, reason: 'Gold tier customer' },
            'SILVER': { score: 10, conf: 0, reason: 'Silver tier customer' },
            'STANDARD': { score: 5, conf: 0, reason: 'Standard customer' },
            'NEW': { score: -10, conf: -15, reason: 'New customer - limited history' },
            'FLAGGED': { score: -30, conf: 0, reason: 'Flagged for review' },
            'BLOCKED': { score: -50, conf: 0, reason: 'Blocked entity' }
        };
        if (typeScores[entityType]) {
            const t = typeScores[entityType];
            score += t.score;
            confidence += t.conf;
            factors.push({ factor: `Entity type: ${entityType}`, impact: t.score, reason: t.reason });
        }

        // === HISTORY SCORING ===
        if (payload.previousApprovals !== undefined || payload.historyScore !== undefined) {
            const approvals = parseInt(payload.previousApprovals || payload.historyScore / 10 || 0);
            if (approvals >= 10) {
                score += 15;
                factors.push({ factor: 'Strong approval history', impact: +15, reason: `${approvals} prior approvals` });
            } else if (approvals >= 5) {
                score += 10;
                factors.push({ factor: 'Good history', impact: +10, reason: `${approvals} prior approvals` });
            } else if (approvals >= 1) {
                score += 5;
                factors.push({ factor: 'Some history', impact: +5, reason: `${approvals} prior approvals` });
            }
        }

        if (payload.previousRejections !== undefined) {
            const rejections = parseInt(payload.previousRejections);
            if (rejections >= 5) {
                score -= 30;
                factors.push({ factor: 'Many rejections', impact: -30, reason: `${rejections} prior rejections` });
            } else if (rejections >= 2) {
                score -= 15;
                factors.push({ factor: 'Some rejections', impact: -15, reason: `${rejections} prior rejections` });
            } else if (rejections >= 1) {
                score -= 5;
                factors.push({ factor: 'Prior rejection', impact: -5, reason: `${rejections} prior rejection` });
            }
        }

        // === GEOGRAPHIC RISK ===
        const country = String(payload.country || payload.riskCountry || '').toUpperCase();
        const lowRiskCountries = ['DE', 'CH', 'AT', 'NL', 'BE', 'LU', 'FR', 'UK', 'GB', 'US', 'CA', 'AU', 'NZ', 'JP', 'SG', 'KR'];
        const highRiskCountries = ['AF', 'IR', 'KP', 'SY', 'YE', 'VE', 'CU', 'RU', 'BY'];

        if (lowRiskCountries.includes(country)) {
            score += 5;
            factors.push({ factor: 'Low-risk jurisdiction', impact: +5, reason: `Country ${country} is low risk` });
        } else if (highRiskCountries.includes(country)) {
            score -= 25;
            factors.push({ factor: 'High-risk jurisdiction', impact: -25, reason: `Country ${country} is high risk` });
        }

        // === VELOCITY/FREQUENCY ===
        const velocity = parseInt(payload.transactionsLast24h || payload.velocity || payload.requestsToday || 0);
        if (velocity > 20) {
            score -= 25;
            factors.push({ factor: 'Very high velocity', impact: -25, reason: `${velocity} transactions in 24h` });
        } else if (velocity > 10) {
            score -= 15;
            factors.push({ factor: 'High velocity', impact: -15, reason: `${velocity} transactions in 24h` });
        } else if (velocity > 5) {
            score -= 5;
            factors.push({ factor: 'Moderate velocity', impact: -5, reason: `${velocity} transactions in 24h` });
        }

        // === DOCUMENT/VERIFICATION STATUS ===
        if (payload.documentsVerified === true || payload.kycComplete === true) {
            score += 10;
            confidence += 5;
            factors.push({ factor: 'Documents verified', impact: +10, reason: 'All documents validated' });
        } else if (payload.documentsVerified === false || payload.kycComplete === false) {
            score -= 15;
            confidence -= 10;
            factors.push({ factor: 'Documents pending', impact: -15, reason: 'Documents not verified' });
        }

        // === BLACKLIST/SANCTION CHECK ===
        if (payload.blacklistHit === true || payload.sanctionMatch === true) {
            score -= 50;
            factors.push({ factor: 'BLACKLIST/SANCTION MATCH', impact: -50, reason: 'Critical compliance issue' });
        }

        // === DEVICE/SECURITY TRUST ===
        if (payload.deviceTrust !== undefined || payload.deviceRisk !== undefined) {
            const trust = parseInt(payload.deviceTrust || (100 - payload.deviceRisk) || 50);
            if (trust >= 80) {
                score += 10;
                factors.push({ factor: 'Trusted device', impact: +10, reason: `Device trust: ${trust}%` });
            } else if (trust <= 30) {
                score -= 20;
                factors.push({ factor: 'Untrusted device', impact: -20, reason: `Device trust: ${trust}%` });
            }
        }

        // === PERFORMANCE METRICS (HR) ===
        if (payload.performanceScore !== undefined) {
            const perf = parseInt(payload.performanceScore);
            if (perf >= 90) {
                score += 15;
                factors.push({ factor: 'Excellent performance', impact: +15, reason: `Score: ${perf}%` });
            } else if (perf >= 70) {
                score += 5;
                factors.push({ factor: 'Good performance', impact: +5, reason: `Score: ${perf}%` });
            } else if (perf < 50) {
                score -= 15;
                factors.push({ factor: 'Poor performance', impact: -15, reason: `Score: ${perf}%` });
            }
        }

        // === DISCOUNT (Sales) ===
        if (payload.discountPercent !== undefined || payload.requestedDiscount !== undefined) {
            const discount = parseFloat(payload.discountPercent || payload.requestedDiscount || 0);
            if (discount <= 5) {
                score += 10;
                factors.push({ factor: 'Small discount', impact: +10, reason: `${discount}% is within policy` });
            } else if (discount <= 15) {
                score += 5;
                factors.push({ factor: 'Moderate discount', impact: +5, reason: `${discount}% needs review` });
            } else if (discount <= 30) {
                score -= 10;
                factors.push({ factor: 'Large discount', impact: -10, reason: `${discount}% exceeds normal` });
            } else {
                score -= 25;
                factors.push({ factor: 'Extreme discount', impact: -25, reason: `${discount}% requires approval` });
            }
        }

        // === ANOMALY SCORE (Security) ===
        if (payload.anomalyScore !== undefined) {
            const anomaly = parseFloat(payload.anomalyScore);
            if (anomaly >= 80) {
                score -= 35;
                factors.push({ factor: 'High anomaly detected', impact: -35, reason: `Anomaly score: ${anomaly}` });
            } else if (anomaly >= 50) {
                score -= 15;
                factors.push({ factor: 'Moderate anomaly', impact: -15, reason: `Anomaly score: ${anomaly}` });
            }
        }

        // Clamp values
        score = Math.max(0, Math.min(100, score));
        confidence = Math.max(50, Math.min(100, confidence));

        // Determine recommendation
        let recommendation;
        if (score >= 60) recommendation = 'APPROVE';
        else if (score >= 40) recommendation = 'REVIEW';
        else recommendation = 'REJECT';

        // Build explanation
        const topFactors = factors.slice(0, 3).map(f => f.factor).join(', ');
        const explanation = `Score ${score}/100 based on: ${topFactors || 'baseline assessment'}`;

        return { score, confidence, factors, recommendation, explanation };
    }

    async healthCheck() {
        return {
            status: 'healthy',
            provider: this.name,
            type: this.type,
            latencyMs: 0
        };
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MockProvider;
