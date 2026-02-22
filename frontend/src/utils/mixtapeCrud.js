export const MIXTAPES_STORAGE_KEY = 'mixtapes_crud'

export function readMixTapeRecords() {
  try {
    const raw = localStorage.getItem(MIXTAPES_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeMixTapeRecords(records) {
  localStorage.setItem(MIXTAPES_STORAGE_KEY, JSON.stringify(records))
}

export function addMixTapeRecord(record) {
  const current = readMixTapeRecords()
  const next = [record, ...current]
  writeMixTapeRecords(next)
  return next
}

export function updateMixTapeRecordName(id, name) {
  const current = readMixTapeRecords()
  const next = current.map((record) => (record.id === id ? { ...record, name } : record))
  writeMixTapeRecords(next)
  return next
}

export function deleteMixTapeRecord(id) {
  const current = readMixTapeRecords()
  const next = current.filter((record) => record.id !== id)
  writeMixTapeRecords(next)
  return next
}
