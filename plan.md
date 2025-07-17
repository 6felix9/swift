# Swift AI Generalization Plan

Transform Swift AI from a financial-advisor–specific trainer into a generalized role-playing training platform that can support multiple domains (healthcare, sales, customer service, education, etc.).

---

## Phase 1 – Data-Structure Generalization (1-2 days)

### 1.1 Create Domain-Agnostic Interfaces
- [x] Replace hard-coded `"Financial Advisor"` with configurable `trainerRole` in `ScenarioDefinition`
- [x] Add `domain` field to `ScenarioDefinition` & `Persona`
- [x] Define `TrainingDomain` type enumerating supported domains

### 1.2 Refactor Core Types
- [ ] Make `Message.role` configurable (e.g. `"trainer" | "trainee" | "system"`)
- [ ] Add `domain` context to evaluation types
- [ ] Create generic, extensible evaluation-criteria structure

### 1.3 Frontend Domain Selection ✅ **COMPLETED**
- [x] Add domain selection tabs to scenario selection UI
- [x] Implement domain filtering for scenarios  
- [x] Create placeholder scenarios for healthcare and customer service domains
- [x] Maintain consistent UI styling with existing design patterns
- [x] Update main page component to handle domain state management

---

## Phase 2 – Content Template System (2-3 days)

### 2.1 Template Engine
- [ ] Implement prompt-template engine with variable substitution
- [ ] Build evaluation-criteria templates per domain
- [ ] Design difficulty-profile templates adaptable to any field

### 2.2 Domain Configuration System
- [ ] Create domain definition files (financial, healthcare, sales, etc.)
- [ ] Implement domain-specific prompt loading
- [ ] Add persona-template support for each industry

---

## Phase 3 – UI & Configuration Updates (1-2 days)

### 3.1 Dynamic UI Components
- [ ] Make role labels & copy configurable throughout UI
- [ ] Add domain-selection interface to onboarding flow
- [ ] Update evaluation display to accommodate domain-specific information

### 3.2 Admin / Configuration Interface
- [ ] Build domain-management admin screen
- [ ] Implement scenario-creation wizard
- [ ] Create persona-generation/management tools

---

## Phase 4 – Sample Domain Implementations (1-2 days)

### 4.1 Healthcare Training Domain
- [ ] Add sample healthcare scenarios (patient consultations, emergencies)
- [ ] Create healthcare personas (patients with various conditions)
- [ ] Define healthcare-specific evaluation criteria

### 4.2 Sales Training Domain
- [ ] Add sales scenarios (cold calls, objection handling, closing)
- [ ] Create customer personas across industries
- [ ] Define sales-specific evaluation criteria

---

## Phase 5 – Documentation & Migration (1 day)

### 5.1 Migration & Docs
- [ ] Write migration script for existing financial-advisor content → new schema
- [ ] Document domain-creation workflow for devs & content creators
- [ ] Provide example domain, scenario, persona, and evaluation configs

---

## Key Benefits
- Maintain existing functionality for financial-advisor training
- Rapid deployment to new industries
- Scalable, configuration-driven architecture
- Maximizes current technical investment

---

## Technical Approach Highlights
- Backwards-compatible changes
- Configuration-over-code philosophy
- Template-based content & prompt system
- Domain-specific prompt-engineering strategy
