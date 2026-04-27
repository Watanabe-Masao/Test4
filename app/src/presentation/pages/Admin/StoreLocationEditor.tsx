/**
 * @responsibility R:unclassified
 */

import { useState, useCallback, useMemo } from 'react'
import type { StoreLocation } from '@/domain/models/record'
import { useEtrnStationSearch } from '@/application/hooks/useEtrnStationSearch'
import { palette } from '@/presentation/theme/tokens'
import { Select, Badge } from './AdminShared'
import { SmallButton } from './AdminPage.styles'

export function StoreLocationEditor({
  storeId,
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
  const { prefectures, getStations, getCoordinates } = useEtrnStationSearch()

  const filteredStations = useMemo(
    () => (selectedPrefecture ? getStations(selectedPrefecture) : []),
    [selectedPrefecture, getStations],
  )

  const handlePrefectureChange = useCallback((prefName: string) => {
    setSelectedPrefecture(prefName)
    setSelectedStationKey('')
  }, [])

  const handleStationSave = useCallback(() => {
    if (!selectedStationKey || !selectedPrefecture) return
    const station = filteredStations.find((s) => `${s.precNo}:${s.blockNo}` === selectedStationKey)
    if (!station) return

    const coords = getCoordinates(station.blockNo)
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
  }, [
    selectedStationKey,
    selectedPrefecture,
    filteredStations,
    getCoordinates,
    location,
    onSave,
    storeId,
  ])

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
      {filteredStations.length > 0 && (
        <>
          <Select
            value={selectedStationKey}
            onChange={(e) => setSelectedStationKey(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">観測所を選択</option>
            {filteredStations.map((s) => (
              <option key={`${s.precNo}:${s.blockNo}`} value={`${s.precNo}:${s.blockNo}`}>
                {s.stationName}
              </option>
            ))}
          </Select>
          <SmallButton
            $variant="primary"
            onClick={handleStationSave}
            disabled={!selectedStationKey}
          >
            設定
          </SmallButton>
        </>
      )}
      <SmallButton onClick={() => setIsEditing(false)}>閉じる</SmallButton>
    </div>
  )
}
