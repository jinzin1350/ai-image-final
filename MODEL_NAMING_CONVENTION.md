# Model Naming Convention

## Overview
This document defines the standard naming convention for model photos in the AI Fashion Photography system.

---

## Format
```
{ServiceType}_{Category}_{Style/Context}_{Number}_{Variant}
```

---

## Components

### 1. Service Type Prefix
- **CO** = Complete Outfit Photography
- **SR** = Scene Recreation Photography
- **BOTH** = Available for Both Services

### 2. Category
- **Woman** - Adult female models
- **Man** - Adult male models
- **Girl** - Young female models (children/teens)
- **Boy** - Young male models (children/teens)
- **Child** - Young children (gender-neutral)
- **Couple** - Two people together
- **Group** - Multiple people
- **Elderly** - Senior models
- **Teen** - Teenage models
- **PlusSize** - Plus-size models
- **Accessory** - Accessories-only (no human model)
- **Underwear** - Underwear/lingerie models

### 3. Style/Context (Optional but Recommended)
Describes the style, setting, or mood of the model photo

**Common Styles:**
- **Casual** - Everyday, relaxed poses
- **Formal** - Professional, elegant poses
- **Business** - Corporate/office settings
- **Sports** - Athletic/active poses
- **Studio** - Studio setting with plain background
- **Outdoor** - Outdoor/nature setting
- **Portrait** - Close-up portrait style
- **Wedding** - Wedding/special event
- **Neutral** - Generic/versatile pose
- **Fashion** - High-fashion editorial style

### 4. Number
Sequential numbering: `001`, `002`, `003`, etc.
- Start at 001 for each unique combination
- Increment for each new model in the same category/style

### 5. Variant
Letter suffix for different variations of the same model:
- **A** - Primary/main photo
- **B** - Alternative angle/pose
- **C** - Another variation
- etc.

---

## Examples

### Complete Outfit Service
```
CO_Woman_Casual_001_A
CO_Woman_Casual_001_B
CO_Woman_Formal_002_A
CO_Man_Business_001_A
CO_Man_Sports_001_A
CO_Girl_School_001_A
CO_Boy_Sports_001_A
CO_PlusSize_Woman_Casual_001_A
CO_Teen_Casual_001_A
```

### Scene Recreation Service
```
SR_Woman_Studio_001_A
SR_Woman_Outdoor_002_A
SR_Man_Portrait_001_A
SR_Couple_Wedding_001_A
SR_Group_Fashion_001_A
```

### Both Services
```
BOTH_Woman_Neutral_001_A
BOTH_Man_Neutral_001_A
BOTH_Girl_Neutral_001_A
BOTH_Boy_Neutral_001_A
```

---

## Usage Guidelines

### When to Use "BOTH"
Use `BOTH` prefix for models that are:
- Versatile and work well in any service
- Generic poses with neutral backgrounds
- High-quality models you want available everywhere

### When to Use Specific Service Types
Use `CO` or `SR` when the model is specifically designed for:
- **Complete Outfit (CO)**: Full-body shots, fashion poses, showing outfit details
- **Scene Recreation (SR)**: Studio portraits, artistic poses, specific scene recreation needs

### Numbering Strategy
- Keep numbers sequential within each category/style combination
- Don't skip numbers (use 001, 002, 003... not 001, 005, 010)
- When deleting a model, don't reuse that number immediately

### Variants Strategy
- Use variants (A, B, C) for the same person in different poses/angles
- Keep variants consistent in style and lighting
- Maximum 3-4 variants per model (A-D)

---

## Database Fields

When saving models, ensure these fields match the naming convention:

```javascript
{
  name: "CO_Woman_Casual_001_A",
  category: "woman",
  service_type: "complete-outfit",
  visibility: "public" or "private",
  description: "Optional description of the model"
}
```

---

## Quick Reference Table

| Prefix | Service | Example |
|--------|---------|---------|
| CO | Complete Outfit | CO_Woman_Formal_001_A |
| SR | Scene Recreation | SR_Man_Studio_001_A |
| BOTH | Both Services | BOTH_Woman_Neutral_001_A |

| Category | Code | Example |
|----------|------|---------|
| Woman | Woman | CO_Woman_Casual_001_A |
| Man | Man | CO_Man_Business_001_A |
| Girl | Girl | CO_Girl_School_001_A |
| Boy | Boy | CO_Boy_Sports_001_A |
| Plus Size | PlusSize | CO_PlusSize_Woman_001_A |

---

## Tips for Consistency

1. **Always use underscores** (_) as separators, not dashes or spaces
2. **Use PascalCase** for multi-word components (PlusSize, not plus-size)
3. **Pad numbers** with leading zeros (001 not 1)
4. **Keep style names short** (max 15 characters)
5. **Document special cases** if you deviate from the convention

---

## Version History

- v1.0 (2025-01-18) - Initial naming convention established
