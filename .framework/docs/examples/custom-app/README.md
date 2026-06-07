# Example: Custom App

A minimal React app with manifest and routing, installable via `spine-framework install-app`.

## Directory Structure

```
custom/apps/my-app/
├── manifest.json       # App metadata, routes, nav items
├── index.tsx           # React entry point (default export)
├── seed/
│   ├── types.json      # Item types this app provides
│   └── triggers.json   # Automation triggers
├── components/
│   └── Dashboard.tsx   # App-specific components
└── package.json        # npm package metadata (optional)
```

## manifest.json

```json
{
  "name": "My App",
  "slug": "my-app",
  "version": "0.1.0",
  "description": "A custom app for demonstration",
  "routes": [
    { "path": "/", "redirect": "/dashboard" },
    { "path": "/dashboard", "component": "Dashboard" }
  ],
  "nav_items": [
    { "label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard" }
  ],
  "required_roles": ["member"]
}
```

## index.tsx

```tsx
import * as React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">My App</h1>
    </div>
  )
}

export default function MyApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
    </Routes>
  )
}
```

## Installation

```bash
# Create the app scaffold
spine-framework create-app my-app

# Or install an existing app package
spine-framework install-app my-app
```

## How It Works

1. `CustomAppLoader` discovers apps via `import.meta.glob('custom/apps/*/index.tsx')`
2. The app's `manifest.json` provides routing and navigation metadata
3. Seed data is applied via `spine-framework install-app` (idempotent upserts)
4. The app is isolated — it cannot import from other apps or core internals
