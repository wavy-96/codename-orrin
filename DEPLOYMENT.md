# Deployment Guide - Subdomain Setup

## Deploying to `interview.yourdomain.com`

### Prerequisites
- Netlify account with DNS management for your domain
- Netlify CLI installed (optional, for CLI deployment)

### Step 1: Update Netlify Configuration

The `netlify.toml` file has been updated with the correct settings for Next.js 16.

### Step 2: Deploy to Netlify

#### Option A: Deploy via Netlify Dashboard

1. **Go to Netlify Dashboard**
   - Visit https://app.netlify.com
   - Click "Add new site" → "Import an existing project"

2. **Connect Repository**
   - Connect your GitHub repository: `wavy-96/codename-orrin`
   - Netlify will auto-detect the build settings from `netlify.toml`

3. **Configure Build Settings** (should auto-detect):
   - Build command: `npm run build`
   - Publish directory: (auto-handled by @netlify/plugin-nextjs)
   - Node version: 20

4. **Add Environment Variables**
   - Go to Site settings → Environment variables
   - Add all required environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`
     - `NEXT_PUBLIC_APP_URL` (set to `https://interview.yourdomain.com` - your production URL)
     - Any other environment variables your app needs

5. **Configure Supabase Redirect URLs**
   - Go to your Supabase project dashboard: https://app.supabase.com
   - Select your project
   - In the left sidebar, click **Authentication**
   - Click **URL Configuration** (under Authentication settings)
   - Set **Site URL** to: `https://interview.yourdomain.com`
   - In the **Redirect URLs** section, click "Add URL" and add:
     - `https://interview.yourdomain.com/auth/callback`
     - `http://localhost:3000/auth/callback` (for local development)
   - Click **Save** to apply changes

6. **Update Supabase Email Templates** (Important!)
   - Still in the Supabase dashboard, go to **Authentication** → **Email Templates**
   - Find the **Confirm signup** template
   - In the email template, look for the confirmation link
   - Make sure the link uses `{{ .RedirectTo }}` instead of `{{ .SiteURL }}`
   - The link should look like: `{{ .RedirectTo }}` or `{{ .ConfirmationURL }}`
   - This ensures the `emailRedirectTo` parameter from your signup code is used
   - Click **Save** after making changes

7. **Deploy**
   - Click "Deploy site"
   - Wait for the build to complete

#### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

### Step 3: Configure Subdomain in Netlify

1. **Go to Site Settings**
   - In your Netlify dashboard, select your site
   - Go to "Domain settings"

2. **Add Custom Domain**
   - Click "Add custom domain"
   - Enter: `interview.yourdomain.com`
   - Netlify will verify domain ownership

3. **Configure DNS in Netlify**
   - Go to your domain's DNS settings in Netlify
   - Add a CNAME record:
     - **Name**: `interview`
     - **Value**: `your-site-name.netlify.app` (or your Netlify site URL)
     - **TTL**: 3600 (or default)

4. **SSL Certificate**
   - Netlify will automatically provision an SSL certificate for `interview.yourdomain.com`
   - This usually takes a few minutes

### Step 4: Verify Main Domain Still Works

- Your main domain (`yourdomain.com`) should continue working as before
- The subdomain (`interview.yourdomain.com`) will route to this Next.js app
- Both can coexist independently

### Step 5: Update Environment Variables (if needed)

If your app uses environment variables that reference the domain:
- Update any hardcoded URLs to use `interview.yourdomain.com`
- Update CORS settings if needed
- Update OAuth redirect URLs if using authentication

### Troubleshooting

1. **DNS Propagation**: DNS changes can take up to 48 hours, but usually propagate within minutes
2. **SSL Certificate**: If SSL doesn't provision automatically, check domain verification
3. **Build Errors**: Check Netlify build logs for any missing dependencies or environment variables

### Next Steps

After deployment:
- Test all functionality on the subdomain
- Verify API routes work correctly
- Check that Supabase connections work
- Test authentication flows

