# FinScoreIQPro - Azure Deployment Guide

This guide will help you deploy your AI Scorecard Generator application to Microsoft Azure cloud platform, even if you're not technical.

## Prerequisites

### What You'll Need
1. **Microsoft Azure Account** - Sign up at [portal.azure.com](https://portal.azure.com)
2. **Credit Card** - For Azure billing (they offer free credits for new accounts)
3. **Your Application Files** - The complete project folder
4. **Database Connection** - Your PostgreSQL database URL

### Cost Estimation
- **Small Business**: $50-100/month
- **Medium Business**: $150-300/month
- **Enterprise**: $500+/month

## Step 1: Prepare Your Application

### 1.1 Required Files Checklist
Ensure you have these essential files:
```
✓ package.json (dependencies list)
✓ server/ folder (backend code)
✓ client/ folder (frontend code)
✓ shared/schema.ts (database structure)
✓ .replit file (configuration)
```

### 1.2 Environment Variables
You'll need these secret values:
- `DATABASE_URL` - Your PostgreSQL connection string
- `SESSION_SECRET` - Random secure string for user sessions
- `NODE_ENV=production`

## Step 2: Create Azure Resources

### 2.1 Login to Azure Portal
1. Go to [portal.azure.com](https://portal.azure.com)
2. Sign in with your Microsoft account
3. Click "Create a resource" (big blue button)

### 2.2 Create Resource Group
1. Search for "Resource Group"
2. Click "Create"
3. Fill in:
   - **Name**: `finscore-production`
   - **Region**: Choose closest to your users (e.g., "East US", "West Europe")
4. Click "Review + Create" → "Create"

### 2.3 Create App Service Plan
1. Search for "App Service Plan"
2. Click "Create"
3. Fill in:
   - **Resource Group**: Select `finscore-production`
   - **Name**: `finscore-plan`
   - **Operating System**: Linux
   - **Region**: Same as resource group
   - **Pricing Tier**: 
     - **Starter**: B1 Basic ($13/month)
     - **Production**: P1V3 Premium ($73/month)
4. Click "Review + Create" → "Create"

## Step 3: Deploy Your Application

### 3.1 Create Web App
1. Search for "Web App"
2. Click "Create"
3. Fill in:
   - **Resource Group**: `finscore-production`
   - **Name**: `finscore-app` (must be globally unique)
   - **Publish**: Code
   - **Runtime Stack**: Node 20 LTS
   - **Operating System**: Linux
   - **App Service Plan**: Select `finscore-plan`
4. Click "Review + Create" → "Create"

### 3.2 Configure Environment Variables
1. Go to your Web App in Azure Portal
2. Click "Configuration" in left menu
3. Under "Application settings", click "New application setting"
4. Add these one by one:

```
Name: DATABASE_URL
Value: [Your PostgreSQL connection string]

Name: SESSION_SECRET
Value: [Generate random 32-character string]

Name: NODE_ENV
Value: production

Name: PORT
Value: 8080
```

5. Click "Save" after adding all variables

### 3.3 Upload Your Code

**Option A: Using Azure CLI (Recommended)**
1. Download Azure CLI from [docs.microsoft.com/cli/azure/install-azure-cli](https://docs.microsoft.com/cli/azure/install-azure-cli)
2. Open terminal/command prompt
3. Run these commands:
```bash
# Login to Azure
az login

# Navigate to your project folder
cd /path/to/your/project

# Deploy the application
az webapp up --name finscore-app --resource-group finscore-production --runtime "NODE:20-lts"
```

**Option B: Using GitHub (Alternative)**
1. Upload your code to GitHub repository
2. In Azure Portal, go to your Web App
3. Click "Deployment Center" in left menu
4. Select "GitHub" as source
5. Authorize Azure to access your GitHub
6. Select your repository and branch
7. Click "Save"

## Step 4: Database Setup

### 4.1 If You Need New Database
1. Search for "Azure Database for PostgreSQL"
2. Select "Flexible Server"
3. Fill in:
   - **Resource Group**: `finscore-production`
   - **Server Name**: `finscore-db`
   - **Admin Username**: `dbadmin`
   - **Password**: Create strong password
   - **Region**: Same as your app
   - **Compute + Storage**: Burstable B1ms (cheapest option)
4. Click "Review + Create" → "Create"

### 4.2 Configure Database Connection
1. After database is created, click "Connection strings"
2. Copy the connection string
3. Replace the password placeholder with your actual password
4. Update the `DATABASE_URL` in your Web App configuration

### 4.3 Initialize Database Tables
1. In Azure Portal, go to your Web App
2. Click "SSH" or "Advanced Tools" → "Go"
3. In the terminal, run:
```bash
npm run db:push
```

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Custom Domain
1. Purchase domain from provider like GoDaddy, Namecheap
2. In Azure Portal, go to your Web App
3. Click "Custom domains" in left menu
4. Click "Add custom domain"
5. Enter your domain (e.g., `app.yourcompany.com`)
6. Follow DNS configuration instructions

### 5.2 Add SSL Certificate
1. In "Custom domains" section
2. Click "Add binding" next to your domain
3. Select "SNI SSL"
4. Azure will automatically create free SSL certificate

## Step 6: Configure Scaling & Monitoring

### 6.1 Auto-Scaling Setup
1. Go to your App Service Plan
2. Click "Scale out (App Service Plan)"
3. Select "Custom autoscale"
4. Set rules:
   - **Scale out**: When CPU > 70% for 10 minutes
   - **Scale in**: When CPU < 30% for 10 minutes
   - **Instance limits**: Min 1, Max 5

### 6.2 Monitoring Setup
1. Go to your Web App
2. Click "Application Insights" in left menu
3. Click "Turn on Application Insights"
4. Select "Create new resource"
5. Click "Apply"

## Step 7: Security Configuration

### 7.1 Enable HTTPS Only
1. Go to your Web App
2. Click "TLS/SSL settings"
3. Turn ON "HTTPS Only"

### 7.2 Configure CORS (if needed)
1. Go to your Web App
2. Click "CORS" in left menu
3. Add allowed origins (your domain URLs)

## Step 8: Backup & Recovery

### 8.1 Enable App Backup
1. Go to your Web App
2. Click "Backups" in left menu
3. Click "Configure"
4. Set up storage account and backup schedule

### 8.2 Database Backup
1. Go to your PostgreSQL server
2. Click "Backup and restore"
3. Configure automated backups (enabled by default)

## Step 9: Testing Your Deployment

### 9.1 Verify Application
1. Go to your Web App URL: `https://finscore-app.azurewebsites.net`
2. Test login with: `admin@demo.com` / `password`
3. Create a test scorecard to verify full functionality
4. Check all 9 modules are working

### 9.2 Performance Testing
1. Use Azure Application Insights
2. Monitor response times and errors
3. Check database performance metrics

## Step 10: Maintenance & Updates

### 10.1 Updating Your Application
When you make code changes:
1. If using Azure CLI: Run `az webapp up` again
2. If using GitHub: Push changes to your repository

### 10.2 Monitoring Costs
1. Go to "Cost Management + Billing" in Azure Portal
2. Set up budget alerts
3. Monitor monthly spending

### 10.3 Regular Maintenance
- **Weekly**: Check Application Insights for errors
- **Monthly**: Review cost and usage reports
- **Quarterly**: Update dependencies and security patches

## Troubleshooting Common Issues

### Application Won't Start
1. Check "Log stream" in Azure Portal
2. Verify environment variables are set correctly
3. Ensure database connection is working

### Slow Performance
1. Check Application Insights metrics
2. Consider upgrading App Service Plan
3. Optimize database queries

### Database Connection Issues
1. Verify DATABASE_URL format
2. Check firewall settings on PostgreSQL server
3. Test connection from Azure Cloud Shell

## Support Resources

- **Azure Documentation**: [docs.microsoft.com/azure](https://docs.microsoft.com/azure)
- **Azure Support**: Available through Azure Portal
- **Community Forums**: [stackoverflow.com](https://stackoverflow.com) with "azure" tag

## Cost Optimization Tips

1. **Start Small**: Use B1 Basic plan initially
2. **Monitor Usage**: Set up billing alerts
3. **Scale Smart**: Use auto-scaling to handle traffic spikes
4. **Review Monthly**: Check for unused resources

---

**Estimated Total Monthly Cost for Small Business:**
- App Service Plan B1: $13
- PostgreSQL Flexible Server B1ms: $12
- Storage and bandwidth: $5-10
- **Total: ~$30-35/month**

This deployment will give you a production-ready, scalable AI Scorecard Generator that can handle hundreds of concurrent users and thousands of scorecard generations per month.