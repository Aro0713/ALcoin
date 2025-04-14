'use client'

import { useState, useEffect, FC } from 'react'

const flags = {
  PL: '🇵🇱',
  EN: '🇬🇧',
  UA: '🇺🇦',
}

type LanguageCode = keyof typeof flags

const LanguageSwitcher: FC = () => {
  const [lang, setLang] = useState<LanguageCode>('PL')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as LanguageCode
    if (stored && flags[stored]) {
      setLang(stored)
    }
  }, [])

  const changeLanguage = (lng: LanguageCode) => {
    setLang(lng)
    localStorage.setItem('lang', lng)
    window.location.reload()
  }

  return (
    <div className="flex gap-2">
      {Object.keys(flags).map((lng) => (
        <button
          key={lng}
          onClick={() => changeLanguage(lng as LanguageCode)}
          className={`text-xl ${
            lang === lng ? 'font-bold scale-110' : 'opacity-50'
          }`}
        >
          {flags[lng as LanguageCode]}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitcher
