import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [tema, setTema] = useState(() => localStorage.getItem('tema') || 'light')

  useEffect(() => {
    localStorage.setItem('tema', tema)
    document.documentElement.setAttribute('data-tema', tema)
  }, [tema])

  const temaToggle = () => setTema(prev => prev === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ tema, temaToggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTema = () => useContext(ThemeContext)
