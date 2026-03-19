import { useState, useCallback } from 'react'
import type { StoreLocation, GeocodingResult } from '@/domain/models'
import { useGeocode } from '@/application/hooks/useGeocode'
import { useEtrnStationSearch } from '@/application/hooks/useEtrnStationSearch'
import { palette } from '@/presentation/theme/tokens'
import { Select, Input, Badge } from './AdminShared'
import { SmallButton } from './AdminPage.styles'

export function StoreLocationEditor({
  storeId,
  storeName,
  location,
  onSave,
  onClear,
}: {
  storeId: string
  storeName: string
  location: StoreLocation | undefined
  onSave: (storeId: string, loc: StoreLocation) => void
  onClear: (storeId: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedPrefecture, setSelectedPrefecture] = useState('')
  const [selectedStationKey, setSelectedStationKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const {
    prefectures,
    stations,
    isSearching,
    searchByPrefecture,
    geocodePrefecture,
    clear: clearStations,
  } = useEtrnStationSearch()

  // Geocoding fallback for location search
  const [query, setQuery] = useState('')
  const { candidates, isSearching: isGeoSearching, search, clear: clearCandidates } = useGeocode()

  const handlePrefectureChange = useCallback(
    async (prefName: string) => {
      setSelectedPrefecture(prefName)
      setSelectedStationKey('')
      if (prefName) {
        await searchByPrefecture(prefName)
      } else {
        clearStations()
      }
    },
    [searchByPrefecture, clearStations],
  )

  const handleStationSave = useCallback(async () => {
    if (!selectedStationKey || !selectedPrefecture) return
    const station = stations.find((s) => `${s.precNo}:${s.blockNo}` === selectedStationKey)
    if (!station) return

    setIsSaving(true)
    try {
      // Geocode prefecture for approximate lat/lon (needed for forecast resolution)
      const coords = await geocodePrefecture(selectedPrefecture)
      const latitude = coords?.latitude ?? location?.latitude ?? 0
      const longitude = coords?.longitude ?? location?.longitude ?? 0

      onSave(storeId, {
        ...location,
        latitude,
        longitude,
        resolvedName: `${selectedPrefecture} ${station.stationName}`,
        etrnPrecNo: station.precNo,
        etrnBlockNo: station.blockNo,
        etrnStationType: station.stationType,
      })
      setIsEditing(false)
      setSelectedPrefecture('')
      setSelectedStationKey('')
      clearStations()
    } finally {
      setIsSaving(false)
    }
  }, [
    selectedStationKey,
    selectedPrefecture,
    stations,
    geocodePrefecture,
    location,
    onSave,
    storeId,
    clearStations,
  ])

  const handleGeoSearch = useCallback(async () => {
    const q = query.trim() || storeName
    await search(q)
  }, [query, storeName, search])

  const handleGeoSelect = useCallback(
    (r: GeocodingResult) => {
      const label = [r.name, r.admin1, r.admin2].filter(Boolean).join(', ')
      onSave(storeId, { latitude: r.latitude, longitude: r.longitude, resolvedName: label })
      setIsEditing(false)
      clearCandidates()
      setQuery('')
    },
    [storeId, onSave, clearCandidates],
  )

  if (!isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {location ? (
          <>
            <Badge $color={palette.successDark}>
              {location.resolvedName ??
                `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
            </Badge>
            {location.etrnBlockNo && (
              <Badge $color={palette.infoDark}>
                {location.etrnStationType === 's1' ? '気象台' : '観測所'}
              </Badge>
            )}
            <SmallButton onClick={() => setIsEditing(true)}>変更</SmallButton>
            <SmallButton $variant="danger" onClick={() => onClear(storeId)}>
              削除
            </SmallButton>
          </>
        ) : (
          <SmallButton $variant="primary" onClick={() => setIsEditing(true)}>
            設定
          </SmallButton>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 観測所選択（都道府県 → 観測所 ドロップダウン） */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          value={selectedPrefecture}
          onChange={(e) => handlePrefectureChange(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">都道府県を選択</option>
          {prefectures.map((p) => (
            <option key={p.code} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
        {isSearching && <span style={{ fontSize: 12, color: palette.slate }}>検索中...</span>}
        {stations.length > 0 && (
          <>
            <Select
              value={selectedStationKey}
              onChange={(e) => setSelectedStationKey(e.target.value)}
              style={{ width: 180 }}
            >
              <option value="">気象台・測候所を選択</option>
              {stations.map((s) => (
                <option key={`${s.precNo}:${s.blockNo}`} value={`${s.precNo}:${s.blockNo}`}>
                  {s.stationName}
                </option>
              ))}
            </Select>
            <SmallButton
              $variant="primary"
              onClick={handleStationSave}
              disabled={!selectedStationKey || isSaving}
            >
              {isSaving ? '保存中...' : '設定'}
            </SmallButton>
          </>
        )}
        <SmallButton onClick={() => setIsEditing(false)}>閉じる</SmallButton>
      </div>
      {/* 地名検索（フォールバック） */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGeoSearch()
          }}
          placeholder={`地名で検索（例: ${storeName}）`}
          style={{ width: 180 }}
        />
        <SmallButton $variant="primary" onClick={handleGeoSearch} disabled={isGeoSearching}>
          {isGeoSearching ? '...' : '検索'}
        </SmallButton>
      </div>
      {candidates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {candidates.map((r, i) => {
            const label = [r.name, r.admin1, r.admin2, r.country].filter(Boolean).join(', ')
            return (
              <SmallButton key={i} onClick={() => handleGeoSelect(r)} style={{ textAlign: 'left' }}>
                {label} ({r.latitude.toFixed(2)}, {r.longitude.toFixed(2)})
              </SmallButton>
            )
          })}
        </div>
      )}
    </div>
  )
}
