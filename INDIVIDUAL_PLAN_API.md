# Individual Practice Plan - API Documentation

## Overview

The Individual Practice plan is designed for solo practitioners who want to manage patients, schedule appointments, and use advanced EMR features. This is the entry-level tier, perfect for practitioners starting their practice.

## Plan Details

### Pricing
- **Monthly**: $49/month
- **Yearly**: $490/year (save $98 - 2 months free)

### Limits
- **Max Patients**: 50
- **Max Users**: 1 (solo practitioner)
- **Storage**: 512MB
- **API Calls**: 5,000/month
- **Trial Period**: 14 days

### Features Included

✅ **EMR (Electronic Medical Records)**
- Patient allergy tracking
- Medication management
- Vital signs recording
- Clinical notes (SOAP format)
- Medical records with versioning

✅ **Scheduler**
- Appointment scheduling
- Waitlist management
- Resource booking
- Recurring appointments

✅ **Visit Management**
- Check-in/check-out
- Visit history
- No-show tracking
- Status management

✅ **Patient Management**
- Patient registration
- Demographics management
- MRN generation
- Patient search

✅ **Invoice Generation**
- Automated invoicing
- Payment tracking
- Line items support
- Tax calculations

✅ **Lab Management**
- Test ordering
- Results tracking
- Critical results flagging
- Lab reports

✅ **ICD-10 Integration**
- Code search and validation
- Common diagnoses library
- Billable code identification

### Features NOT Included

❌ Advanced reporting
❌ Mobile API access
❌ Multi-user collaboration
❌ Department management
❌ Advanced analytics
❌ FHIR compliance
❌ Insurance verification
❌ ML predictions
❌ IoT integration
❌ Telemedicine

## API Endpoints

### Get All Available Plans

```http
GET /api/billing/plans
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "individual",
      "limits": {
        "maxPatients": 50,
        "maxUsers": 1,
        "maxStorageMB": 512,
        "maxAPICallsPerMonth": 5000,
        "features": [
          "emr",
          "scheduler",
          "visit_management",
          "patient_management",
          "invoice_generation",
          "lab_management",
          "icd10_integration"
        ]
      },
      "pricing": {
        "monthly": 49,
        "yearly": 490
      }
    }
  ]
}
```

### Create Individual Plan Subscription

```http
POST /api/billing/subscription
Content-Type: application/json

{
  "planType": "individual",
  "billingCycle": "monthly"
}
```

### Upgrade from Individual to Basic

```http
PUT /api/billing/subscription/upgrade
Content-Type: application/json

{
  "planType": "basic"
}
```

## Upgrade Path

```
Individual ($49/mo) → Basic ($99/mo) → Standard ($299/mo) → Pro ($599/mo)
```

All upgrades use prorated billing through Stripe.
