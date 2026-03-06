import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { calculationCache } from '@/application/services/calculationCache'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type { Store, InventoryConfig, AppSettings } from '@/domain/models'
import { BlurCommitInput } from '@/presentation/components/BlurCommitInput'
import {
  SidebarSection,
  SectionLabel,
  InventoryInputGroup,
  InventoryRow,
  InventoryLabel,
  InventoryAutoValue,
  InventoryDayRow,
  InventoryDayInput,
  InventoryDateBadge,
  StoreInventoryBlock,
  StoreInventoryTitle,
} from '@/presentation/components/DataManagementSidebar.styles'

export function InventorySettingsSection({
  stores,
  settings,
  settingsMap,
}: {
  readonly stores: ReadonlyMap<string, Store>
  readonly settings: AppSettings
  readonly settingsMap: ReadonlyMap<string, InventoryConfig>
}) {
  return (
    <SidebarSection>
      <SectionLabel>
        在庫設定
        {(() => {
          const firstCfg = settingsMap.values().next().value
          return firstCfg?.inventoryDate ? (
            <InventoryDateBadge>{firstCfg.inventoryDate} 時点</InventoryDateBadge>
          ) : null
        })()}
      </SectionLabel>
      <InventoryInputGroup>
        {Array.from(stores.values()).map((s) => {
          const cfg = settingsMap.get(s.id)
          const autoClosing =
            cfg?.productInventory != null || cfg?.costInclusionInventory != null
              ? (cfg.productInventory ?? 0) + (cfg.costInclusionInventory ?? 0)
              : null
          const daysInMo = getDaysInMonth(settings.targetYear, settings.targetMonth)
          return (
            <StoreInventoryBlock key={s.id}>
              <StoreInventoryTitle>{s.name}</StoreInventoryTitle>
              <InventoryRow>
                <InventoryLabel>機首在庫</InventoryLabel>
                <BlurCommitInput
                  value={cfg?.openingInventory}
                  placeholder="機首在庫"
                  onCommit={(val) => {
                    useDataStore.getState().updateInventory(s.id, { openingInventory: val })
                    calculationCache.clear()
                    useUiStore.getState().invalidateCalculation()
                  }}
                />
              </InventoryRow>
              <InventoryRow>
                <InventoryLabel>商品在庫</InventoryLabel>
                <BlurCommitInput
                  value={cfg?.productInventory}
                  placeholder="商品在庫"
                  onCommit={(val) => {
                    useDataStore.getState().updateInventory(s.id, { productInventory: val })
                    calculationCache.clear()
                    useUiStore.getState().invalidateCalculation()
                  }}
                />
              </InventoryRow>
              <InventoryRow>
                <InventoryLabel>原価算入費</InventoryLabel>
                <BlurCommitInput
                  value={cfg?.costInclusionInventory}
                  placeholder="原価算入費在庫"
                  onCommit={(val) => {
                    useDataStore.getState().updateInventory(s.id, { costInclusionInventory: val })
                    calculationCache.clear()
                    useUiStore.getState().invalidateCalculation()
                  }}
                />
              </InventoryRow>
              <InventoryRow>
                <InventoryLabel>期末在庫</InventoryLabel>
                <InventoryAutoValue>
                  {autoClosing != null
                    ? autoClosing.toLocaleString()
                    : (cfg?.closingInventory?.toLocaleString() ?? '—')}
                </InventoryAutoValue>
              </InventoryRow>
              <InventoryDayRow>
                <InventoryLabel>期末日</InventoryLabel>
                <BlurCommitInput
                  as={InventoryDayInput}
                  value={cfg?.closingInventoryDay}
                  placeholder="末日"
                  min={1}
                  max={daysInMo}
                  onCommit={(val) => {
                    useDataStore.getState().updateInventory(s.id, { closingInventoryDay: val })
                    calculationCache.clear()
                    useUiStore.getState().invalidateCalculation()
                  }}
                />
                <InventoryLabel style={{ minWidth: 'auto' }}>日</InventoryLabel>
              </InventoryDayRow>
              <InventoryRow>
                <InventoryLabel>花掛率%</InventoryLabel>
                <BlurCommitInput
                  value={cfg?.flowerCostRate != null ? cfg.flowerCostRate * 100 : null}
                  step="any"
                  placeholder={`${settings.flowerCostRate * 100}`}
                  onCommit={(val) => {
                    const rate = val != null ? val / 100 : undefined
                    useDataStore.getState().updateInventory(s.id, { flowerCostRate: rate })
                  }}
                />
              </InventoryRow>
              <InventoryRow>
                <InventoryLabel>産直掛率%</InventoryLabel>
                <BlurCommitInput
                  value={
                    cfg?.directProduceCostRate != null ? cfg.directProduceCostRate * 100 : null
                  }
                  step="any"
                  placeholder={`${settings.directProduceCostRate * 100}`}
                  onCommit={(val) => {
                    const rate = val != null ? val / 100 : undefined
                    useDataStore.getState().updateInventory(s.id, { directProduceCostRate: rate })
                  }}
                />
              </InventoryRow>
            </StoreInventoryBlock>
          )
        })}
      </InventoryInputGroup>
    </SidebarSection>
  )
}
