/**
 * DecisionCore AI - Enterprise Service Definitions
 * Production-ready OData V4 services with comprehensive annotations
 * 
 * @author Taha Khattari
 * @copyright 2026 Taha Khattari
 * @version 2.0.0
 */

using { decisioncore as db } from '../db/schema';

// ============================================================
// MAIN DECISION SERVICE (Business Users)
// ============================================================

@path: '/api/decision'
// Auth configured via package.json - "mocked" for dev, "xsuaa" for production
@impl: './decision-service.js'
service DecisionService {

    // Core Entities with Draft Support
    @odata.draft.enabled
    entity Scenarios as projection on db.DecisionScenarios {
        *,
        rules : redirected to Rules
    } excluding { versions } actions {
        @requires: 'DecisionAdmin'
        action publish() returns Scenarios;
        
        @requires: 'DecisionAdmin'  
        action archive() returns Scenarios;
        
        @requires: 'DecisionBusiness'
        action duplicate(newName: String) returns Scenarios;
        
        @requires: 'DecisionBusiness'
        action createNewVersion() returns Scenarios;
    };
    
    entity Rules as projection on db.DecisionRules {
        *,
        scenario : redirected to Scenarios
    } excluding { versions } actions {
        @requires: 'DecisionBusiness'
        action testRule(testPayload: LargeString) returns {
            matched: Boolean;
            explanation: String;
            error: String;
        };
        
        @requires: 'DecisionAdmin'
        action publish() returns Rules;
    };
    
    @readonly
    entity Inputs as projection on db.DecisionInputs {
        *,
        scenario : redirected to Scenarios,
        output : redirected to Outputs
    };
    
    @readonly  
    entity Outputs as projection on db.DecisionOutputs {
        *,
        input : redirected to Inputs
    };
    
    @readonly
    entity DecisionHistory as projection on db.DecisionHistory;
    
    // Templates
    @readonly entity Templates as projection on db.ScenarioTemplates;
    
    // Reference Data
    @readonly entity RuleOperators as projection on db.RuleOperators;
    @readonly entity RuleActions as projection on db.RuleActions;
    @readonly entity DecisionTypes as projection on db.DecisionTypes;
    @readonly entity SourceSystems as projection on db.SourceSystems;
    
    // Create from Template
    action createFromTemplate(
        templateCode : String(50),
        newName      : String(100),
        displayName  : String(200)
    ) returns Scenarios;

    // --------------------------------------------------------
    // ANALYTICS & DASHBOARD
    // --------------------------------------------------------
    
    function getDashboardStats() returns {
        totalDecisions    : Integer;
        todayDecisions    : Integer;
        approvalRate      : Decimal;
        rejectionRate     : Decimal;
        reviewRate        : Decimal;
        avgConfidence     : Decimal;
        avgProcessingMs   : Decimal;
        rulesContribution : Decimal;
        aiContribution    : Decimal;
    };
    
    function getTopRules(scenarioName: String, limit: Integer) returns array of {
        ruleCode      : String;
        ruleName      : String;
        triggerCount  : Integer;
        avgImpact     : Decimal;
    };
    
    function getDecisionTrend(days: Integer) returns array of {
        date          : Date;
        approved      : Integer;
        rejected      : Integer;
        review        : Integer;
    };

    // --------------------------------------------------------
    // DECISION EXECUTION ACTIONS
    // --------------------------------------------------------
    
    @requires: 'DecisionBusiness'
    action EvaluateDecision(
        scenarioName  : String(100),
        payload       : LargeString,
        correlationId : String(100),
        isSimulation  : Boolean default false,
        sapObjectType : String(50),
        sapObjectId   : String(100)
    ) returns {
        ID            : UUID;
        decision      : String;
        confidence    : Integer;
        rulesScore    : Integer;
        aiScore       : Integer;
        finalScore    : Integer;
        explanation   : LargeString;
        rulesFired    : LargeString;
        flags         : LargeString;
        processingTimeMs : Integer;
        status        : String;
    };
    
    @requires: 'DecisionBusiness'
    action SimulateDecision(
        scenarioName : String(100),
        payload      : LargeString
    ) returns {
        decision      : String;
        confidence    : Integer;
        rulesScore    : Integer;
        aiScore       : Integer;
        finalScore    : Integer;
        explanation   : LargeString;
        rulesFired    : LargeString;
        rulesSkipped  : LargeString;
    };
    
    @requires: 'DecisionBusiness'
    action EvaluateBatch(
        scenarioName : String(100),
        payloads     : array of LargeString
    ) returns array of {
        correlationId : String;
        decision      : String;
        confidence    : Integer;
        finalScore    : Integer;
        status        : String;
    };

    // --------------------------------------------------------
    // ANALYTICS & MONITORING
    // --------------------------------------------------------
    
    @requires: 'DecisionViewer'
    function getScenarioStatistics(scenarioName: String) returns {
        totalDecisions  : Integer;
        approvedCount   : Integer;
        rejectedCount   : Integer;
        reviewCount     : Integer;
        errorCount      : Integer;
        avgConfidence   : Decimal;
        avgProcessingTimeMs : Decimal;
        successRate     : Decimal;
    };
    
    @requires: 'DecisionViewer'
    function getRulePerformance(scenarioName: String) returns array of {
        ruleCode        : String;
        ruleName        : String;
        triggerCount    : Integer;
        triggerRate     : Decimal;
        avgImpact       : Decimal;
    };
    
    function healthCheck() returns {
        status          : String;
        version         : String;
        timestamp       : Timestamp;
        dbStatus        : String;
        aiProviderStatus: String;
        activeScenarios : Integer;
    };
}

// ============================================================
// ADMIN SERVICE (Administrators Only)
// ============================================================

@path: '/api/admin'
// @requires: 'DecisionAdmin' - enabled in production via XSUAA
@impl: './admin-service.js'
service DecisionAdminService {

    entity Scenarios as projection on db.DecisionScenarios;
    entity Rules as projection on db.DecisionRules;
    entity ScenarioVersions as projection on db.ScenarioVersions;
    entity RuleVersions as projection on db.RuleVersions;
    
    @odata.draft.enabled
    entity AIProviders as projection on db.AIProviders actions {
        action testConnection() returns {
            success: Boolean;
            latencyMs: Integer;
            message: String;
        };
        
        action setAsDefault() returns AIProviders;
    };
    
    @readonly
    entity AuditLogs as projection on db.AuditLogs;
    
    @readonly
    entity Statistics as projection on db.ScenarioStatistics;

    // --------------------------------------------------------
    // ADMIN ACTIONS
    // --------------------------------------------------------
    
    action exportScenario(scenarioId: UUID) returns LargeString;
    
    action importScenario(configJson: LargeString, overwrite: Boolean) returns {
        success: Boolean;
        scenarioId: UUID;
        message: String;
    };
    
    action purgeAuditLogs(olderThanDays: Integer) returns {
        deletedCount: Integer;
    };
    
    action refreshStatistics(scenarioName: String) returns {
        success: Boolean;
        message: String;
    };
    
    action validateScenario(scenarioId: UUID) returns {
        valid: Boolean;
        errors: array of String;
        warnings: array of String;
    };
}

// ============================================================
// PUBLIC API (External Systems)
// ============================================================

@path: '/api/v1'
// @requires: 'authenticated-user' - enabled in production
@impl: './api-service.js'
service DecisionAPIService {

    action evaluate(
        scenario      : String(100),
        data          : LargeString,
        correlation   : String(100),
        simulate      : Boolean default false
    ) returns {
        requestId     : UUID;
        decision      : String;
        score         : Integer;
        confidence    : Integer;
        explanation   : String;
        processingMs  : Integer;
    };
    
    function status(requestId: UUID) returns {
        decision      : String;
        score         : Integer;
        confidence    : Integer;
        explanation   : String;
        completedAt   : Timestamp;
    };
    
    function scenarios() returns array of {
        name          : String;
        displayName   : String;
        description   : String;
        status        : String;
    };
    
    function health() returns {
        status        : String;
        version       : String;
    };
}
