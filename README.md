# Spine Framework

A complete enterprise application framework built on Supabase + Netlify + React for building scalable multi-tenant applications with extensible app ecosystems.

## Overview

Spine Framework is a **complete, runnable framework** that provides everything you need to build enterprise applications:

- **Multi-tenant Architecture**: Support for tenant hierarchies and isolated deployments
- **Role-Based Access Control**: Fine-grained permissions and authorization  
- **App Ecosystem**: Install and manage custom applications
- **Real-time Features**: Built-in support for real-time collaboration and notifications
- **AI Integration**: Native support for AI agents and intelligent workflows
- **Developer Tools**: Comprehensive tooling for development, testing, and deployment

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (via Supabase recommended)
- Netlify account (for deployment)

### Installation

```bash
# Clone the framework
git clone https://github.com/spine-framework/spine-framework.git
cd spine-framework

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase and Netlify credentials

# Start development
npm run dev
```

### Install Custom Apps

```bash
# Install Cortex (CRM, Support, Community, Knowledge Base)
npm run app-install cortex

# Install Customer Portal
npm run app-install customer-portal

# List available apps
npm run spine-framework list-apps
```

## Architecture

### Core Components

- **Framework Core**: Base functionality, authentication, and data models
- **App Registry**: System for managing and distributing applications
- **Multi-tenant Engine**: Tenant isolation and hierarchy management
- **Authorization Layer**: Role-based permissions and access control
- **Real-time Infrastructure**: WebSocket support and live updates
- **AI Agent System**: Integration with AI services and workflows

### App Ecosystem

Spine Framework supports a growing ecosystem of applications:

- **Cortex**: CRM, Support, Community, and Knowledge Base
- **Customer Portal**: Self-service customer portal
- **Custom Apps**: Build your own applications using the framework

### Database Schema

The framework uses a clean, normalized schema with:

- **Accounts & Tenants**: Multi-tenant hierarchy support
- **People & Roles**: User management and permissions
- **Items & Threads**: Flexible data modeling system
- **Apps & Integrations**: Extensible app registry
- **AI Agents**: Intelligent workflow automation

## Development

### Project Structure

```
my-spine-project/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Application pages
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React contexts
│   └── utils/             # Utility functions
├── functions/             # Serverless functions
├── migrations/            # Database migrations
├── custom/                # Custom app extensions
└── docs/                  # Documentation
```

### Building Apps

Create custom applications using the Spine Framework:

```typescript
// src/apps/my-app/index.tsx
import { AppLayout, useCurrentApp } from '@spine-framework/core'

export default function MyApp() {
  const app = useCurrentApp()
  
  return (
    <AppLayout>
      <h1>{app.name}</h1>
      {/* Your app content */}
    </AppLayout>
  )
}
```

### Database Extensions

Add custom database schema:

```sql
-- migrations/001_my_app.sql
CREATE TABLE my_app_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE my_app_data ENABLE ROW LEVEL SECURITY;
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Framework
SPINE_ENV=development
SPINE_LOG_LEVEL=info
```

### Framework Configuration

```typescript
// spine.config.ts
export default {
  database: {
    url: process.env.DATABASE_URL,
    poolSize: 10,
  },
  auth: {
    providers: ['email', 'github', 'google'],
    sessionTimeout: '24h',
  },
  apps: {
    registry: 'https://registry.spine-framework.com',
    autoUpdate: true,
  },
  ai: {
    provider: 'openai',
    model: 'gpt-4',
  }
}
```

## Deployment

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run type-check
```

### Production

```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod

# Or deploy to your preferred platform
```

### Database Migrations

```bash
# Run migrations
npx spine migrate up

# Create new migration
npx spine migrate create add_new_feature

# Rollback migration
npx spine migrate down
```

## Available Apps

### Official Apps

- **[spine-framework-cortex](https://github.com/spine-framework/spine-framework-cortex)**
  - CRM, Support, Community, Knowledge Base
  - `npm install spine-framework-cortex`

- **[spine-framework-portal](https://github.com/spine-framework/spine-framework-portal)**
  - Customer self-service portal
  - `npm install spine-framework-portal`

### Installing Apps

```bash
# Install an app
npx spine install-app cortex

# List available apps
npx spine list-apps

# Update an app
npx spine update-app cortex
```

## API Reference

### Core Hooks

```typescript
// Authentication
import { useAuth, useUser } from '@spine-framework/core'

// App Management
import { useApps, useCurrentApp } from '@spine-framework/core'

// Data Management
import { useItems, useThreads } from '@spine-framework/core'

// Real-time
import { useWebSocket } from '@spine-framework/core'
```

### Database Functions

```sql
-- Get account apps
SELECT * FROM get_account_apps(account_id, true, false);

-- Get accessible accounts
SELECT * FROM get_accessible_accounts(user_id);

-- Check permissions
SELECT * FROM has_permission(user_id, 'action', 'resource');
```

## Contributing

### Development Setup

```bash
# Clone the repository
git clone https://github.com/spine-framework/spine-framework.git
cd spine-framework

# Install dependencies
npm install

# Start development
npm run dev
```

### Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Building Apps for Distribution

If you want to contribute an app to the ecosystem:

1. Create your app using the framework
2. Follow the app structure guidelines
3. Include comprehensive documentation
4. Submit for review

## License

This framework is licensed under the [Spine Framework Internal Use License](LICENSE.md).

- ✅ Free for internal business use
- ❌ Commercial redistribution requires separate license
- 📞 Contact: spine-framework.com for commercial licensing

## Support

- **Documentation**: [docs.spine-framework.com](https://docs.spine-framework.com)
- **Issues**: [GitHub Issues](https://github.com/spine-framework/spine-framework/issues)
- **Community**: [Discord Server](https://discord.gg/spine-framework)
- **Commercial**: [Contact Us](mailto:commercial@spine-framework.com)

## Version History

### v1.0.0
- Initial release
- Multi-tenant architecture
- App registry system
- Role-based access control
- Real-time features
- AI integration

### Roadmap

- **v1.1**: Enhanced AI capabilities
- **v1.2**: Advanced analytics and reporting
- **v1.3**: Mobile app support
- **v2.0**: Microservices architecture

---

**Spine Framework** - Build enterprise applications with confidence.
