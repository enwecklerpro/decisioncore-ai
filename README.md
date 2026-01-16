# DecisionCore AI

<p align="center">
  <strong>🧠 DecisionCore AI</strong><br/>
  <em>Explainable Decision Intelligence for SAP</em><br/><br/>
  <strong>Created by Taha Khattari</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue" alt="Version"/>
  <img src="https://img.shields.io/badge/SAP-CAP-orange" alt="SAP CAP"/>
  <img src="https://img.shields.io/badge/AI-OpenAI%20%7C%20Azure%20%7C%20Claude-green" alt="AI Providers"/>
  <img src="https://img.shields.io/badge/Author-Taha%20Khattari-purple" alt="Author"/>
</p>

---

## 🎯 What is DecisionCore AI?

**DecisionCore AI** is an enterprise-grade, production-ready decision intelligence platform built on SAP BTP. It combines **configurable business rules** with **pluggable AI providers** to deliver automated, explainable decisions for any SAP business scenario.

### ✨ Key Differentiators

| Feature | Description |
|---------|-------------|
| **100% Data-Driven** | No hardcoded business logic - everything is configurable |
| **Pluggable AI** | OpenAI, Azure OpenAI, Claude, SAP AI Core + Mock for testing |
| **Full Explainability** | Every decision includes detailed score breakdown |
| **8 Enterprise Templates** | Pre-built for Credit, Fraud, Procurement, Sales, HR, Compliance, Security |
| **SAP Native** | Built on CAP, ready for S/4HANA, SuccessFactors, Ariba integration |

---

## 🚀 Quick Start

```bash
# Clone and install
cd zsmart_ai
npm install

# Start server
npm run start

# Access at http://localhost:4004
```

### Test Users (Development)
| User | Password | Roles |
|------|----------|-------|
| admin | admin | Full access |
| business | business | Execute & manage |
| viewer | viewer | Read-only |

---

## 📱 Applications

| App | URL | Description |
|-----|-----|-------------|
| **Dashboard** | `/dashboard/webapp/` | Executive analytics with KPIs and charts |
| **Scenarios** | `/scenarios/webapp/` | Create and manage decision scenarios |
| **Rules** | `/rules/webapp/` | Configure business rules |
| **Execute** | `/execute/webapp/` | Test decisions with simulation |
| **History** | `/history/webapp/` | Audit trail and decision history |
| **Admin** | `/admin/webapp/` | AI provider management |

---

## 🧩 Decision Templates

Start from pre-built templates instead of scratch:

| Template | Use Case | Default AI Weight |
|----------|----------|-------------------|
| **Credit Approval** | Banks, Finance | 40% |
| **Fraud Detection** | Payments, E-Commerce | 70% |
| **Procurement Risk** | SAP MM, Vendor mgmt | 50% |
| **Pricing/Discount** | Sales | 30% |
| **HR Decision** | SuccessFactors | 20% |
| **Compliance/KYC** | Regulated industries | 60% |
| **Security Decision** | IAM, Access mgmt | 65% |
| **Generic JSON** | Custom scenarios | 40% |

---

## 🤖 AI Providers

### Architecture

```
Decision Service
       │
       └── AI Provider Interface
              │
              ├── MockProvider      (heuristics, always available)
              ├── OpenAIProvider    (GPT-4o, GPT-4o-mini)
              ├── AzureOpenAIProvider (Azure-hosted GPT)
              ├── ClaudeProvider    (Anthropic Claude)
              └── SAPAICoreProvider (BTP integration - stub)
```

### Configuration

1. **Via Environment Variables**:
```bash
# .env file
OPENAI_API_KEY=sk-...
AZURE_OPENAI_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
```

2. **Via Database (Business-controlled)**:
```json
// AIProviders entity
{
  "code": "OPENAI_PROD",
  "providerType": "OPENAI",
  "model": "gpt-4o-mini",
  "status": "ACTIVE",
  "isDefault": true
}
```

### Automatic Fallback

If any provider fails → automatic fallback to Mock:
```javascript
// Transparent to your code
const result = await aiScoring.score('OPENAI', config, payload, context);
// If OpenAI fails, automatically uses Mock with fallback: true flag
```

---

## 📊 API Reference

### Evaluate Decision
```http
POST /api/decision/EvaluateDecision
Authorization: Basic YWRtaW46YWRtaW4=

{
  "scenarioName": "CREDIT_APPROVAL",
  "payload": "{\"amount\": 25000, \"riskLevel\": 3}",
  "isSimulation": false
}
```

### Response
```json
{
  "decision": "APPROVED",
  "confidence": 82,
  "finalScore": 71,
  "rulesScore": 68,
  "aiScore": 75,
  "explanation": "Score 71/100 based on: Low risk profile, Good history...",
  "processingTimeMs": 145
}
```

### Dashboard Stats
```http
GET /api/decision/getDashboardStats()
```

### Top Rules
```http
GET /api/decision/getTopRules(scenarioName='CREDIT_APPROVAL',limit=10)
```

---

## 🔧 Rule Configuration

### Expression-Based
```javascript
amount > 10000 && riskLevel < 5
customerType == 'VIP' || amount <= 1000
country IN ('DE', 'FR', 'US')
```

### Field-Based
| Field | Operator | Value1 | Action | Score |
|-------|----------|--------|--------|-------|
| amount | GT | 50000 | FLAG | -10 |
| riskLevel | GTE | 8 | BLOCK | - |
| customerType | EQ | VIP | ADD_SCORE | +20 |

### Actions
- `ADD_SCORE` - Modify score
- `SET_DECISION` - Force outcome
- `BLOCK` - Immediate reject
- `FLAG` - Add warning
- `REQUIRE_REVIEW` - Manual review

---

## 🗺️ Roadmap

| Version | Features | Status |
|---------|----------|--------|
| **v2.0** | Rules + AI, Templates, Dashboard | ✅ Current |
| **v2.1** | SAP AI Core full integration | 🔲 Planned |
| **v2.5** | ML training from decision history | 🔲 Planned |
| **v3.0** | AutoML, automatic rule discovery | 🔲 Future |

---

## 🏗️ Project Structure

```
decisioncore-ai/
├── db/
│   ├── schema.cds          # Core data model
│   ├── templates.cds       # Template entities
│   └── data/               # Sample data JSON
├── srv/
│   ├── services.cds        # Service definitions
│   ├── annotations.cds     # Fiori UI annotations
│   ├── decision-service.js # Main service handler
│   ├── admin-service.js    # Admin operations
│   └── lib/
│       ├── rules-engine.js # Dynamic rule evaluation
│       └── ai/
│           ├── index.js            # Provider factory
│           ├── ai-provider.js      # Base interface
│           ├── mock-provider.js    # Heuristic scoring
│           ├── openai-provider.js  # OpenAI GPT
│           ├── azure-openai-provider.js
│           ├── claude-provider.js  # Anthropic
│           └── sap-ai-core-provider.js
├── app/
│   ├── dashboard/          # Executive analytics
│   ├── scenarios/          # Scenario management
│   ├── rules/              # Rule configuration
│   ├── execute/            # Decision testing
│   ├── history/            # Audit trail
│   └── admin/              # Provider admin
├── .env.example            # Environment template
├── package.json
└── README.md
```

---

## 🔐 Security

### Role Collections
| Role | Permissions |
|------|-------------|
| `DecisionAdmin` | Full access |
| `DecisionBusiness` | Execute, manage rules |
| `DecisionViewer` | View only |

### Production Deployment
1. Configure XSUAA on BTP
2. Set environment variables in BTP
3. Use BTP Destination Service for AI providers

---

## �‍💻 Author

**Taha Khattari**

- Architect & Developer of DecisionCore AI
- SAP BTP & AI Integration Expert
- GitHub: [github.com/enwecklerpro](https://github.com/enwecklerpro)

---

## 📄 License

© 2026 Taha Khattari. All Rights Reserved.

---

<p align="center">
  <strong>DecisionCore AI</strong><br/>
  <em>Explainable Decision Intelligence for SAP</em><br/><br/>
  Created by <strong>Taha Khattari</strong><br/>
  Built with ❤️ on SAP CAP
</p>
