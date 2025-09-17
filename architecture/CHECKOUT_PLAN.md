## Phase 1 Checkout Address Integration (Only complete the points mentioned in the request):
- [x ] **1.1** TEST: Address checkout renders correctly on desktop and mobile
- [ x ] **1.2** Create a pre checkout page called information should be a page which basically similar to shopify has a shipping adddresses form. This shipping addresses form should be the same as the addresses form and should be auto-populated with the default address.  as we know in some cases default addresses can have name city but other cases a lot more information, based on that we will populate the fields
- [ x ] **1.3** Like shopify it should show the order of checkout cart > information > payment. Should have saved addresses dropdown which lets you pick from your addresses. If I lets say choose another adress it should auto populate that field
- [ ] **1.4** Soon as we go on to the information page right it should hit the google maps api, and if it finds it is not valid address we should just send a suggestion that this is not correct. But still allow the user to enter it manually. 
- [ ] **1.45** If there is an address that is close then we should offer a suggestion. If for some reason an address cannot be validated we should save that the address is not validated in the database.
- [ ] **1.46** TEST: Enter an invalid address see if you get the message and enter a correct address and see if you get 200. Make sure debouncing is working as expected.
- [ ] **1.5** We need to save on api calls, so we should be validating once information page is loaded and the second time if any edits are made to the address So once the address is validated for that user we should not hit it, it should be cached and saved.
- [ ] **1.55** If an address is edited, lets say I have adress #1 123 Main Street, Brooklyn, NY, 11217 sotred in addresses and I edit in information page to 123 Main Street, 1f, Brooklyn, NY, 11217, it should update everywhere, addresses page . 
- [ ] **1.7** Shipping addresses now should not be in the checkout page, we should just have the shipping address listed in the payment window and give them the option to change it in the checkout page and it should take them back to information page
- [ ] **1.8** Checkout page now payment page should thereore display contact information (email), shipping address which can be changed and would be taken to information page, payment, shipping and billing
- [x] **1.9** We should remember the users information once they checkout or have saved addresses for the first time. N1ext time they add something to cart they should not need to re-add their information but they still have the option to interact with links, it should directly take them to checkout since it has been already been entered once. 
- [x] **1.95** TEST: New users not signed in should be able to get the same flow and default being populated in the field
- [ ] **1.10** Same thing should happen if they have entered information into the information page, we shoulddn't be calling the api on the addresses multiple times just once to verify that that address has been checked
<!-- at checkout we shuold get the map snippet with the location -->
- [x] **1.10.5** All big buttons should have hover and change color. Importnat links should have hover as well
- [ ] **1.11** Similarly otp should be done if we find that the phone has not been validated, we need store information of phone numbers that have been validated as well. On the information for phone please add that they consent to be texted and we will be sending an otp if phone has not been validated.

<!-- Great questions! Let me break this down:

  Address Authentication Flow

  1. When to trigger validation:

  - On page load: Validate default address immediately
  - On address change: Validate when user selects different address
   from dropdown
  - On manual edit: Validate after user stops typing (debounced)       

  2. Handling negative cases:

  Case A: API check succeeds ✅
  - Show green checkmark, proceed to payment

  Case B: Close match with suggestions ⚠️
  // Google returns suggestions
  {
    status: "SUGGESTIONS",
    original: "123 Main St, NYC",
    suggestions: [
      "123 Main Street, New York, NY 10001",
      "123 Main St, Brooklyn, NY 11201"
    ]
  }
  - Show "Did you mean?" with clickable suggestions
  - Let user pick correct one or keep original

  Case C: Completely incorrect ❌
  - Show warning: "Address not found - shipping may be delayed"        
  - Offer to edit address
  - Still allow proceeding (don't block checkout)

  3. Stripe Address Integration:

  You don't need to use Stripe's address form for payments. Stripe     
  just needs:
  // Minimal for Stripe
  billing_details: {
    address: {
      line1: "123 Main St",
      city: "New York",
      postal_code: "10001",
      country: "US"
    }
  }

  Recommended flow:
  1. Your address validation page
  2. Pass validated address to Stripe payment
  3. Use same address for both shipping & billing (with option to      
  change billing)

  This gives you full control over UX while keeping Stripe
  integration simple. Want me to implement this validation page?    -->

// we will send you a text on this phone to keep track of your shipping if it hasn't been already verified we will send a otp
