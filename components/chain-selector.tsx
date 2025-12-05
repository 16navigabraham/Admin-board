"use client"

import { ChainKey, CONTRACTS } from '@/config/contract'
import { useChain } from '@/contexts/chain-context'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'


export function ChainSelector() {
  const { selectedChain, setSelectedChain, isLoading } = useChain()

  if (isLoading) {
    return (
      <div className="w-[180px] h-10 bg-muted animate-pulse rounded-md" />
    )
  }

  const chainIcons: Record<ChainKey, string> = {
    base: '🔵',
    lisk: '🟣',
    celo: '🟡',
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedChain} onValueChange={(value: ChainKey) => setSelectedChain(value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span>{chainIcons[selectedChain]}</span>
              <span>{CONTRACTS[selectedChain].name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(CONTRACTS) as ChainKey[]).map((chainKey) => (
            <SelectItem key={chainKey} value={chainKey}>
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2">
                  <span>{chainIcons[chainKey]}</span>
                  <span>{CONTRACTS[chainKey].name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {CONTRACTS[chainKey].chainId}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
