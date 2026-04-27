/**
 * InlineLocationSetup — 天気ページ内の観測所設定コンポーネント
 *
 * 都道府県 → 観測所の2段選択で ETRN 観測所を選択し、StoreLocation として保存する。
 *
 * @responsibility R:unclassified
 */
import { memo, useState, useMemo, useCallback } from 'react'
import { useEtrnStationSearch } from '@/application/hooks/useEtrnStationSearch'
import type { StoreLocation } from '@/domain/models/record'
import { SetupSection, Select, NavBtn } from './WeatherPage.styles'

export const InlineLocationSetup = memo(function InlineLocationSetup({
  onSave,
}: {
  onSave: (loc: StoreLocation) => void
}) {
  const [selectedPrefecture, setSelectedPrefecture] = useState('')
  const [selectedBlockNo, setSelectedBlockNo] = useState('')
  const { prefectures, getStations, getCoordinates } = useEtrnStationSearch()

  const stations = useMemo(
    () => (selectedPrefecture ? getStations(selectedPrefecture) : []),
    [selectedPrefecture, getStations],
  )

  const selectedStation = useMemo(
    () => stations.find((s) => s.blockNo === selectedBlockNo),
    [stations, selectedBlockNo],
  )

  const handleSave = useCallback(() => {
    if (!selectedBlockNo || !selectedStation) return
    const coords = getCoordinates(selectedBlockNo)
    if (!coords) return
    onSave({
      latitude: coords.latitude,
      longitude: coords.longitude,
      etrnPrecNo: selectedStation.precNo,
      etrnBlockNo: selectedStation.blockNo,
      etrnStationType: selectedStation.stationType,
      resolvedName: selectedStation.stationName,
    })
  }, [selectedBlockNo, selectedStation, getCoordinates, onSave])

  return (
    <SetupSection>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
          都道府県
        </label>
        <Select
          value={selectedPrefecture}
          onChange={(e) => {
            setSelectedPrefecture(e.target.value)
            setSelectedBlockNo('')
          }}
          style={{ width: '100%' }}
        >
          <option value="">選択してください</option>
          {prefectures.map((p) => (
            <option key={p.code} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      {stations.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label
            style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}
          >
            観測所
          </label>
          <Select
            value={selectedBlockNo}
            onChange={(e) => setSelectedBlockNo(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">選択してください</option>
            {stations.map((s) => (
              <option key={s.blockNo} value={s.blockNo}>
                {s.stationName}
              </option>
            ))}
          </Select>
        </div>
      )}
      {selectedBlockNo && selectedStation && (
        <div>
          <NavBtn onClick={handleSave} style={{ width: '100%', padding: '10px' }}>
            この観測所で天気データを取得
          </NavBtn>
        </div>
      )}
    </SetupSection>
  )
})
