# Configurable Plan Pricing - Configuration Guide

## Overview

Subscription plan pricing and limits are now fully configurable via environment variables. This allows you to adjust pricing without code changes.

## Environment Variables

All plan pricing and limits can be configured in your `.env` file:

### Individual Plan
```bash
INDIVIDUAL_PLAN_MONTHLY_PRICE=49
INDIVIDUAL_PLAN_YEARLY_PRICE=490
INDIVIDUAL_PLAN_MAX_PATIENTS=50
INDIVIDUAL_PLAN_MAX_USERS=1
INDIVIDUAL_PLAN_MAX_STORAGE_MB=512
INDIVIDUAL_PLAN_MAX_API_CALLS=5000
```

### Basic Plan
```bash
BASIC_PLAN_MONTHLY_PRICE=99
BASIC_PLAN_YEARLY_PRICE=990
BASIC_PLAN_MAX_PATIENTS=100
BASIC_PLAN_MAX_USERS=5
BASIC_PLAN_MAX_STORAGE_MB=1024
BASIC_PLAN_MAX_API_CALLS=10000
```

### Standard Plan
```bash
STANDARD_PLAN_MONTHLY_PRICE=299
STANDARD_PLAN_YEARLY_PRICE=2990
STANDARD_PLAN_MAX_PATIENTS=500
STANDARD_PLAN_MAX_USERS=20
STANDARD_PLAN_MAX_STORAGE_MB=5120
STANDARD_PLAN_MAX_API_CALLS=50000
```

### Pro Plan
```bash
PRO_PLAN_MONTHLY_PRICE=599
PRO_PLAN_YEARLY_PRICE=5990
PRO_PLAN_MAX_PATIENTS=-1
PRO_PLAN_MAX_USERS=-1
PRO_PLAN_MAX_STORAGE_MB=20480
PRO_PLAN_MAX_API_CALLS=200000
```

## Usage

1. Copy variables from `.env.example`
2. Adjust values in your `.env` file
3. Restart the application
4. Verify via `/api/billing/plans` endpoint

## Default Values

If environment variables are not set, defaults from `plan.config.ts` are used.

## Examples

**Promotional Pricing:**
```bash
INDIVIDUAL_PLAN_MONTHLY_PRICE=39
```

**Testing:**
```bash
INDIVIDUAL_PLAN_MAX_PATIENTS=5
```

**Note**: Changes require application restart. Existing subscriptions keep original pricing.
