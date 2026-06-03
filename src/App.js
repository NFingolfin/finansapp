import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import FinkodLogo from './Logo'
import GizlilikPolitikasi from './GizlilikPolitikasi'
import KullanimSartlari from './KullanimSartlari'

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
      <div style={{ ...bgStyles.glow, top: '30%', left: '18%', width: 420, height: 420, background: 'radial-gradient(circle, rgba(13,148,136,0.07) 0%, transparent 70%)' }} />
      <div style={{ ...bgStyles.glow, top: '60%', left: '55%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 70%)' }} />
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
            background: 'rgba(13,148,136,0.18)',
            animation: `drift ${d.dur}s ease-in-out ${d.delay}s infinite`,
            '--dx': `${d.dx}px`,
            '--dy': `${d.dy}px`,
          }}
        />
      ))}
      {/* Yatay dekoratif çizgiler */}
      {[15, 40, 65, 88].map(top => (
        <div key={top} style={{ position: 'absolute', top: `${top}%`, left: 0, right: 0, height: 1, background: 'rgba(13,148,136,0.04)' }} />
      ))}
    </div>
  )
}

const bgStyles = {
  wrap: { position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(13,148,136,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(13,148,136,0.04) 1px, transparent 1px)
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
  const [kvkkOnay, setKvkkOnay] = useState(false)
  const [sartlarOnay, setSartlarOnay] = useState(false)
  const [gizlilikAcik, setGizlilikAcik] = useState(false)
  const [sartlarAcik, setSartlarAcik] = useState(false)
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
          kvkk_onay: true,
          kvkk_onay_tarihi: new Date().toISOString(),
          sartlar_onay: true,
          sartlar_onay_tarihi: new Date().toISOString(),
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

  // Modal'ları session yokken da render et
  const modals = (
    <>
      <GizlilikPolitikasi acik={gizlilikAcik} onKapat={() => setGizlilikAcik(false)} />
      <KullanimSartlari acik={sartlarAcik} onKapat={() => setSartlarAcik(false)} />
    </>
  )

  return (
    <div style={styles.page}>
      {modals}
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
            <strong style={{ color: '#0f172a' }}>Tek Noktada</strong>
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
              <span style={styles.cardLogoText}>Finkod <span style={{ color: '#94a3b8', fontWeight: 400 }}>Cüzdan</span></span>
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
                  onClick={() => { setMod(t); setMesaj(''); setEmail(''); setSifre(''); setAd(''); setSoyad(''); setKvkkOnay(false); setSartlarOnay(false) }}
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

            {/* Onay kutuları — sadece kayıt modunda */}
            {mod === 'kayit' && (
              <div style={styles.onayKutusu}>
                <label style={styles.onayLabel}>
                  <input
                    type="checkbox"
                    checked={kvkkOnay}
                    onChange={e => setKvkkOnay(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={styles.onayMetin}>
                    <button style={styles.onayLink} onClick={() => setGizlilikAcik(true)}>
                      Gizlilik Politikası
                    </button>
                    'nı ve KVKK kapsamında verilerimin işlenmesini okudum, anladım ve kabul ediyorum.
                  </span>
                </label>
                <label style={styles.onayLabel}>
                  <input
                    type="checkbox"
                    checked={sartlarOnay}
                    onChange={e => setSartlarOnay(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={styles.onayMetin}>
                    <button style={styles.onayLink} onClick={() => setSartlarAcik(true)}>
                      Kullanım Şartları
                    </button>
                    'nı okudum ve kabul ediyorum.
                  </span>
                </label>
              </div>
            )}

            {mesaj && (
              <div style={mesajTur === 'basari' ? styles.mesajBasari : styles.mesajHata}>
                {mesajTur === 'basari' ? '✅ ' : '⚠ '}{mesaj}
              </div>
            )}

            <button
              style={(yukleniyor || (mod === 'kayit' && (!kvkkOnay || !sartlarOnay)))
                ? { ...styles.btn, opacity: 0.5, cursor: 'not-allowed' }
                : styles.btn}
              onClick={mod === 'giris' ? handleGiris : handleKayit}
              disabled={yukleniyor || (mod === 'kayit' && (!kvkkOnay || !sartlarOnay))}
            >
              {yukleniyor
                ? <span style={styles.btnSpinner}>⏳ Bekle...</span>
                : mod === 'giris' ? '→  Giriş Yap' : '→  Kayıt Ol'}
            </button>

            <p style={styles.gecisMetni}>
              {mod === 'giris' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
              <button
                style={styles.linkBtn}
                onClick={() => { setMod(mod === 'giris' ? 'kayit' : 'giris'); setMesaj(''); setEmail(''); setSifre(''); setAd(''); setSoyad(''); setKvkkOnay(false); setSartlarOnay(false) }}
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
    background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 50%, #f0f9ff 100%)',
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
    background: 'rgba(13,148,136,0.08)',
    border: '1px solid rgba(13,148,136,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#0d9488', fontSize: '22px', fontWeight: 700, lineHeight: 1.1 },
  logoSub: { color: 'rgba(13,148,136,0.6)', fontSize: '10px', letterSpacing: '3px', fontWeight: 600 },
  accentLine: {
    width: 48, height: 3, borderRadius: 2,
    background: 'linear-gradient(90deg, #0d9488, #0ea5e9)',
    marginBottom: '28px',
    animation: 'lineGrow 0.8s ease 0.3s both',
  },
  buyukBaslik: {
    color: '#0f172a',
    fontSize: '42px',
    fontWeight: 800,
    lineHeight: 1.15,
    margin: '0 0 16px 0',
    letterSpacing: '-0.5px',
  },
  buyukBaslikVurgu: {
    background: 'linear-gradient(90deg, #0d9488, #0ea5e9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  altYazi: { color: '#64748b', fontSize: '17px', lineHeight: 1.6, margin: '0 0 32px 0' },
  fisler: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' },
  fis: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'rgba(255,255,255,0.8)',
    border: '1px solid #e2e8f0',
    borderRadius: '10px', padding: '12px 16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  fisIkon: { fontSize: '18px' },
  fisYazi: { color: '#475569', fontSize: '14px' },
  nkode: {
    display: 'flex', alignItems: 'center', gap: '8px',
    color: '#94a3b8', fontSize: '12px', letterSpacing: '0.5px',
  },
  nkodeDot: { width: 6, height: 6, borderRadius: '50%', background: '#0d9488', opacity: 0.6 },

  /* SAĞ */
  right: { width: '380px', flexShrink: 0 },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '24px',
    padding: '36px 32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
    maxHeight: '92vh',
    overflowY: 'auto',
  },
  adSoyadGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
  },
  cardLogo: {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '24px',
  },
  cardLogoText: { color: '#0d9488', fontSize: '16px', fontWeight: 700 },
  cardBaslik: { color: '#0f172a', fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' },
  cardAlt: { color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' },
  tabBar: {
    display: 'flex',
    background: '#f1f5f9',
    borderRadius: '10px', padding: '4px',
    marginBottom: '20px',
  },
  tab: {
    flex: 1, padding: '9px', border: 'none', background: 'transparent',
    color: '#94a3b8', cursor: 'pointer',
    borderRadius: '7px', fontSize: '13px', transition: 'all 0.2s',
  },
  tabAktif: {
    flex: 1, padding: '9px', border: 'none',
    background: 'rgba(13,148,136,0.1)',
    color: '#0d9488', cursor: 'pointer',
    borderRadius: '7px', fontSize: '13px', fontWeight: '700',
  },
  inputWrap: {
    display: 'flex', alignItems: 'center',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '11px', marginBottom: '12px',
    padding: '0 14px',
    transition: 'border-color 0.2s',
  },
  inputIkon: { fontSize: '14px', marginRight: '8px', opacity: 0.4, color: '#64748b' },
  input: {
    flex: 1, padding: '13px 0', background: 'transparent',
    border: 'none', color: '#0f172a', fontSize: '14px',
    outline: 'none',
  },
  mesajHata: {
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '9px', padding: '10px 12px',
    color: '#ef4444', fontSize: '12px', marginBottom: '12px',
    lineHeight: 1.5,
  },
  mesajBasari: {
    background: 'rgba(13,148,136,0.06)',
    border: '1px solid rgba(13,148,136,0.2)',
    borderRadius: '9px', padding: '10px 12px',
    color: '#0d9488', fontSize: '12px', marginBottom: '12px',
    lineHeight: 1.5,
  },
  btn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #0d9488 0%, #0ea5e9 100%)',
    border: 'none', borderRadius: '11px',
    color: '#ffffff', fontSize: '15px', fontWeight: '700',
    cursor: 'pointer', letterSpacing: '0.3px',
    boxShadow: '0 6px 20px rgba(13,148,136,0.25)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    marginTop: '4px',
  },
  btnSpinner: { display: 'inline-block' },
  gecisMetni: {
    textAlign: 'center', color: '#94a3b8',
    fontSize: '13px', margin: '16px 0 0 0',
  },
  linkBtn: {
    background: 'none', border: 'none', color: '#0d9488',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: 0,
  },
  cardNkode: {
    textAlign: 'center', color: '#cbd5e1',
    fontSize: '11px', marginTop: '20px', letterSpacing: '0.4px',
  },
  onayKutusu: {
    display: 'flex', flexDirection: 'column', gap: '10px',
    marginBottom: '14px',
    padding: '14px',
    background: 'rgba(13,148,136,0.04)',
    border: '1px solid rgba(13,148,136,0.15)',
    borderRadius: '10px',
  },
  onayLabel: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: '2px', flexShrink: 0,
    width: '16px', height: '16px',
    accentColor: '#0d9488', cursor: 'pointer',
  },
  onayMetin: {
    color: '#64748b', fontSize: '12px', lineHeight: 1.5,
  },
  onayLink: {
    background: 'none', border: 'none',
    color: '#0d9488', cursor: 'pointer',
    fontSize: '12px', fontWeight: '600', padding: 0,
    textDecoration: 'underline', textDecorationColor: 'rgba(13,148,136,0.4)',
  },
}

export default App
