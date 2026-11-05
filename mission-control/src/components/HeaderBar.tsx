import { useEffect, useState } from 'react'
import ScrambleText from './ScrambleText'

interface Props {
  title: string
  status?: React.ReactNode
  onClockTick?: () => void
}

function utc(): string {
  const d = new Date()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}Z`
}

export default function HeaderBar({ title, status }: Props) {
  const [clock, setClock] = useState(utc())

  useEffect(() => {
    const id = setInterval(() => setClock(utc()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    document.title = `NORTAQ // ${title.replace(/\s*\/\/\s*/g, ' / ')}`
  }, [title])

  return (
    <div className="header-bar">
      <span className="header-title"><ScrambleText text={title} /></span>
      <span className="header-status">
        {status}
        <span className="header-clock">{clock}</span>
      </span>
    </div>
  )
}
