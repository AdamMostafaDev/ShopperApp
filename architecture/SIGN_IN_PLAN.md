## Phase 1 Integrate OTP with sign up (STOP AFTER EACH DIRECTED STEP)
- [ ] **1.1** We need to integrate twilio api so that everytime there is a phone entered during sign up we sent otp, add a note in signup the the phone field that we will be sending otp for phone and the consent to text messages.
- [ ] **1.2** Lets integrate the otp. Create an OTP or a phone table (follow naming convetnion) that if a phone has been verified by that user we cache it in our db and do not hit twilio again. Below should be the otp process
- [ ] **1.2a** Generate random 6-digit OTP (123456)
- [ ] **1.2b** Store OTP temporarily (database/cache with 10min expiration)
- [ ] **1.2c** Send OTP via Twilio SMS to the BD number
- [ ] **1.2d**  User receives SMS on their BD phone
- [ ] **1.2e** User enters OTP in your app
- [ ] **1.2f** Verify OTP matches what you stored
- [ ] **1.2g**. Mark phone as verified if correct and store that in the db
- [ ] **1.3** TEST: Test with a number 
- [ ] **1.4** Rate limit implementation

18777804236