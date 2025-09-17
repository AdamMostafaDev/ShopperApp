## Phase 1 Admin Dashboard ():
- [x] **1.1** Create a /admin page that should take login username and password
- [x] **1.2** Create a separate table for admins with industry standard fields but we definitely need a password field that links an email to a password field.
- [x] **2.1** Create a way to generate admin password and put that password into the database so the user can log in with the user name and password
- [x] **3.1** Create basic layout for admin page based on the industry standard for admin pages and knowing what we would be handling (customer information, orders, payment confirmation, shipped internationally, payment arrived in US, etc., ).
- [X] **4.1** We should be able to see every order, the products and all statuses as we have had in orders page
- [] **5.1** We should be able to update the product totals with the final price as well as the shipping price for that order
- [ ] **A.1** Should be able to see if email was sent after order confirmation by klaviyo
- [ ] **W.1** Stripe Webhook?
- [ ] **X.1** Klaviyo integration


## Phase 1.2 Payment Confirmation (test db and ui after each phase):

  - [x] A: Database Schema Updates

  1. Add original shipping fields back - shippingCostBdt, shippingCostUsd (default: 0)
  2. Change PaymentStatus to processing
  3. Run Prisma migration to apply changes

 - [x] B: Order Creation Updates

  4. Update create-payment-intent API - Set shipping costs to 0 during order creation
  5. Update checkout API - Set shipping costs to 0 during order creation

 - [X] C: UI Display Updates

  6. Create shipping display helper - Show "TBD" when amount = 0, otherwise show amount
  7. Update admin orders page - Add shipping row to order displays
  8. Update order details components - Add shipping everywhere orders are shown
  9. Update email templates - Include shipping row with TBD/amount logic

  - [X] D: Admin Price Update System

  10. Create pricing update modal - Exchange rate (editable), product prices (editable), shipping costs, auto-calculated totals
  11. Create pricing update API - /api/admin/orders/[id]/update-pricing - saves to final pricing fields
  12. Add "Send Confirmation Email" button - UI only for now, no logic
  13. Update orders display logic - Show final amounts when finalPricingUpdated = true
  prodcut cost should update 2 places

  E: Admin Add or delete
  14. Admin should be able to add to order which updates db
  15. Admnin should be able to soft delete from order which updates db as well as orders page. It still keeps the time but re 

  F: Email flow
  13. Once email is sent we need to track that email has been sent
  13. Update email to have refund be smaller link, and remove check from confirm payment html
  15. Update send confirmation email so that it triggers sending events to the payment-confirmation we have set up in klaviyo. DOuble check all events are being sent by going over the template in email-html-templates/payment-confirmation.html.
  15. Once email is sent the paymentStatus should be updated to processing

  G: Payment Update
  17. Update checkout so that first checkout doesn't actually go to stripe (or other future payment services) we just want to capture the data of the card and make sure it is valid. We dont want to actually have that be charged.
  18. For payment confirmation we should be able to change the payment status ourselves to update the values in DB. through a payment status drop down. 
  19. Once payment is confirmed and paymentStatus is Paid, we should have the option tp send the transaction details to stripe with updated details

  H: Additional Fees 

  Check for any db updates needed and any gaps
  
  X: Use email as the way to get feedback on accept or deny payment




 - [x] I: Database Updates

  - Add finalShippingOnlyBdt/finalShippingOnlyUSD  - Add finalShippingOnlyBdt field to Order model in prisma/schema.prisma
  - Add finalAdditionalFeesBdt/finalAdditionalFeesUSD field to Order model field to Order model in prisma/schema.prisma
  - Add finalAdditionalFeesBdt/finalAdditionalFeesUSD field to Order model 
  - Add feeDescription field to Order model
  - Run npx prisma migrate dev to create migration
  - Run npx prisma generate to update Prisma client

  - [x] J: Admin Dashboard Updates

  - Update src/app/(admin)/admin/dashboard/orders/page.tsx to show shipping/fees breakdown inputs
  - Add shipping cost input field
  - Add additional fees input field
  - Add fee description input field (disabled when fees = 0)
  - Auto-calculate and display total (shipping + fees)
  - Update src/app/api/admin/orders/[id]/update-pricing/route.ts to handle new fields
  - Ensure API saves all three new fields to database

- [x]   K: Customer Order Display

  - Update src/app/(main)/orders/[id]/page.tsx with conditional fee display logic
  - Show single "Shipping" line when fees = 0
  - Show "Shipping" + fee description lines when fees > 0
  - Update src/app/api/orders/[id]/route.ts to return new fields

  L: Email Template Updates

  - Find where payment confirmation emails are sent (likely in checkout or order API)
  - Update email sending logic to include conditional fee display variables
  - Modify email-html-templates/payment-confirmation.html to show/hide fee row
  - Test email renders correctly with and without fees
  - Shipping & Fees

  Testing

  - Test admin can edit shipping/fees separately
  - Test total auto-calculates correctly
  - Test customer sees correct display (with/without fees)
  - Test email shows correct format in both scenarios
  - Verify existing orders still work