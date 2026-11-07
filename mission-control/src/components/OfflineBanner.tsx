import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false))
  useEffect(() => {
    const onOff = () => setOffline(true)
    const onOn = () => setOffline(false)
    window.addEventListener('offline', onOff)
    window.addEventListener('online', onOn)
    return () => {
      window.removeEventListener('offline', onOff)
      window.removeEventListener('online', onOn)
    }
  }, [])
  if (!offline) return null
  return (
    <div role="alert" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000, padding: '0.4rem', textAlign: 'center', background: 'var(--red, #ff4d4d)', color: '#fff', fontSize: '0.7rem', letterSpacing: '0.15em' }}>
      OFFLINE // NO NETWORK
    </div>
  )
}
