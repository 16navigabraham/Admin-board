# Multi-Chain Integration Guide

## Overview

The Admin Dashboard now supports multiple blockchain networks:
- 🔵 **Base** (Chain ID: 8453)
- 🟣 **Lisk** (Chain ID: 1135)
- 🟡 **Celo** (Chain ID: 42220)

Each chain has its own smart contract deployment with the same ABI, allowing seamless cross-chain management.

## Features

### 1. Chain Selection
- Global chain selector in the dashboard header
- Persists selection in localStorage
- Available on both mobile and desktop views

### 2. Multi-Chain View
- Toggle between "All Chains" and "Single Chain" mode
- All Chains: Aggregated data from Base + Lisk + Celo
- Single Chain: Data filtered for selected blockchain only

### 3. Chain-Specific Stats
- Volume breakdown by chain
- Token count per chain
- Visual indicators with chain-specific icons

## Architecture

### Configuration (`config/contract.ts`)

```typescript
export const CONTRACTS = {
  base: {
    chainId: 8453,
    name: 'Base',
    address: '0x0574A0941Ca659D01CF7370E37492bd2DF43128d',
    explorer: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
  },
  lisk: { ... },
  celo: { ... },
}
```

**Helper Functions:**
- `getContractAddress(chainId)` - Get address by chain ID
- `getContractAddressByKey(chainKey)` - Get address by chain key
- `getExplorerUrl(chainId)` - Get block explorer URL
- `getChainConfig(chainId)` - Get full chain configuration
- `isChainSupported(chainId)` - Check if chain is supported

### Chain Context (`contexts/chain-context.tsx`)

Manages global chain selection state:

```typescript
const { selectedChain, setSelectedChain, chainConfig } = useChain()
```

**State:**
- `selectedChain`: Current chain key ('base' | 'lisk' | 'celo')
- `chainConfig`: Full configuration for selected chain
- `isLoading`: Loading state during initialization

**Features:**
- Auto-saves preference to localStorage
- Initializes from saved preference on mount
- Provides type-safe chain management

### Chain Selector Component (`components/chain-selector.tsx`)

Visual dropdown for switching chains:

```tsx
<ChainSelector />
```

**Features:**
- Shows chain name and icon
- Displays chain ID badge
- Dropdown with all available chains
- Skeleton loader during initialization

## API Integration

### Volume API with Chain Filtering

The Volume API supports both aggregated and per-chain queries:

**All Chains (Default):**
```typescript
GET /api/volume/latest
// Returns total volume across all chains
```

**By Chain:**
```typescript
GET /api/volume/by-chain
// Returns breakdown by each chain
{
  "byChain": [
    {
      "chainId": 8453,
      "volumeUSD": "800,000.00",
      "tokenCount": 5,
      "tokens": [...]
    },
    ...
  ]
}
```

### Dashboard Implementation

The overview page automatically switches between endpoints based on view mode:

```typescript
const volumeEndpoint = showAllChains 
  ? '/api/volume/latest'       // All chains
  : '/api/volume/by-chain'     // Per-chain breakdown

// Filter data for selected chain
const currentChainData = volumeData.byChain?.find(
  chain => chain.chainId === chainConfig?.chainId
)
```

## UI Components

### Dashboard Header

**Desktop:**
```
┌─────────────────────────────────────────────┐
│ Admin Dashboard          [Chain Selector]   │
└─────────────────────────────────────────────┘
```

**Mobile:**
```
┌─────────────────────────────────────────────┐
│ [☰]                      [Chain Selector]   │
└─────────────────────────────────────────────┘
```

### Overview Page Controls

```
┌──────────────────────────────────────────────────────────┐
│ Dashboard Overview [Base Badge]                           │
│ [All Chains / Single Chain]  [Refresh]                   │
├──────────────────────────────────────────────────────────┤
│ 🔵 Base: $800,000  🟣 Lisk: $300,000  🟡 Celo: $100,000  │
└──────────────────────────────────────────────────────────┘
```

## Usage Examples

### Accessing Chain Context

```typescript
import { useChain } from '@/contexts/chain-context'

function MyComponent() {
  const { selectedChain, setSelectedChain, chainConfig } = useChain()
  
  console.log(`Current chain: ${chainConfig?.name}`)
  console.log(`Contract address: ${chainConfig?.address}`)
  
  // Switch to a different chain
  setSelectedChain('lisk')
}
```

### Getting Contract Address

```typescript
import { getContractAddress, CONTRACTS } from '@/config/contract'

// By chain ID
const address = getContractAddress(8453) // Base

// By chain key
const liskAddress = CONTRACTS.lisk.address
```

### Checking Chain Support

```typescript
import { isChainSupported, getSupportedChainIds } from '@/config/contract'

if (isChainSupported(userChainId)) {
  // Proceed with transaction
} else {
  toast.error(`Please switch to one of: ${getSupportedChainIds().join(', ')}`)
}
```

## Data Flow

```
┌─────────────────┐
│  User selects   │
│  chain in UI    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ChainContext   │
│  updates state  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  localStorage   │
│  saves choice   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Components     │
│  re-render with │
│  new chain data │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API calls use  │
│  selected chain │
│  contract addr  │
└─────────────────┘
```

## Extending to Other Pages

### Orders Page

```typescript
import { useChain } from '@/contexts/chain-context'
import { getExplorerUrl } from '@/config/contract'

function OrdersPage() {
  const { chainConfig } = useChain()
  
  // Filter orders by chain
  const orders = allOrders.filter(
    order => order.chainId === chainConfig?.chainId
  )
  
  // Link to block explorer
  const txUrl = `${chainConfig?.explorer}/tx/${txHash}`
}
```

### Tokens Page

```typescript
function TokensPage() {
  const { selectedChain, chainConfig } = useChain()
  
  // Fetch tokens for selected chain only
  useEffect(() => {
    fetchTokens(chainConfig?.chainId)
  }, [selectedChain])
}
```

### Users Page

```typescript
function UsersPage() {
  const { chainConfig } = useChain()
  
  // Show chain-specific user stats
  const chainUsers = users.filter(
    user => user.lastChainId === chainConfig?.chainId
  )
}
```

## Smart Contract Interactions

### With Viem

```typescript
import { createPublicClient, http } from 'viem'
import { base, celo } from 'viem/chains'
import { useChain } from '@/contexts/chain-context'
import { getContractAddressByKey, CONTRACT_ABI } from '@/config/contract'

function useContractRead() {
  const { selectedChain, chainConfig } = useChain()
  
  // Map chain keys to viem chain configs
  const viemChain = selectedChain === 'base' ? base : 
                    selectedChain === 'lisk' ? liskChain : 
                    celo
  
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(chainConfig?.rpcUrl),
  })
  
  const contractAddress = getContractAddressByKey(selectedChain)
  
  // Read from contract
  const data = await publicClient.readContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'getSupportedTokens',
  })
}
```

### With Wagmi

```typescript
import { useReadContract, useWriteContract } from 'wagmi'
import { useChain } from '@/contexts/chain-context'
import { getContractAddressByKey, CONTRACT_ABI } from '@/config/contract'

function useTokenData() {
  const { selectedChain, chainConfig } = useChain()
  
  const { data: tokens } = useReadContract({
    address: getContractAddressByKey(selectedChain),
    abi: CONTRACT_ABI,
    functionName: 'getSupportedTokens',
    chainId: chainConfig?.chainId,
  })
  
  return tokens
}
```

## Backend Compatibility

The backend Volume API already supports multi-chain:

```javascript
// Backend automatically fetches from all chains
const contracts = [
  { chainId: 8453, address: '0x...', rpc: 'https://...' },  // Base
  { chainId: 1135, address: '0x...', rpc: 'https://...' },  // Lisk
  { chainId: 42220, address: '0x...', rpc: 'https://...' }, // Celo
]

// Aggregate or filter by chain
contracts.forEach(async (contract) => {
  const volumes = await fetchChainVolume(contract)
  // Store with chainId tag
})
```

## Testing

### Test Chain Selection

1. Open dashboard
2. Click chain selector dropdown
3. Select different chain
4. Verify badge updates
5. Check localStorage: `paycrypt_selected_chain`
6. Refresh page, verify selection persists

### Test View Modes

1. **All Chains Mode:**
   - Click "All Chains" button
   - Verify chain breakdown shows all three chains
   - Check volume shows aggregated total

2. **Single Chain Mode:**
   - Click "Single Chain" button
   - Select "Lisk" from dropdown
   - Verify only Lisk data displayed
   - Check badge shows "Lisk"

### Test API Integration

```bash
# Test all chains endpoint
curl http://localhost:5000/api/volume/latest

# Test by-chain endpoint
curl http://localhost:5000/api/volume/by-chain
```

## Troubleshooting

### Issue: Chain selector not showing

**Cause:** ChainProvider not wrapped around components

**Solution:** Ensure `ChainProvider` wraps dashboard layout:

```tsx
<ChainProvider>
  <DashboardLayout>
    {children}
  </DashboardLayout>
</ChainProvider>
```

### Issue: Volume data incorrect after switching chains

**Cause:** Cache not invalidated

**Solution:** Add chain to useEffect dependencies:

```typescript
useEffect(() => {
  fetchData()
}, [selectedChain]) // ← Add this dependency
```

### Issue: Contract calls failing

**Cause:** Wrong contract address or chain ID

**Solution:** Verify chain configuration matches deployed contracts:

```typescript
console.log('Chain:', chainConfig?.name)
console.log('Address:', chainConfig?.address)
console.log('Chain ID:', chainConfig?.chainId)
```

## Future Enhancements

Planned improvements:

1. **Network Status Indicators**
   - Show RPC health per chain
   - Alert if chain is down

2. **Chain Comparison View**
   - Side-by-side stats
   - Volume trends per chain

3. **Auto Chain Switching**
   - Detect wallet chain
   - Suggest matching dashboard view

4. **Chain-Specific Tokens**
   - Show only tokens available on selected chain
   - Filter token list dynamically

5. **Multi-Chain Transactions**
   - Cross-chain order aggregation
   - Bridge integration

---

**Version:** 1.0.0  
**Last Updated:** December 5, 2024  
**Supported Chains:** Base, Lisk, Celo
