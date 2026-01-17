/**
 * DecisionCore AI - Enterprise Data Model
 * Production-ready schema for Decision Intelligence Platform
 * 
 * @author Taha Khattari
 * @copyright 2026 Taha Khattari
 * @version 2.0.0
 */

namespace decisioncore;

using { cuid, managed, sap.common.CodeList } from '@sap/cds/common';

// ============================================================
// REFERENCE DATA (Code Lists)
// ============================================================

@cds.autoexpose
entity RuleOperators : CodeList {
    key code : String(20);
    symbol   : String(10);
    example  : String(100);
}

@cds.autoexpose
entity RuleActions : CodeList {
    key code : String(30);
    impact   : String(50);
}

@cds.autoexpose  
entity DecisionTypes : CodeList {
    key code : String(30);
    severity : Integer;
    color    : String(20);
}

@cds.autoexpose
entity SourceSystems : CodeList {
    key code : String(30);
    sapModule : String(20);
}

// ============================================================
// TEMPLATES
// ============================================================

entity DecisionTemplates : managed {
    key code        : String(50);
    name            : localized String(100);
    description     : localized String(500);
    category        : String(50);
    inputSchema     : LargeString; // JSON schema for UI generation
    defaultRules    : LargeString; // Preset rules
    icon            : String(50);
}

// ============================================================
// DECISION SCENARIOS
// ============================================================

entity DecisionScenarios : cuid, managed {
    name              : String(100) @mandatory;
    displayName       : localized String(200);
    description       : localized String(1000);
    
    // Lifecycle
    status            : String(20) default 'DRAFT';
    version           : Integer default 1;
    validFrom         : Date;
    validTo           : Date;
    
    // Scoring Configuration
    rulesWeight       : Integer default 60 @assert.range: [0, 100];
    aiWeight          : Integer default 40 @assert.range: [0, 100];
    approvalThreshold : Integer default 60 @assert.range: [0, 100];
    reviewThreshold   : Integer default 40 @assert.range: [0, 100];
    
    // AI Configuration
    aiProvider        : Association to AIProviders;
    aiModelId         : String(100);
    
    // Source System Context
    sourceSystem      : String(30);
    sapObjectType     : String(50);
    
    // Template Link & Dynamic Schema
    template          : Association to DecisionTemplates;
    inputSchema       : LargeString; // Defines the input fields for the simulation UI
    
    // Behavior
    allowSimulation   : Boolean default true;
    requireApproval   : Boolean default false;
    maxRetries        : Integer default 3;
    timeoutMs         : Integer default 30000;
    
    // Audit
    publishedAt       : Timestamp;
    publishedBy       : String(100);
    
    // Associations
    rules             : Composition of many DecisionRules on rules.scenario = $self;
    versions          : Association to many ScenarioVersions on versions.scenario = $self;
}

entity ScenarioVersions : cuid, managed {
    scenario          : Association to DecisionScenarios;
    version           : Integer;
    configSnapshot    : LargeString;
    changedFields     : String(500);
    changeReason      : String(500);
}

// ============================================================
// DECISION RULES
// ============================================================

entity DecisionRules : cuid, managed {
    scenario          : Association to DecisionScenarios;
    
    // Identification
    ruleCode          : String(50) @mandatory;
    ruleName          : localized String(200) @mandatory;
    description       : localized String(1000);
    
    // Lifecycle  
    status            : String(20) default 'DRAFT';
    version           : Integer default 1;
    validFrom         : Date;
    validTo           : Date;
    
    // Priority & Grouping
    priority          : Integer default 100;
    ruleGroup         : String(50);
    stopOnMatch       : Boolean default false;
    
    // Condition - Expression Based
    conditionExpression : LargeString;
    
    // Condition - Field Based
    fieldName         : String(100);
    operator          : String(20);
    value1            : String(500);
    value2            : String(500);
    
    // Outcome
    action            : String(30) @mandatory;
    scoreModifier     : Integer default 0;
    decisionOverride  : String(30);
    confidence        : Integer default 100 @assert.range: [0, 100];
    
    // Explainability
    explanation       : localized String(1000);
    businessRationale : localized String(2000);
    
    // Versioning
    versions          : Association to many RuleVersions on versions.rule = $self;
}

entity RuleVersions : cuid, managed {
    rule              : Association to DecisionRules;
    version           : Integer;
    configSnapshot    : LargeString;
    changedBy         : String(100);
    changeReason      : String(500);
}

// ============================================================
// AI PROVIDERS
// ============================================================

entity AIProviders : cuid, managed {
    code              : String(50) @mandatory;
    name              : localized String(200);
    description       : localized String(1000);
    providerType      : String(30);
    
    // Status
    status            : String(20) default 'DRAFT';
    isDefault         : Boolean default false;
    
    // Connection
    endpoint          : String(500);
    authType          : String(50);
    destinationName   : String(100);
    
    // Model Configuration
    model             : String(100);
    promptTemplate    : LargeString;
    maxTokens         : Integer default 500;
    temperature       : Decimal(3,2) default 0.3;
    
    // Request/Response Mapping
    requestTemplate   : LargeString;
    responseScorePath : String(200);
    responseConfidencePath : String(200);
    
    // Performance
    timeoutMs         : Integer default 5000;
    retryCount        : Integer default 3;
    cacheTTLSeconds   : Integer default 0;
    
    // Health
    lastHealthCheck   : Timestamp;
    healthStatus      : String(20);
}

// ============================================================  
// DECISION EXECUTION
// ============================================================

entity DecisionInputs : cuid, managed {
    scenario          : Association to DecisionScenarios;
    scenarioVersion   : Integer;
    
    // Request Context
    correlationId     : String(100) @mandatory;
    requestSource     : String(100);
    requestUser       : String(100);
    
    // SAP Context
    sapObjectType     : String(50);
    sapObjectId       : String(100);
    sapClient         : String(3);
    
    // Payload
    payload           : LargeString @mandatory;
    payloadHash       : String(64);
    
    // Execution Flags
    isSimulation      : Boolean default false;
    priority          : String(10) default 'NORMAL';
    
    // Result
    output            : Association to DecisionOutputs on output.input = $self;
    
    // Timing
    requestedAt       : Timestamp;
    completedAt       : Timestamp;
}

entity DecisionOutputs : cuid, managed {
    input             : Association to DecisionInputs;
    
    // Decision
    decision          : String(30) @mandatory;
    confidence        : Integer @assert.range: [0, 100];
    
    // Score Breakdown
    rulesScore        : Integer;
    aiScore           : Integer;
    finalScore        : Integer;
    
    // Explainability
    explanation       : LargeString;
    rulesFired        : LargeString;
    rulesSkipped      : LargeString;
    aiDetails         : LargeString;
    
    // Flags
    flags             : LargeString;
    blockedBy         : String(200);
    
    // Performance
    processingTimeMs  : Integer;
    rulesTimeMs       : Integer;
    aiTimeMs          : Integer;
    
    // Status
    status            : String(30) default 'COMPLETED';
    errorCode         : String(50);
    errorMessage      : String(1000);
    
    // Audit
    decidedAt         : Timestamp;
    overriddenBy      : String(100);
    overrideReason    : String(500);
}

// ============================================================
// AUDIT & LOGGING
// ============================================================

entity AuditLogs : cuid {
    timestamp         : Timestamp @cds.on.insert: $now;
    
    // Event
    eventType         : String(50) @mandatory;
    eventSubtype      : String(50);
    severity          : String(20) default 'INFO';
    
    // Context
    scenarioId        : UUID;
    scenarioName      : String(100);
    inputId           : UUID;
    outputId          : UUID;
    ruleId            : UUID;
    
    // User
    userId            : String(100);
    userRoles         : String(500);
    ipAddress         : String(50);
    userAgent         : String(500);
    
    // Details
    message           : String(1000);
    details           : LargeString;
    oldValue          : LargeString;
    newValue          : LargeString;
    
    // Performance
    durationMs        : Integer;
}

// ============================================================
// STATISTICS & ANALYTICS
// ============================================================

entity ScenarioStatistics : cuid {
    scenario          : Association to DecisionScenarios;
    periodStart       : Date;
    periodEnd         : Date;
    
    // Counts
    totalRequests     : Integer default 0;
    approvedCount     : Integer default 0;
    rejectedCount     : Integer default 0;
    reviewCount       : Integer default 0;
    errorCount        : Integer default 0;
    simulationCount   : Integer default 0;
    
    // Performance
    avgProcessingTimeMs : Decimal(10,2);
    maxProcessingTimeMs : Integer;
    minProcessingTimeMs : Integer;
    
    // Scores
    avgFinalScore     : Decimal(5,2);
    avgRulesScore     : Decimal(5,2);
    avgAIScore        : Decimal(5,2);
    avgConfidence     : Decimal(5,2);
    
    // Last Updated
    lastUpdated       : Timestamp;
}

// ============================================================
// VIEWS
// ============================================================

@readonly
entity DecisionHistory as select from DecisionInputs {
    *,
    output.decision,
    output.confidence,
    output.finalScore,
    output.processingTimeMs,
    output.status,
    scenario.name as scenarioName
};
