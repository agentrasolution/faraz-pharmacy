# Faraz Pharmacy - Desktop App

Cross-platform POS desktop application built with Electron, React, and TypeScript.

## Tech Stack

- **Electron**: 34.x
- **React**: 19
- **Language**: TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **State Management**: TanStack React Query 5
- **Routing**: React Router 7
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Toasts**: Sonner
- **Build**: electron-builder

## Project Structure

```
desktop-app/
├── electron/                    # Electron main process
│   ├── main.js                  # Main process entry
│   ├── preload.cjs              # Preload script (context bridge)
│   ├── ipc-handlers.js          # IPC event handlers
│   ├── config.js                # App config (~/.faraz-pharmacy)
│   ├── printer.js               # Thermal printer integration
│   └── vendor/                  # Third-party vendor libs
├── src/                         # React renderer
│   ├── pages/                   # Route pages
│   │   ├── POS.tsx              # Point of Sale
│   │   ├── Dashboard.tsx        # Dashboard with stats
│   │   ├── Products.tsx         # Product management
│   │   ├── Customers.tsx        # Customer management
│   │   ├── CustomerDetail.tsx   # Customer details
│   │   ├── Stock.tsx            # Stock/purchases
│   │   ├── Sales.tsx            # Sales history
│   │   ├── Invoices.tsx         # Invoice management
│   │   ├── Returns.tsx          # Return management
│   │   ├── Arrears.tsx          # Debt tracking
│   │   ├── Distributors.tsx     # Supplier management
│   │   ├── Companies.tsx        # Company management
│   │   ├── Barcodes.tsx         # Barcode generation
│   │   ├── Categories.tsx       # Category management
│   │   ├── Expenses.tsx         # Expense tracking
│   │   ├── Reports.tsx          # Reports & analytics
│   │   ├── Settings.tsx         # App settings
│   │   └── Login.tsx            # Login screen
│   ├── components/
│   │   ├── layout/              # Sidebar, Topbar
│   │   ├── pos/                 # POS-specific components
│   │   ├── dashboard/           # Chart components
│   │   ├── shared/              # Reusable components (ExportButton, Kbd, etc.)
│   │   └── ui/                  # Radix UI primitives
│   ├── contexts/                # React contexts
│   │   ├── AuthContext.tsx       # Authentication state
│   │   └── ServerConnectionContext.tsx
│   ├── hooks/                   # Custom hooks (useModuleShortcuts)
│   ├── lib/                     # Utilities
│   │   ├── api.ts               # API client
│   │   ├── utils.ts             # Helper functions
│   │   ├── export.ts            # PDF/CSV export
│   │   ├── os.ts                # OS detection (Cmd vs Ctrl)
│   │   └── receiptStore.ts      # Receipt caching
│   ├── types/                   # TypeScript declarations
│   └── asset/                   # Static assets
├── .env                         # Environment variables
├── index.html                   # HTML entry
├── vite.config.ts               # Vite config
├── tsconfig.json                # TypeScript config
└── package.json
```

## Setup

### Prerequisites

- Node.js >= 18
- Backend server running (see `/server`)

### Installation

```bash
npm install
```

### Environment Variables

```env
VITE_API_URL="http://localhost:3000"
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev (Vite + Electron) |
| `npm run dev:renderer` | Start Vite dev server only |
| `npm run dev:electron` | Start Electron only |
| `npm run build` | Build for production |
| `npm run build:renderer` | Build React only |
| `npm run preview` | Preview production build |

## Build Targets

| Platform | Format | Output |
|----------|--------|--------|
| macOS | DMG | `dist-electron/` |
| Windows | NSIS Installer | `dist-electron/` |
| Linux | AppImage | `dist-electron/` |

Build output directory: `dist-electron/`

## Features

- **POS (Point of Sale)** - Quick sales with barcode scanning
- **Multi-window** - Open separate POS window
- **Thermal Printer** - Receipt printing support
- **Offline Mode** - Works without server connection
- **Keyboard Shortcuts** - Cmd/Ctrl + letter for quick navigation
- **Export** - PDF (red) and CSV (green) export on all modules
- **Global Search** - Cmd/Ctrl + K for quick actions
- **Dark Mode** - Full dark mode support

## Keyboard Shortcuts

### Global Navigation (Cmd/Ctrl + Letter)
| Key | Action |
|-----|--------|
| Cmd/Ctrl + S | POS / Sales |
| Cmd/Ctrl + I | Invoices |
| Cmd/Ctrl + R | Returns |
| Cmd/Ctrl + C | Customers |
| Cmd/Ctrl + A | Arrears |
| Cmd/Ctrl + P | Products |
| Cmd/Ctrl + K | Stock |
| Cmd/Ctrl + B | Barcodes |
| Cmd/Ctrl + D | Distributors |
| Cmd/Ctrl + M | Companies |
| Cmd/Ctrl + E | Expenses |
| Cmd/Ctrl + H | Reports |
| Cmd/Ctrl + , | Settings |
| Cmd/Ctrl + O | New POS Window |
| Cmd/Ctrl + Shift + P | Settings |
| Cmd/Ctrl + Q | Logout |

### Module Shortcuts (Within Each Page)
| Key | Action |
|-----|--------|
| Cmd/Ctrl + N | Add new item |
| Cmd/Ctrl + F | Focus search |
| Cmd/Ctrl + Shift + P | Export PDF |
| Cmd/Ctrl + Shift + E | Export CSV |

### Other
| Key | Action |
|-----|--------|
| F1-F12 | Legacy navigation |
| Cmd/Ctrl + K | Global search |
| Escape | Close dialogs |

## Architecture

```
┌─────────────────────────────────────────┐
│           Electron Main Process         │
│  (main.js, ipc-handlers, printer)       │
└──────────────────┬──────────────────────┘
                   │ IPC
┌──────────────────┴──────────────────────┐
│         Electron Renderer (React)       │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │   Contexts   │  │   React Query    │  │
│  │  (Auth, etc) │  │   (Server State) │  │
│  └─────────────┘  └──────────────────┘  │
│  ┌─────────────────────────────────────┐│
│  │            Pages / Components        ││
│  └─────────────────────────────────────┘│
└──────────────────┬──────────────────────┘
                   │ HTTP
┌──────────────────┴──────────────────────┐
│        Backend API (server:3001)         │
└─────────────────────────────────────────┘
```

## Config Location

App config stored at: `~/.faraz-pharmacy/config.json`
