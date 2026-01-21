# Changelog

All notable changes to DecisionCore AI are documented in this file.

---

## [2.1.0] - 2026-01-17

### ✨ New Features

#### Internationalization (i18n)
- Full support for **8 languages**: English, German, French, Spanish, Italian, Dutch, Chinese, Japanese
- Language switcher in header with flag emojis
- All apps translated: Execute, Dashboard, Scenarios, Rules, History, Admin
- Launchpad navigation fully translated

#### User Experience
- **Notification System** - Bell icon in header with unread alerts
- **User Profile Dialog** - Click avatar for settings, shortcuts, logout
- **Keyboard Shortcuts** - Alt+1-7 for navigation, Alt+S/T/N for actions
- **Theme per Scenario** - Save dark/light preference per page

#### Enterprise Scenarios
- Expanded from 3 to **18 pre-configured scenarios**
- Covering all SAP modules: FI, MM, SD, HR, PM, QM, TM, EWM, GRC, CLM, FSCD, Concur
- Categorized dropdowns grouping scenarios by SAP module

#### UI Enhancements
- Enhanced History page with scenario/outcome filters
- Enhanced Admin page with health status and model column
- Improved Execute page with grouped template selection

### 🔧 Fixes
- Fixed CDS schema: removed invalid `collate nocase` syntax
- Fixed illustration loading across all apps

---

## [2.0.0] - 2026-01-15

### ✨ Initial Release

#### Core Features
- **Decision Service** - Main API for evaluating decisions
- **Rules Engine** - Dynamic, expression-based rule evaluation
- **AI Scoring** - Pluggable AI providers (OpenAI, Azure, Claude, Mock)
- **Scenario Management** - Create and configure decision scenarios
- **Rule Configuration** - Define business rules with conditions and actions

#### Applications
- Executive Dashboard with KPIs and analytics
- Scenario Management with templates
- Rules Management with test capabilities
- Decision Execution with simulation mode
- Audit History with full traceability
- Admin for AI provider management

#### AI Providers
- Mock Provider (heuristics, always available)
- OpenAI Provider (GPT-4, GPT-4o-mini)
- Azure OpenAI Provider
- Claude Provider (Anthropic)
- SAP AI Core Provider (stub)

#### Templates
- 8 pre-built decision templates
- Credit Approval, Fraud Detection, Procurement Risk
- Sales Discount, HR Decision, KYC Compliance
- Security Decision, Generic JSON

---

## [1.0.0] - 2025-12-01

### Initial Prototype
- Basic CAP setup
- Simple rule evaluation
- Mock AI scoring

---

*Created by Taha Khattari*
