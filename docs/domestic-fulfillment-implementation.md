# Domestic Fulfillment Status Implementation Plan

## 🎯 Current Status: **Phase 3 Complete**

**✅ Completed:** Database migration, Admin UI with smart email buttons, API endpoints, Klaviyo integration
**🚧 Next:** Email templates in Klaviyo, Customer choice interface, End-to-end testing

---

## Overview
Implementation of a customer choice system for final order fulfillment in Bangladesh, allowing customers to choose between pickup and delivery options.

## Current Issue
- After packages arrive at BD warehouse, there's no clear workflow for final fulfillment
- "Out for Delivery" status is confusing and doesn't handle pickup scenarios
- Missing customer choice mechanism between pickup vs delivery

## Proposed Solution

### 1. Database Schema Changes

#### Field Rename
```sql
-- Rename existing field to match convention
outForDeliveryStatus → domesticFulfillmentStatus
```

#### New Fields Addition
```sql
-- Add to Order model
fulfillmentChoice     String?   // "PICKUP" | "DELIVERY" | null
fulfillmentChoiceDate DateTime? // When customer made the choice
pickupDetails         Json?     // Pickup-specific info (scheduled time, etc.)
deliveryDetails       Json?     // Delivery-specific info (address confirmation, etc.)
```

### 2. Status Workflow

#### Complete Order Workflow
1. **Payment Status**: PENDING → PROCESSING → **PAID**
2. **Shipped to US**: PENDING → PROCESSING → **COMPLETE**
3. **Shipped Internationally**: PENDING → PROCESSING → **COMPLETE**
4. **Domestic Fulfillment**: PENDING → PROCESSING → **PICKUP/DELIVERY**
5. **Delivered**: PENDING → **COMPLETE**

#### Domestic Fulfillment Status Values
- **PENDING**: Package in BD warehouse, awaiting customer choice
- **PROCESSING**: Customer made choice (pickup/delivery), being prepared
- **PICKUP**: Ready for customer pickup at warehouse
- **DELIVERY**: Package out for delivery to customer address

### 3. Customer Choice System

#### Trigger Event
When `shippedToBdStatus` changes to **COMPLETE**:
1. Automatically set `domesticFulfillmentStatus` to **PROCESSING**
2. Create a button that should allow to send out an email which would let the user select if they want pickup or delivery when in processing
3. Create a button that should allow to send out an email for pickup given that is the current state
4. Create a button that should allow to send out an email for delivery given that is the current state


#### Customer Choice Email
**Subject**: `Order #{{order_number}} - Choose Pickup or Delivery`
**Content**:
- Package arrival confirmation
- Two clear action buttons:
  - "Schedule Pickup" → Links to pickup choice page
  - "Request Delivery" → Links to delivery choice page

<!-- #### Choice Processing
- Customer clicks option → Updates database
- `fulfillmentChoice` = "PICKUP" or "DELIVERY"
- `fulfillmentChoiceDate` = timestamp
- `domesticFulfillmentStatus` = "PROCESSING" -->

Coming back to this ^ choice processing

### 4. Admin Interface Updates

#### UI Changes Required
```typescript
// Replace in admin dashboard
// OLD: outForDeliveryStatus dropdown
// NEW: domesticFulfillmentStatus dropdown

// Status options:
["PENDING", "PROCESSING", "PICKUP", "DELIVERY"]

// Show customer choice if available
if (order.fulfillmentChoice) {
  display: `Customer chose: ${order.fulfillmentChoice}`
}
```

#### Smart Email Buttons
- **PICKUP status**: "Send Pickup Instructions" button
- **DELIVERY status**: "Send Delivery Update" button

### 5. Email Templates

#### Template 1: Customer Choice Email
- **File**: `customer-choice.html`
- **Purpose**: Let customer choose pickup vs delivery
- **Triggers**: When BD warehouse status = COMPLETE

#### Template 2: Pickup Instructions Email
- **File**: `pickup-instructions.html`
- **Purpose**: Warehouse location, hours, requirements
- **Triggers**: When admin sets status to PICKUP

#### Template 3: Delivery Notification Email
- **File**: `delivery-notification.html`
- **Purpose**: Delivery timeline, address confirmation
- **Triggers**: When admin sets status to DELIVERY

### 6. API Endpoints Required

```typescript
// Customer choice endpoints
POST /api/orders/[orderNumber]/choose-fulfillment
// Body: { choice: "PICKUP" | "DELIVERY" }

// Admin email endpoints
POST /api/admin/orders/[id]/send-pickup-email
POST /api/admin/orders/[id]/send-delivery-email
POST /api/admin/orders/[id]/send-choice-email
```

### 7. Implementation Phases

#### Phase 1: Database Migration ✅ COMPLETED
- [x] ✅ Update Prisma schema
- [x] ✅ Run database migration
- [x] ✅ Update TypeScript types
- [x] ✅ Migrate existing data from outForDeliveryStatus → domesticFulfillmentStatus
- [x] ✅ Add fulfillmentChoice, fulfillmentChoiceDate, pickupDetails, deliveryDetails fields

#### Phase 2: Admin UI Updates ✅ COMPLETED
- [x] ✅ Replace outForDeliveryStatus with domesticFulfillmentStatus dropdown
- [x] ✅ Add customer choice display in admin interface
- [x] ✅ Update dropdown options (PENDING, PROCESSING, PICKUP, DELIVERY)
- [x] ✅ Add smart email buttons based on current status:
  - **PROCESSING**: "Send Customer Choice" button
  - **PICKUP**: "Send Pickup Instructions" button
  - **DELIVERY**: "Send Delivery Update" button

#### Phase 3: Customer Choice System ✅ COMPLETED
- [x] ✅ Create API endpoints for all email types:
  - `/api/admin/orders/[id]/send-choice-email`
  - `/api/admin/orders/[id]/send-pickup-email`
  - `/api/admin/orders/[id]/send-delivery-email`
- [x] ✅ Add automatic status transitions (BD warehouse COMPLETE → domestic fulfillment PROCESSING)
- [x] ✅ Add Klaviyo integration functions for all email types
- [x] ✅ Update admin UI with smart email triggering

#### Phase 4: Email Templates 🚧 PENDING
- [ ] Create customer choice email template in Klaviyo
- [ ] Create pickup instructions email template in Klaviyo
- [ ] Create delivery notification email template in Klaviyo
- [ ] Test email templates with real data

#### Phase 5: Customer Choice Interface 🚧 PENDING
- [ ] Create customer choice selection pages
- [ ] Add pickup vs delivery choice processing
- [ ] Implement fulfillmentChoice database updates
- [ ] Add customer-facing order tracking updates

#### Phase 6: Testing & Automation 🚧 PENDING
- [ ] Test complete workflow end-to-end
- [ ] Verify email delivery in all scenarios
- [ ] Test both pickup and delivery flows
- [ ] Add error handling and edge cases

## Technical Considerations

### Database Migration Strategy
```sql
-- Safe migration approach
1. Add new domesticFulfillmentStatus field
2. Copy data from outForDeliveryStatus
3. Update all references in code
4. Drop old outForDeliveryStatus field
```

### Error Handling
- Customer doesn't choose within X days → Send reminder
- Invalid choice selection → Fallback to admin intervention
- Email delivery failures → Admin notification

### Business Rules
- Customer has 48 hours to make choice after BD warehouse arrival
- Pickup available Mon-Sat 9AM-6PM
- Delivery within Dhaka: 1-2 days
- Delivery outside Dhaka: 2-3 days

## Success Metrics
- Reduction in customer support tickets about delivery status
- Increased customer satisfaction with clear choice options
- Improved order completion rates
- Better tracking and visibility for admin team

## Next Steps
1. Review and approve this implementation plan
2. Start with Phase 1 (Database Migration)
3. Implement phases sequentially with testing at each step
4. Deploy to staging environment first
5. Collect feedback and iterate before production deployment