import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [mod, setMod] = useState('giris')
  const [mesaj, setMesaj] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  const handleGiris = async () => {
    setYukleniyor(true)
    setMesaj('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) setMesaj('Hata: ' + error.message)
    setYukleniyor(false)
  }

  const handleKayit = async () => {
    setYukleniyor(true)
    setMesaj('')
    const { error } = await supabase.auth.signUp({ email, password: sifre })
    if (error) setMesaj('Hata: ' + error.message)
    else setMesaj('Kayıt başarılı! E-postanı kontrol et ve onaylama linkine tıkla.')
    setYukleniyor(false)
  }

  if (session) {
    return <Dashboard session={session} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.baslik}>💰 FinansApp</h2>
        <p style={styles.altbaslik}>Finansını akıllıca yönet</p>

        <div style={styles.tablar}>
          <button
            style={mod === 'giris' ? styles.tabAktif : styles.tab}
            onClick={() => { setMod('giris'); setMesaj('') }}
          >Giriş Yap</button>
          <button
            style={mod === 'kayit' ? styles.tabAktif : styles.tab}
            onClick={() => { setMod('kayit'); setMesaj('') }}
          >Kayıt Ol</button>
        </div>

        <input
          style={styles.input}
          type="email"
          placeholder="E-posta adresi"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Şifre"
          value={sifre}
          onChange={e => setSifre(e.target.value)}
        />

        {mesaj && <p style={styles.mesaj}>{mesaj}</p>}

        <button
          style={styles.btn}
          onClick={mod === 'giris' ? handleGiris : handleKayit}
          disabled={yukleniyor}
        >
          {yukleniyor ? 'Bekle...' : mod === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', sans-serif"
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '40px',
    width: '360px',
    boxShadow: '0 25px 45px rgba(0,0,0,0.3)'
  },
  baslik: {
    color: '#fff',
    textAlign: 'center',
    fontSize: '28px',
    margin: '0 0 8px 0'
  },
  altbaslik: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: '14px',
    margin: '0 0 24px 0'
  },
  tablar: {
    display: 'flex',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '4px'
  },
  tab: {
    flex: 1,
    padding: '10px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '14px'
  },
  tabAktif: {
    flex: 1,
    padding: '10px',
    border: 'none',
    background: 'rgba(78,204,163,0.2)',
    color: '#4ecca3',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    marginBottom: '12px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #4ecca3, #38b2ac)',
    border: 'none',
    borderRadius: '10px',
    color: '#1a1a2e',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px'
  },
  mesaj: {
    color: '#4ecca3',
    fontSize: '13px',
    textAlign: 'center',
    margin: '8px 0'
  }
}

export default App