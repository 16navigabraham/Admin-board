# Paycrypt Admin Dashboard

<div align="center">

**A comprehensive multi-chain admin dashboard for managing the Paycrypt smart contract ecosystem**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Wagmi](https://img.shields.io/badge/Wagmi-Latest-orange)](https://wagmi.sh/)
[![RainbowKit](https://img.shields.io/badge/RainbowKit-Latest-purple)](https://www.rainbowkit.com/)
[![License](https://img.shields.io/badge/License-Private-red)]()

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Multi-Chain Support](#multi-chain-support)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Integration](#api-integration)
- [Authentication](#authentication)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🌟 Overview

The Paycrypt Admin Dashboard is a powerful Next.js application designed for administrators to manage and monitor the Paycrypt ecosystem across multiple blockchain networks. Built with modern Web3 technologies, it provides real-time insights into token operations, user activities, orders, and cross-chain transactions.

### Key Highlights

- **Multi-Chain Architecture**: Seamlessly manage contracts across Base, Lisk, and Celo networks
- **Real-Time Analytics**: Live data visualization with interactive charts and metrics
- **Secure Authentication**: Email/password authentication with JWT token management
- **Responsive Design**: Mobile-first UI with dark mode support
- **Web3 Integration**: Full wallet connectivity via RainbowKit and Wagmi

---

## ✨ Features

### 🔐 Authentication & Authorization
- Email/password login system
- JWT token-based session management
- Protected routes with authentication guards
- Persistent authentication state

### 📊 Dashboard Views

#### Overview Page
- Total trading volume across all chains
- Active users and token statistics
- Recent activity feed
- Chain-specific volume breakdown
- Interactive charts (bar, line, area, pie)

#### Orders Management
- View all orders across chains
- Filter by order status and chain
- Search and pagination
- Detailed order information with blockchain links

#### Token Management
- List all deployed tokens
- Token details (name, symbol, total supply)
- Chain-specific filtering
- Direct links to block explorers

#### User Management
- User registry and statistics
- Order history per user
- Wallet address tracking
- Activity monitoring

#### Admin Panel
- Administrative controls
- System configuration
- Chain management interface

### 🌐 Multi-Chain Support

The dashboard supports three blockchain networks:

| Chain | Chain ID | Explorer | Features |
|-------|----------|----------|----------|
| **Base** | 8453 | [BaseScan](https://basescan.org) | Primary network |
| **Lisk** | 1135 | [Blockscout](https://blockscout.lisk.com) | Secondary network |
| **Celo** | 42220 | [CeloScan](https://celoscan.io) | Secondary network |

#### Multi-Chain Features
- **Chain Selector**: Global dropdown to switch between networks
- **Aggregated View**: "All Chains" mode showing combined data
- **Chain Filtering**: Filter data by specific blockchain
- **Chain Icons**: Visual indicators for each network
- **Persistent Selection**: Chain preference saved in localStorage

---

## 🛠 Tech Stack

### Frontend Framework
- **Next.js 15.5** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type-safe development

### Web3 Integration
- **Wagmi** - React Hooks for Ethereum
- **RainbowKit** - Wallet connection UI
- **Viem** - TypeScript Ethereum library

### UI Components
- **Radix UI** - Headless component primitives
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

### State Management
- **TanStack Query** - Async state management
- **React Context** - Global state (chain selection)

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **pnpm** - Package management

---

## 🔗 Multi-Chain Support

### Supported Networks

The dashboard integrates with three EVM-compatible blockchains:

```typescript
// Base Network
Chain ID: 8453
Contract: 0x0574A0941Ca659D01CF7370E37492bd2DF43128d
RPC: https://mainnet.base.org

// Lisk Network
Chain ID: 1135
Contract: 0x7Ca0a469164655AF07d27cf4bdA5e77F36Ab820A
RPC: https://rpc.api.lisk.com

// Celo Network
Chain ID: 42220
Contract: 0xBC955DC38a13c2Cd8736DA1bC791514504202F9D
RPC: https://forno.celo.org
```

### Chain Context

The `ChainContext` provider manages the global chain state:

```typescript
import { useChain } from '@/contexts/chain-context'

const { selectedChain, setSelectedChain, multiChainMode } = useChain()
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.17 or higher
- **pnpm**: v8.0 or higher
- **Git**: Latest version

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Team-memevibe/Admin-board.git
   cd Admin-board
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   
   ```env
   # Backend API URL
   NEXT_PUBLIC_BACKEND_API_URL=https://your-api-url.com
   
   # WalletConnect Project ID (get from https://cloud.walletconnect.com)
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   
   # Optional: Chain-specific RPC URLs
   NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
   NEXT_PUBLIC_LISK_RPC_URL=https://rpc.api.lisk.com
   NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. **Obtain admin credentials** from your system administrator
2. **Login** with your email and password
3. **Connect wallet** (optional) via RainbowKit for Web3 features
4. **Select your preferred chain** using the chain selector in the header

---

## 📁 Project Structure

```
Admin-board/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Login page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   └── dashboard/                # Dashboard routes
│       ├── layout.tsx            # Dashboard layout with sidebar
│       ├── overview/             # Overview page
│       ├── orders/               # Orders management
│       ├── all-orders/           # All orders view
│       ├── tokens/               # Token management
│       ├── users/                # User management
│       └── admin/                # Admin panel
│
├── components/                   # React components
│   ├── app-sidebar.tsx           # Navigation sidebar
│   ├── auth-guard.tsx            # Route protection
│   ├── chain-selector.tsx        # Chain switching component
│   ├── theme-provider.tsx        # Dark mode provider
│   ├── web3-provider.tsx         # Web3 configuration
│   └── ui/                       # UI component library
│       ├── button.tsx
│       ├── card.tsx
│       ├── chart.tsx
│       ├── table.tsx
│       └── ...
│
├── config/                       # Configuration files
│   └── contract.ts               # Multi-chain contract config
│
├── contexts/                     # React contexts
│   └── chain-context.tsx         # Chain selection state
│
├── hooks/                        # Custom React hooks
│   └── use-mobile.tsx            # Mobile detection
│
├── lib/                          # Utility libraries
│   ├── api.ts                    # API client functions
│   ├── auth.ts                   # Authentication utilities
│   └── utils.ts                  # Helper functions
│
├── public/                       # Static assets
├── styles/                       # Additional styles
│
├── .env.local                    # Environment variables (create this)
├── components.json               # shadcn/ui configuration
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

---

## ⚙️ Configuration

### Contract Configuration

Smart contract addresses and chain configurations are defined in `config/contract.ts`:

```typescript
export const CONTRACTS: Record<ChainKey, ChainConfig> = {
  base: {
    chainId: 8453,
    name: 'Base',
    address: '0x0574A0941Ca659D01CF7370E37492bd2DF43128d',
    explorer: 'https://basescan.org',
  },
  // ... other chains
}
```

### Helper Functions

- `getContractAddress(chainId)` - Get contract address by chain ID
- `getContractAddressByKey(chainKey)` - Get contract address by chain key
- `getExplorerUrl(chainId)` - Get block explorer URL
- `getRPCUrl(chainId)` - Get RPC endpoint URL

### Web3 Provider Configuration

RainbowKit and Wagmi are configured in `components/web3-provider.tsx` with support for all three chains.

---

## 🔌 API Integration

### Backend Endpoints

The dashboard communicates with a REST API backend:

```typescript
// Base URL from environment
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

// Example endpoints
GET  /api/orders                    // All orders
GET  /api/orders/user/:wallet       // User-specific orders
GET  /api/tokens                    // All tokens
GET  /api/users                     // User registry
GET  /api/stats                     // Dashboard statistics
POST /api/auth/login                // Authentication
```

### API Client (`lib/api.ts`)

```typescript
// Fetch all orders
export async function getAllOrders()

// Fetch orders for a specific user
export async function getUserHistory(userAddress: string)

// Additional API functions...
```

### Authentication API (`lib/auth.ts`)

```typescript
// Login and store JWT token
paycryptAPI.login(email, password)

// Check authentication status
paycryptAPI.isAuthenticated()

// Logout
paycryptAPI.logout()
```

---

## 🔐 Authentication

### Login Flow

1. Admin enters email and password on login page
2. Credentials sent to `/api/auth/login`
3. Backend validates and returns JWT token
4. Token stored in `localStorage`
5. Token included in subsequent API requests via `Authorization` header
6. Protected routes check for valid token via `AuthGuard`

### Protected Routes

All dashboard routes are protected by the `AuthGuard` component:

```typescript
// app/dashboard/layout.tsx
import AuthGuard from '@/components/auth-guard'

export default function DashboardLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>
}
```

### Token Management

```typescript
// Check if user is authenticated
if (paycryptAPI.isAuthenticated()) {
  // User has valid token
}

// Logout and clear token
paycryptAPI.logout()
router.push('/')
```

---

## 💻 Development

### Available Scripts

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

### Development Workflow

1. **Create a new feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following TypeScript and ESLint guidelines

3. **Test locally**
   ```bash
   pnpm dev
   ```

4. **Build and verify**
   ```bash
   pnpm build
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- Use TypeScript for all new files
- Follow ESLint rules
- Use functional components with hooks
- Implement proper error handling
- Add comments for complex logic
- Keep components focused and reusable

### Adding New Components

```bash
# Add a new shadcn/ui component
npx shadcn-ui@latest add [component-name]
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

3. **Set Environment Variables** in Vercel dashboard
   - `NEXT_PUBLIC_BACKEND_API_URL`
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Manual Deployment

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

---

## 🤝 Contributing

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Write or update tests if applicable
5. Ensure all tests pass and build succeeds
6. Submit a pull request with a detailed description

### Pull Request Process

1. Update the README.md with details of changes if needed
2. Follow the existing code style and conventions
3. Ensure your code builds without errors
4. Request review from maintainers

### Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Provide detailed information including:
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots if applicable
  - Environment details (OS, browser, Node version)

---

## 📄 License

This project is private and proprietary. All rights reserved by Team Memevibe.

---

## 👥 Team

**Team Memevibe**
- Organization: [Team-memevibe](https://github.com/Team-memevibe)
- Repository: [Admin-board](https://github.com/Team-memevibe/Admin-board)

---

## 📞 Support

For questions, issues, or support requests:
- Open an issue on GitHub
- Contact the development team
- Check existing documentation in the `/docs` folder

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Web3 integration via [Wagmi](https://wagmi.sh/) and [RainbowKit](https://www.rainbowkit.com/)
- Icons by [Lucide](https://lucide.dev/)

---

<div align="center">

**Made with ❤️ by Team Memevibe**

[Report Bug](https://github.com/Team-memevibe/Admin-board/issues) · [Request Feature](https://github.com/Team-memevibe/Admin-board/issues)

</div> 



