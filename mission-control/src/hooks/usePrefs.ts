import { useCallback, useState } from 'react'
import { getPref, setPref, removePref, exportPrefs, importPrefs } from '../prefs/store'

export function usePrefs() {
  const get = useCallback(<T,>(key: string, defaultValue: T): T => getPref<T>(key, defaultValue), [])
  const set = useCallback(<T,>(key: string, value: T): void => setPref<T>(key, value), [])
  const remove = useCallback((key: string): void => removePref(key), [])
  return { get, set, remove, export: exportPrefs, import: importPrefs }
}

export function usePref<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => getPref<T>(key, defaultValue))
  const set = useCallback((v: T) => {
    setPref<T>(key, v)
    setValue(v)
  }, [key])
  return [value, set]
}
