# Billing Service Implementation

## ✅ Plan-Based Billing System

### **Subscription Plans**

#### **Basic Plan - $99/month, $990/year**
- **Patients**: Up to 100
- **Users**: Up to 5
- **Storage**: 1GB
- **API Calls**: 10,000/month
- **Features**: Basic reporting, patient management, appointments

#### **Standard Plan - $299/month, $2,990/year**
- **Patients**: Up to 500
- **Users**: Up to 20
- **Storage**: 5GB
- **API Calls**: 50,000/month
- **Features**: Advanced reporting, lab integration, mobile API

#### **Pro Plan - $599/month, $5,990/year**
- **Patients**: Unlimited
- **Users**: Unlimited
- **Storage**: 20GB
- **API Calls**: 200,000/month
- **Features**: All features, FHIR compliance, insurance verification, priority support

### **Core Components**

#### **1. Subscription Model**
```typescript
interface Subscription {
  tenant_id: string;
  plan_type: 'basic' | 'standard' | 'pro';
  billing_cycle: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  amount: number;
  current_period_start: Date;
  current_period_end: Date;
  trial_end?: Date;
  stripe_subscription_id?: string;
}
```

#### **2. Usage Tracking Model**
```typescript
interface UsageTracking {
  tenant_id: string;
  period_start: Date;
  period_end: Date;
  patients_count: number;
  appointments_count: number;
  lab_tests_count: number;
  storage_used_mb: number;
  api_calls_count: number;
}
```

### **Billing Service Features**

#### **Plan Management**
```typescript
// Create subscription with 14-day trial
const subscription = await BillingService.createSubscription(
  tenantId, 
  PlanType.STANDARD, 
  BillingCycle.MONTHLY
);

// Upgrade plan with prorated billing
const upgraded = await BillingService.upgradePlan(tenantId, PlanType.PRO);

// Check current subscription
const current = await BillingService.getCurrentSubscription(tenantId);
```

#### **Usage Monitoring**
```typescript
// Track usage automatically
await BillingService.trackUsage(tenantId, 'patients_count', 1);
await BillingService.trackUsage(tenantId, 'api_calls_count', 1);

// Check limits
const { withinLimits, violations } = await BillingService.checkUsageLimits(tenantId);

// Get current usage
const usage = await BillingService.getCurrentUsage(tenantId);
```

### **Middleware Integration**

#### **Plan Limits Enforcement**
```typescript
// Check usage limits before processing
router.post('/patients', 
  tenantMiddleware,
  authentication,
  checkPlanLimits(),
  PatientController.create
);

// Require specific features
router.get('/fhir/Patient/:id',
  tenantMiddleware,
  authentication,
  requireFeature('fhir_compliance'),
  FHIRController.getPatient
);
```

#### **Automatic Usage Tracking**
- **API calls** tracked automatically via middleware
- **Patient creation** tracked in patient service
- **File uploads** tracked for storage usage
- **Lab tests** tracked in laboratory service

### **API Endpoints**

#### **Billing Management**
```
GET /api/billing/plans - Get available plans
GET /api/billing/subscription - Get current subscription
POST /api/billing/subscription - Create new subscription
POST /api/billing/upgrade - Upgrade plan
GET /api/billing/usage - Get usage statistics
POST /api/billing/webhook - Stripe webhook handler
```

#### **Usage Examples**

**Get Available Plans:**
```javascript
fetch('/api/billing/plans')
  .then(res => res.json())
  .then(data => {
    console.log('Available plans:', data.data);
  });
```

**Create Subscription:**
```javascript
fetch('/api/billing/subscription', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token',
    'X-Tenant-ID': 'hospital-uuid'
  },
  body: JSON.stringify({
    planType: 'standard',
    billingCycle: 'monthly'
  })
});
```

**Check Usage:**
```javascript
fetch('/api/billing/usage', {
  headers: {
    'Authorization': 'Bearer token',
    'X-Tenant-ID': 'hospital-uuid'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Usage:', data.data.usage);
  console.log('Within limits:', data.data.withinLimits);
});
```

### **Stripe Integration**

#### **Subscription Management**
- **Automatic billing** via Stripe subscriptions
- **Prorated upgrades** when changing plans
- **14-day free trial** for new subscriptions
- **Webhook handling** for payment events

#### **Customer Management**
- **Automatic customer creation** in Stripe
- **Payment method management**
- **Invoice generation** and delivery
- **Failed payment handling**

### **Feature Access Control**

#### **Plan-Based Features**
```typescript
const PLAN_FEATURES = {
  basic: ['basic_reporting', 'patient_management', 'appointments'],
  standard: ['basic_reporting', 'advanced_reporting', 'lab_integration', 'mobile_api'],
  pro: ['all_features', 'fhir_compliance', 'insurance_verification', 'priority_support']
};
```

#### **Usage Limits Enforcement**
- **HTTP 402 Payment Required** when limits exceeded
- **Upgrade prompts** in API responses
- **Grace period** for temporary overages
- **Automatic notifications** for approaching limits

### **Business Logic**

#### **Trial Management**
- **14-day free trial** for all new subscriptions
- **Full feature access** during trial period
- **Automatic conversion** to paid subscription
- **Trial extension** capabilities for sales team

#### **Billing Cycles**
- **Monthly billing** on subscription anniversary
- **Annual billing** with 2-month discount
- **Prorated charges** for mid-cycle upgrades
- **Immediate access** to upgraded features

### **Monitoring & Analytics**

#### **Usage Analytics**
- **Monthly usage reports** per tenant
- **Trend analysis** for capacity planning
- **Overage alerts** for account managers
- **Revenue tracking** by plan type

#### **Health Metrics**
- **Subscription churn rate**
- **Plan upgrade conversion**
- **Feature adoption rates**
- **Payment success rates**

### **Error Handling**

#### **Payment Failures**
- **Retry logic** for failed payments
- **Grace period** before service suspension
- **Email notifications** to billing contacts
- **Manual payment options**

#### **Limit Violations**
- **Soft limits** with warnings
- **Hard limits** with service restrictions
- **Upgrade prompts** in user interface
- **Admin override** capabilities

## 🚀 Production Ready

The billing service provides:
- ✅ **Multi-tier pricing** with clear feature differentiation
- ✅ **Automatic usage tracking** and limit enforcement
- ✅ **Stripe integration** for reliable payment processing
- ✅ **Prorated billing** for plan changes
- ✅ **Free trial** period for new customers
- ✅ **Webhook handling** for real-time payment updates
- ✅ **Comprehensive API** for billing management

Perfect for SaaS hospital management system with scalable pricing tiers.