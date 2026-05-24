import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import FinkodLogo from './Logo'

/* ---------- Animasyon için CSS (inline style injection) ---------- */
const GLOBAL_CSS = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-18px); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.6; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes drift {
    0% { transform: translate(0, 0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
  }
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lineGrow {
    from { width: 0; }
    to   { width: 64px; }
  }
  .finkod-card { animation: fadeSlideIn 0.6s ease forwards; }
  .finkod-left { animation: fadeSlideIn 0.5s ease 0.1s both; }
`

function injectCSS() {
  if (document.getElementById('finkod-global-css')) return
  const style = document.createElement('style')
  style.id = 'finkod-global-css'
  style.textContent = GLOBAL_CSS
  document.head.appendChild(style)
}

/* ---------- Arka plan parçacıkları ---------- */
const DOTS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1.5 + Math.random() * 2.5,
  delay: Math.random() * 6,
  dur: 5 + Math.random() * 8,
  dx: (Math.random() - 0.5) * 120,
  dy: (Math.random() - 0.5) * 120,
}))

function Background() {
  return (
    <div style={bgStyles.wrap} aria-hidden="true">
      {/* Izgara çizgisi overlay */}
      <div style={bgStyles.grid} />
      {/* Büyük parlak halka */}
      <div style={{ ...bgStyles.glow, top: '30%', left: '18%', width: 420, height: 420, background: 'radial-gradient(circle, rgba(78,204,163,0.12) 0%, transparent 70%)' }} />
      <div style={{ ...bgStyles.glow, top: '60%', left: '55%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(56,178,172,0.09) 0%, transparent 70%)' }} />
      {/* Kayan noktalar */}
      {DOTS.map(d => (
        <div
          key={d.id}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            borderRadius: '50%',
            background: 'rgba(78,204,163,0.55)',
            animation: `drift ${d.dur}s ease-in-out ${d.delay}s infinite`,
            '--dx': `${d.dx}px`,
            '--dy': `${d.dy}px`,
          }}
        />
      ))}
      {/* Yatay dekoratif çizgiler */}
      {[15, 40, 65, 88].map(top => (
        <div key={top} style={{ position: 'absolute', top: `${top}%`, left: 0, right: 0, height: 1, background: 'rgba(78,204,163,0.06)' }} />
      ))}
    </div>
  )
}

const bgStyles = {
  wrap: { position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(78,204,163,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78,204,163,0.04) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
  },
  glow: { position: 'absolute', borderRadius: '50%', filter: 'blur(60px)' },
}

/* ---------- Ana bileşen ---------- */
function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [ad, setAd] = useState('')
  const [soyad, setSoyad] = useState('')
  const [mod, setMod] = useState('giris')
  const [mesaj, setMesaj] = useState('')
  const [mesajTur, setMesajTur] = useState('hata') // 'hata' | 'basari'
  const [yukleniyor, setYukleniyor] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    injectCSS()
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_e, s) => setSession(s))
  }, [])

  useEffect(() => { emailRef.current?.focus() }, [mod])

  const handleGiris = async () => {
    if (!email || !sifre) { setMesajTur('hata'); setMesaj('E-posta ve şifre gerekli.'); return }
    setYukleniyor(true); setMesaj('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) { setMesajTur('hata'); setMesaj('Hata: ' + error.message) }
    setYukleniyor(false)
  }

  const handleKayit = async () => {
    if (!ad.trim()) { setMesajTur('hata'); setMesaj('Ad alanı zorunludur.'); return }
    if (!email || !sifre) { setMesajTur('hata'); setMesaj('E-posta ve şifre gerekli.'); return }
    if (sifre.length < 6) { setMesajTur('hata'); setMesaj('Şifre en az 6 karakter olmalı.'); return }
    setYukleniyor(true); setMesaj('')
    const { data, error } = await supabase.auth.signUp({ email, password: sifre })
    if (error) {
      setMesajTur('hata'); setMesaj('Hata: ' + error.message)
    } else {
      // Profil tablosuna ad/soyad kaydet (trigger boş kayıt oluşturur, biz güncelliyoruz)
      if (data?.user?.id) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          ad: ad.trim(),
          soyad: soyad.trim(),
          updated_at: new Date().toISOString(),
        })
      }
      setMesajTur('basari')
      setMesaj('Kayıt başarılı! E-postanı kontrol et ve onaylama linkine tıkla.')
    }
    setYukleniyor(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') mod === 'giris' ? handleGiris() : handleKayit()
  }

  if (session) return <Dashboard session={session} />

  return (
    <div style={styles.page}>
      <Background />

      {/* ── İki sütunlu layout ── */}
      <div style={styles.layout}>

        {/* SOL: Tanıtım */}
        <div style={styles.left} className="finkod-left">
          {/* Logo */}
          <div style={styles.logoWrap}>
            <FinkodLogo size={48} uid="l" />
            <div>
              <div style={styles.logoText}>Finkod</div>
              <div style={styles.logoSub}>CÜZDAN</div>
            </div>
          </div>

          {/* Ayraç çizgi */}
          <div style={styles.accentLine} />

          {/* Büyük başlık */}
          <h1 style={styles.buyukBaslik}>
            FİNANSAL<br />
            <span style={styles.buyukBaslikVurgu}>CÜZDANINIZ</span>
          </h1>

          <p style={styles.altYazi}>
            Harcamalar ve Portföy<br />
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Tek Noktada</strong>
          </p>

          {/* Özellik fişleri */}
          <div style={styles.fisler}>
            {[
              { ikon: '📊', yazi: 'Gelir & Gider Takibi' },
              { ikon: '📈', yazi: 'Yatırım Portföyü' },
              { ikon: '🎯', yazi: 'Hedef & Borç Planlama' },
            ].map(f => (
              <div key={f.yazi} style={styles.fis}>
                <span style={styles.fisIkon}>{f.ikon}</span>
                <span style={styles.fisYazi}>{f.yazi}</span>
              </div>
            ))}
          </div>

          {/* NKode branding */}
          <div style={styles.nkode}>
            <div style={styles.nkodeDot} />
            <span>NKode Solutions</span>
          </div>
        </div>

        {/* SAĞ: Form kartı */}
        <div style={styles.right}>
          <div style={styles.card} className="finkod-card">
            {/* Kart logo */}
            <div style={styles.cardLogo}>
              <FinkodLogo size={22} uid="c" />
              <span style={styles.cardLogoText}>Finkod <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>Cüzdan</span></span>
            </div>

            <h2 style={styles.cardBaslik}>
              {mod === 'giris' ? 'Hesabına giriş yap' : 'Yeni hesap oluştur'}
            </h2>
            <p style={styles.cardAlt}>
              {mod === 'giris' ? 'Finansal verilerine güvenle eriş.' : 'Ücretsiz, hızlıca başla.'}
            </p>

            {/* Sekmeler */}
            <div style={styles.tabBar}>
              {['giris', 'kayit'].map(t => (
                <button
                  key={t}
                  style={mod === t ? styles.tabAktif : styles.tab}
                  onClick={() => { setMod(t); setMesaj(''); setAd(''); setSoyad('') }}
                >
                  {t === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
                </button>
              ))}
            </div>

            {/* Ad / Soyad — sadece kayıt modunda */}
            {mod === 'kayit' && (
              <div style={styles.adSoyadGrid}>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIkon}>👤</span>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Ad *"
                    value={ad}
                    onChange={e => setAd(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="given-name"
                  />
                </div>
                <div style={styles.inputWrap}>
                  <input
                    style={{ ...styles.input, paddingLeft: '14px' }}
                    type="text"
                    placeholder="Soyad"
                    value={soyad}
                    onChange={e => setSoyad(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="family-name"
                  />
                </div>
              </div>
            )}

            {/* E-posta */}
            <div style={styles.inputWrap}>
              <span style={styles.inputIkon}>✉</span>
              <input
                ref={emailRef}
                style={styles.input}
                type="email"
                placeholder="E-posta adresi"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
              />
            </div>

            <div style={styles.inputWrap}>
              <span style={styles.inputIkon}>🔒</span>
              <input
                style={styles.input}
                type="password"
                placeholder="Şifre"
                value={sifre}
                onChange={e => setSifre(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete={mod === 'giris' ? 'current-password' : 'new-password'}
              />
            </div>

            {mesaj && (
              <div style={mesajTur === 'basari' ? styles.mesajBasari : styles.mesajHata}>
                {mesajTur === 'basari' ? '✅ ' : '⚠ '}{mesaj}
              </div>
            )}

            <button
              style={yukleniyor ? { ...styles.btn, opacity: 0.7 } : styles.btn}
              onClick={mod === 'giris' ? handleGiris : handleKayit}
              disabled={yukleniyor}
            >
              {yukleniyor
                ? <span style={styles.btnSpinner}>⏳ Bekle...</span>
                : mod === 'giris' ? '→  Giriş Yap' : '→  Kayıt Ol'}
            </button>

            <p style={styles.gecisMetni}>
              {mod === 'giris' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
              <button
                style={styles.linkBtn}
                onClick={() => { setMod(mod === 'giris' ? 'kayit' : 'giris'); setMesaj('') }}
              >
                {mod === 'giris' ? 'Kayıt ol' : 'Giriş yap'}
              </button>
            </p>

            {/* Kart alt NKode */}
            <div style={styles.cardNkode}>
              Powered by <strong>NKode Solutions</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────── Stiller ───────────── */
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 55%, #0a1628 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', 'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
    boxSizing: 'border-box',
  },
  layout: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '64px',
    maxWidth: '960px',
    width: '100%',
  },

  /* SOL */
  left: { flex: 1, minWidth: 0 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' },
  logoIcon: {
    width: 48, height: 48, borderRadius: '14px',
    background: 'rgba(78,204,163,0.1)',
    border: '1px solid rgba(78,204,163,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 20px rgba(78,204,163,0.15)',
  },
  logoText: { color: '#4ecca3', fontSize: '22px', fontWeight: 700, lineHeight: 1.1 },
  logoSub: { color: 'rgba(78,204,163,0.55)', fontSize: '10px', letterSpacing: '3px', fontWeight: 600 },
  accentLine: {
    width: 48, height: 3, borderRadius: 2,
    background: 'linear-gradient(90deg, #4ecca3, #38b2ac)',
    marginBottom: '28px',
    animation: 'lineGrow 0.8s ease 0.3s both',
  },
  buyukBaslik: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '42px',
    fontWeight: 800,
    lineHeight: 1.15,
    margin: '0 0 16px 0',
    letterSpacing: '-0.5px',
  },
  buyukBaslikVurgu: {
    background: 'linear-gradient(90deg, #4ecca3, #38b2ac)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  altYazi: { color: 'rgba(255,255,255,0.4)', fontSize: '17px', lineHeight: 1.6, margin: '0 0 32px 0' },
  fisler: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' },
  fis: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', padding: '12px 16px',
  },
  fisIkon: { fontSize: '18px' },
  fisYazi: { color: 'rgba(255,255,255,0.65)', fontSize: '14px' },
  nkode: {
    display: 'flex', alignItems: 'center', gap: '8px',
    color: 'rgba(255,255,255,0.25)', fontSize: '12px', letterSpacing: '0.5px',
  },
  nkodeDot: { width: 6, height: 6, borderRadius: '50%', background: '#4ecca3', opacity: 0.6 },

  /* SAĞ */
  right: { width: '380px', flexShrink: 0 },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderRadius: '24px',
    padding: '36px 32px',
    boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
    maxHeight: '92vh',
    overflowY: 'auto',
  },
  adSoyadGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  cardLogo: {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '24px',
  },
  cardLogoText: { color: '#4ecca3', fontSize: '16px', fontWeight: 700 },
  cardBaslik: { color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' },
  cardAlt: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 20px 0' },
  tabBar: {
    display: 'flex',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px', padding: '4px',
    marginBottom: '20px',
  },
  tab: {
    flex: 1, padding: '9px', border: 'none', background: 'transparent',
    color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
    borderRadius: '7px', fontSize: '13px', transition: 'all 0.2s',
  },
  tabAktif: {
    flex: 1, padding: '9px', border: 'none',
    background: 'rgba(78,204,163,0.18)',
    color: '#4ecca3', cursor: 'pointer',
    borderRadius: '7px', fontSize: '13px', fontWeight: '700',
    boxShadow: '0 0 12px rgba(78,204,163,0.15)',
  },
  inputWrap: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '11px', marginBottom: '12px',
    padding: '0 14px',
    transition: 'border-color 0.2s',
  },
  inputIkon: { fontSize: '14px', marginRight: '8px', opacity: 0.5 },
  input: {
    flex: 1, padding: '13px 0', background: 'transparent',
    border: 'none', color: '#fff', fontSize: '14px',
    outline: 'none',
  },
  mesajHata: {
    background: 'rgba(255,107,107,0.12)',
    border: '1px solid rgba(255,107,107,0.3)',
    borderRadius: '9px', padding: '10px 12px',
    color: '#ff9999', fontSize: '12px', marginBottom: '12px',
    lineHeight: 1.5,
  },
  mesajBasari: {
    background: 'rgba(78,204,163,0.1)',
    border: '1px solid rgba(78,204,163,0.3)',
    borderRadius: '9px', padding: '10px 12px',
    color: '#4ecca3', fontSize: '12px', marginBottom: '12px',
    lineHeight: 1.5,
  },
  btn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #4ecca3 0%, #38b2ac 100%)',
    border: 'none', borderRadius: '11px',
    color: '#0a0f1e', fontSize: '15px', fontWeight: '700',
    cursor: 'pointer', letterSpacing: '0.3px',
    boxShadow: '0 8px 24px rgba(78,204,163,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    marginTop: '4px',
  },
  btnSpinner: { display: 'inline-block' },
  gecisMetni: {
    textAlign: 'center', color: 'rgba(255,255,255,0.35)',
    fontSize: '13px', margin: '16px 0 0 0',
  },
  linkBtn: {
    background: 'none', border: 'none', color: '#4ecca3',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: 0,
  },
  cardNkode: {
    textAlign: 'center', color: 'rgba(255,255,255,0.18)',
    fontSize: '11px', marginTop: '20px', letterSpacing: '0.4px',
  },
}

export default App
