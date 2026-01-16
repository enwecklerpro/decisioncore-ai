/**
 * DecisionCore AI - Data Loading Annotations
 * Auto-import CSV/JSON data for development
 */

using from './schema';
using from './templates';

// Enable CSV/JSON data loading
annotate decisioncore.DecisionScenarios with @cds.autoexpose;
annotate decisioncore.DecisionRules with @cds.autoexpose;
annotate decisioncore.AIProviders with @cds.autoexpose;
annotate decisioncore.ScenarioTemplates with @cds.autoexpose;
