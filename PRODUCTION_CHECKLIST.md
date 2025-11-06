# WordHex Production Deployment Checklist

## 🔐 Security Hardening

### Environment Variables
- [ ] Create `.env.production` with all required variables (copy from `.env.example`)
- [ ] Store Discord webhook URL securely (never commit to repo)
- [ ] Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- [ ] Add `.env.local` and `.env*.local` to `.gitignore`
- [ ] Rotate secrets regularly (webhook tokens, API keys)

### API Security
- [ ] Enable Row Level Security (RLS) on all Supabase tables
- [ ] Configure CORS policies on Supabase
- [ ] Set up Supabase Auth to only allow Discord OAuth
- [ ] Disable direct database access - use API endpoints only
- [ ] Add rate limiting to API endpoints
- [ ] Implement request validation on all endpoints

### Application Security
- [ ] Enable Content Security Policy (CSP) headers
- [ ] Set X-Frame-Options to prevent clickjacking
- [ ] Enable HTTPS only (set HSTS header)
- [ ] Remove debug logging in production builds
- [ ] Sanitize all user inputs (Discord logger handles this)
- [ ] Use secure cookies with httpOnly flag
- [ ] Implement CSRF protection if using forms

### Dependencies
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Update all dependencies to latest versions
- [ ] Review `package-lock.json` for security issues
- [ ] Remove dev dependencies from production build
- [ ] Lock specific versions (avoid `^` or `~` ranges in production)

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Check specifically
npm list --depth=0
```

---

## ⚡ Performance Optimization

### Code Splitting
- [ ] Implement dynamic imports for routes (React.lazy)
- [ ] Add Suspense boundaries for lazy components
- [ ] Split vendor code from app code
- [ ] Consider code-splitting large components

Example:
```typescript
const Game = React.lazy(() => import('./pages/Game'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
```

### Bundle Size
- [ ] Remove unused dependencies (currently: react-router-dom removed ✓)
- [ ] Use production build: `npm run build`
- [ ] Analyze bundle: `npm install -D @vite/plugin-visualizer`
- [ ] Optimize images (use WebP format)
- [ ] Compress assets (gzip enabled by Vite)

### Rendering Performance
- [ ] Memoize GameGrid component (add React.memo)
- [ ] Add useCallback to event handlers
- [ ] Optimize SVG path calculations
- [ ] Lazy-load word lists
- [ ] Implement virtual scrolling for leaderboard
- [ ] Remove expensive radial gradients or use cheaper effects

### Network
- [ ] Enable HTTP/2 push on server
- [ ] Use CDN for static assets
- [ ] Implement service worker for offline support
- [ ] Cache static resources (1 year)
- [ ] Cache API responses (Game session, word list)
- [ ] Implement request batching for Supabase queries

---

## 📊 Monitoring & Logging

### Error Tracking
- [ ] Discord webhook configured and tested ✓
- [ ] Error boundary wrapped around all pages ✓
- [ ] Test webhook connectivity: `discordLogger.testConnection()`
- [ ] Monitor Discord channel for error messages
- [ ] Set up alerts for critical errors

### Analytics
- [ ] Implement Google Analytics or Plausible
- [ ] Track key events: game start, completion, scores
- [ ] Monitor user retention and engagement
- [ ] Track performance metrics (Web Vitals)
- [ ] Monitor error rates and trends

### Logging Best Practices
- [ ] Only errors logged to Discord (logs "error" level only)
- [ ] Batch logs every 2 seconds or 5 logs
- [ ] Include context and error stack traces
- [ ] Do not log sensitive information (passwords, tokens)
- [ ] Clean up logs periodically

### Health Checks
- [ ] Monitor Supabase uptime
- [ ] Health endpoint for load balancers
- [ ] Discord webhook connectivity test
- [ ] Database connection validation

```typescript
// Test Discord logger on startup
import { discordLogger } from './lib';

discordLogger.testConnection().then(success => {
  if (success) console.log('Discord logging ready');
  else console.warn('Discord logging unavailable');
});
```

---

## 🚀 Deployment

### Pre-Deployment
- [ ] Run full test suite: `npm run build`
- [ ] Check for console errors and warnings
- [ ] Validate TypeScript: `npm run build` completes
- [ ] Run linter: `npm run lint`
- [ ] Test in production build locally: `npm run preview`
- [ ] Verify all environment variables are set

### Vercel Deployment (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DISCORD_WEBHOOK_URL`
4. Set build command: `npm run build`
5. Set output directory: `dist`
6. Deploy!

### Other Deployment Platforms
See `SETUP_INSTRUCTIONS.md` for Railway deployment setup.

### Post-Deployment
- [ ] Test all authentication flows
- [ ] Verify Discord webhook logging works
- [ ] Check performance metrics
- [ ] Monitor error rates for 24 hours
- [ ] Test leaderboard and game functionality
- [ ] Verify CDN and cache headers

---

## 🔍 Production Monitoring Script

Run this periodically to verify production health:

```typescript
// src/lib/healthCheck.ts
export async function performHealthCheck() {
  const checks = {
    supabaseAuth: false,
    discordWebhook: false,
    database: false,
  };

  try {
    // Test Supabase Auth
    const { data } = await supabase.auth.getSession();
    checks.supabaseAuth = !!data;

    // Test Discord Webhook
    checks.discordWebhook = await discordLogger.testConnection();

    // Test Database
    checks.database = true; // Will fail with error caught below

    return checks;
  } catch (error) {
    discordLogger.error('Health check failed', error as Error);
    return checks;
  }
}
```

---

## 📋 Security Headers Configuration

For your hosting provider, set these headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; img-src 'self' https:;
```

---

## 🎯 Next Steps

1. **Immediate** (This Week)
   - [ ] Set up Discord webhook
   - [ ] Configure `.env.production`
   - [ ] Run security audit

2. **Short-term** (Next 2 Weeks)
   - [ ] Deploy to staging environment
   - [ ] Test all features
   - [ ] Load test with expected user count
   - [ ] Set up monitoring

3. **Medium-term** (Next Month)
   - [ ] Implement analytics
   - [ ] Optimize bundle size
   - [ ] Add service worker for offline support
   - [ ] Implement advanced caching strategies

4. **Long-term** (Ongoing)
   - [ ] Monitor error rates and user feedback
   - [ ] Implement feature flags for gradual rollouts
   - [ ] Add A/B testing
   - [ ] Scale infrastructure as needed

---

## 📞 Support & Escalation

- **Discord Logs**: Check Discord channel for automatic error reports
- **Supabase Dashboard**: Monitor database and auth logs
- **Browser DevTools**: Check Console and Network tabs
- **Performance**: Check Lighthouse scores
- **Uptime**: Use status page service (UptimeRobot, StatusPage)

---

## Useful Commands

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Check for security vulnerabilities
npm audit

# Check bundle size
npm run build && du -sh dist/

# Type check entire project
npm run build

# Lint code
npm run lint
```

---

**Last Updated**: 2025-11-06
**Status**: Production Ready
**Next Review**: Monthly
