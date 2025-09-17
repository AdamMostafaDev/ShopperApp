# UniShopper Deployment Plan

## Overview
This document provides a comprehensive step-by-step guide for deploying UniShopper from local development to production using Vercel (hosting) and Supabase (database).

## Pre-Deployment Checklist
- [x] All code merged to master branch
- [ ] Local testing completed
- [ ] Environment variables documented
- [ ] Database schema finalized
- [ ] Email templates tested

## Phase 2: Vercel Setup

### 2.1 Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub account (recommended)
- [ ] Install Vercel CLI (optional):
```bash
npm install -g vercel
```

### 2.2 Import Project
- [ ] Click "Add New Project"
- [ ] Import from GitHub repository
- [ ] Select "ShopperApp" repository
- [ ] Choose "Next.js" as framework preset
- [ ] Root directory: keep as is

### 2.3 Configure Environment Variables
- [ ] Go to Project Settings > Environment Variables
- [ ] Add the following variables:

```env
# Database (from Supabase)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Stripe Production Keys
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Klaviyo
KLAVIYO_API_KEY="pk_..."

# Authentication
NEXTAUTH_SECRET="[generate-random-32-char-string]"
NEXTAUTH_URL="https://[your-project].vercel.app"

# Admin Setup
ADMIN_PASSWORD_HASH="[hashed-admin-password]"

# Optional: Custom Domain (when ready)
# NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
```

### 2.4 Generate Required Secrets
- [ ] Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```
- [ ] Hash admin password:
```bash
# Use bcrypt or run this in your Next.js app
npm run hash-password -- "your-admin-password"
```

### Phase 2.5 Test
- [ ] Test Sign up
- [ ] Test Log in
- [ ] Test checkout
- [ ] Test orders
- [ ] Test email confirmation
- [ ] Test addresses


## Phase 3: Deploy to Staging

### 3.1 Initial Deployment
- [ ] Push code to master branch
- [ ] Vercel auto-deploys on push
- [ ] Monitor build logs in Vercel dashboard
- [ ] Fix any build errors if they occur

### 3.2 Verify Deployment
- [ ] Access preview URL: https://[project-name].vercel.app
- [ ] Check database connection (admin login)
- [ ] Test basic functionality:
  - [ ] Browse products
  - [ ] Add to cart
  - [ ] Checkout flow (use Stripe test cards)
  - [ ] Admin dashboard access

### 3.3 Domain Configuration
- [ ] Free domain: Use [project-name].vercel.app
- [ ] Custom domain (optional):
  - Purchase domain from provider
  - Add domain in Vercel settings
  - Update DNS records as instructed

## Phase 4: Service Configuration

### 4.1 Stripe Setup
- [ ] Log into Stripe Dashboard
- [ ] Create webhook endpoint:
  - URL: https://[your-domain]/api/webhooks/stripe
  - Events: checkout.session.completed, payment_intent.succeeded
- [ ] Copy webhook secret to Vercel env vars
- [ ] Test with Stripe CLI:
```bash
stripe listen --forward-to https://[your-domain]/api/webhooks/stripe
```

### 4.2 Klaviyo Configuration
- [ ] Verify API key in Klaviyo account
- [ ] Test email templates:
  - Order Confirmation
  - Payment Confirmation
- [ ] Set up production email flows
- [ ] Configure sender domain (SPF/DKIM)

### 4.3 Database Indexes
- [ ] Run in Supabase SQL Editor:
```sql
-- Optimize common queries
CREATE INDEX idx_orders_user_id ON orders(userId);
CREATE INDEX idx_orders_created_at ON orders(createdAt DESC);
CREATE INDEX idx_orders_payment_status ON orders(paymentStatus);
CREATE INDEX idx_products_store ON products(store);
```

## Phase 5: Testing in Production

### 5.1 End-to-End Testing
- [ ] Place test order with real payment (refund after)
- [ ] Verify email delivery
- [ ] Check admin dashboard functionality
- [ ] Test on mobile devices
- [ ] Verify SSL certificate

### 5.2 Performance Testing
- [ ] Run Lighthouse audit
- [ ] Check Core Web Vitals
- [ ] Test loading speed from target region
- [ ] Verify image optimization

### 5.3 Security Checklist
- [ ] All API routes protected
- [ ] Admin authentication working
- [ ] Rate limiting enabled
- [ ] Environment variables secure
- [ ] CORS configured properly

## Phase 6: Go Live

### 6.1 Switch to Production Mode
- [ ] Update Stripe to live keys
- [ ] Remove test data from database
- [ ] Update email templates for production
- [ ] Configure analytics (Google Analytics/Vercel)

### 6.2 Monitoring Setup
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (Sentry optional):
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
- [ ] Configure uptime monitoring
- [ ] Set up database backups in Supabase

### 6.3 Launch Checklist
- [ ] Announcement ready
- [ ] Support email configured
- [ ] Terms & Privacy pages live
- [ ] Social media accounts ready
- [ ] Customer service prepared

## Phase 7: Post-Launch

### 7.1 Immediate Tasks (Day 1)
- [ ] Monitor error logs
- [ ] Check email delivery rates
- [ ] Review first transactions
- [ ] Respond to user feedback
- [ ] Fix critical bugs

### 7.2 Week 1 Tasks
- [ ] Analyze user behavior
- [ ] Optimize slow queries
- [ ] Adjust rate limits if needed
- [ ] Review security logs
- [ ] Plan feature updates

## Rollback Procedures

### Emergency Rollback
1. Go to Vercel Dashboard > Deployments
2. Find last working deployment
3. Click "..." menu > "Promote to Production"
4. Deployment rolled back in ~30 seconds

### Database Rollback
1. Supabase Dashboard > Backups
2. Select point-in-time recovery
3. Restore to timestamp before issue
4. Update app if schema changed

## Cost Summary

### Monthly Costs (Free Tier)
- Vercel: $0 (100GB bandwidth)
- Supabase: $0 (500MB database)
- Stripe: 2.9% + 30¢ per transaction
- Klaviyo: $0 (up to 250 contacts)
- **Total: $0/month** + transaction fees

### When to Upgrade
- Vercel Pro ($20/mo): >100GB bandwidth/month
- Supabase Pro ($25/mo): >500MB data or >2GB bandwidth
- Klaviyo: >250 active customers

## Support Resources

### Documentation
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Next.js: https://nextjs.org/docs
- Stripe: https://stripe.com/docs

### Common Issues
1. **Build fails**: Check Node version, clear cache
2. **Database timeout**: Check connection string, add ?pgbouncer=true
3. **Emails not sending**: Verify Klaviyo API key and templates
4. **Payment fails**: Check Stripe webhook configuration

## Commands Reference

### Local Development
```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run lint          # Check code quality
npx prisma studio     # Database GUI
```

### Deployment
```bash
git push origin master    # Auto-deploy via GitHub
vercel --prod            # Manual deploy via CLI
vercel env pull          # Sync env vars locally
```

### Database
```bash
npx prisma migrate dev    # Create migration
npx prisma generate       # Update Prisma Client
npx prisma db push       # Push schema changes
```

## Success Metrics

Track these KPIs post-launch:
- [ ] Page load time <3 seconds
- [ ] 99.9% uptime
- [ ] <1% transaction failure rate
- [ ] Email delivery rate >95%
- [ ] Customer satisfaction >4.5/5

---

**Last Updated**: September 17, 2025
**Status**: Ready for Phase 1 Execution
**Next Step**: Create Supabase account and migrate database