import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { UserRound, ShieldCheck, Save, KeyRound, AlertTriangle, Trash2, LoaderCircle } from 'lucide-react'

/* ── Şifre güç hesaplama ── */
function sifreGucu(sifre) {
  let skor = 0
  if (sifre.length >= 6) skor++
  if (sifre.length >= 10) skor++
  if (/[A-Z]/.test(sifre) || /[0-9]/.test(sifre)) skor++
  if (/[^A-Za-z0-9]/.test(sifre)) skor++
  return skor
}
function sifreGucRenk(s) {
  const g = sifreGucu(s)
  if (g <= 1) return '#ef4444'
  if (g === 2) return '#eab308'
  if (g === 3) return '#0d9488'
  return '#0d9488'
}
function sifreGucLabel(s) {
  const g = sifreGucu(s)
  if (g <= 1) return 'Zayıf'
  if (g === 2) return 'Orta'
  if (g === 3) return 'İyi'
  return 'Güçlü'
}

/* ── Mesaj bileşeni ── */
function Mesaj({ tip, metin }) {
  return (
    <div style={{
      background: tip === 'basari' ? 'rgba(13,148,136,0.06)' : 'rgba(239,68,68,0.06)',
      border: `1px solid ${tip === 'basari' ? 'rgba(13,148,136,0.2)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: '10px', padding: '10px 14px',
      color: tip === 'basari' ? '#0d9488' : '#ef4444',
      fontSize: '13px', marginBottom: '16px', lineHeight: 1.5,
    }}>
      {tip === 'basari' ? '✅ ' : '⚠️ '}{metin}
    </div>
  )
}

/* ── Ana bileşen ── */
function Hesabim({ session, onProfilGuncellendi, mobil }) {
  const [ad, setAd] = useState('')
  const [soyad, setSoyad] = useState('')
  const [mevcutSifre, setMevcutSifre] = useState('')
  const [yeniSifre, setYeniSifre] = useState('')
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('')

  const [profilYukleniyor, setProfilYukleniyor] = useState(true)
  const [profilKaydediliyor, setProfilKaydediliyor] = useState(false)
  const [sifreKaydediliyor, setSifreKaydediliyor] = useState(false)
  const [profilMesaj, setProfilMesaj] = useState(null)
  const [sifreMesaj, setSifreMesaj] = useState(null)
  const [siliniyor, setSiliniyor] = useState(false)
  const [silOnayAcik, setSilOnayAcik] = useState(false)
  const [silOnayMetni, setSilOnayMetni] = useState('')

  useEffect(() => { profilGetir() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const profilGetir = async () => {
    setProfilYukleniyor(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('ad, soyad')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setAd(data.ad || '')
      setSoyad(data.soyad || '')
    } else if (error?.code === 'PGRST116') {
      // Satır yok → boş kayıt oluştur
      await supabase.from('profiles').upsert(
        { id: session.user.id, ad: '', soyad: '' },
        { onConflict: 'id' }
      )
    }
    setProfilYukleniyor(false)
  }

  /* Hesabı kalıcı sil */
  const hesabiSil = async () => {
    if (silOnayMetni !== 'SİL') {
      alert('Lütfen onay kutusuna tam olarak "SİL" yazın.')
      return
    }
    setSiliniyor(true)
    const userId = session.user.id
    try {
      await supabase.from('hedef_takip').delete().eq('user_id', userId)
      await supabase.from('hedefler').delete().eq('user_id', userId)
      await supabase.from('islemler').delete().eq('user_id', userId)
      await supabase.from('yatirimlar').delete().eq('user_id', userId)
      await supabase.from('borclar').delete().eq('user_id', userId)
      await supabase.from('hesaplar').delete().eq('user_id', userId)
      await supabase.from('profiles').delete().eq('id', userId)
    } catch (e) {
      console.error('Veri silme hatası:', e)
    }
    await supabase.auth.signOut()
    setSiliniyor(false)
  }

  /* Profil güncelle — upsert kullanılıyor (satır yoksa oluşturur, varsa günceller) */
  const profilGuncelle = async () => {
    if (!ad.trim()) { setProfilMesaj({ tip: 'hata', metin: 'Ad alanı boş olamaz.' }); return }
    setProfilKaydediliyor(true); setProfilMesaj(null)

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        ad: ad.trim(),
        soyad: soyad.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) {
      setProfilMesaj({ tip: 'hata', metin: 'Hata: ' + error.message })
    } else {
      setProfilMesaj({ tip: 'basari', metin: 'Profil bilgileri başarıyla güncellendi.' })
      onProfilGuncellendi?.()   // Dashboard sidebar'ı yenile
    }
    setProfilKaydediliyor(false)
  }

  /* Şifre güncelle */
  const sifreGuncelle = async () => {
    if (!mevcutSifre || !yeniSifre || !yeniSifreTekrar) {
      setSifreMesaj({ tip: 'hata', metin: 'Tüm şifre alanları doldurulmalı.' }); return
    }
    if (yeniSifre !== yeniSifreTekrar) {
      setSifreMesaj({ tip: 'hata', metin: 'Yeni şifreler eşleşmiyor.' }); return
    }
    if (yeniSifre.length < 6) {
      setSifreMesaj({ tip: 'hata', metin: 'Yeni şifre en az 6 karakter olmalı.' }); return
    }
    setSifreKaydediliyor(true); setSifreMesaj(null)

    // Mevcut şifre doğrulama
    const { error: girisHata } = await supabase.auth.signInWithPassword({
      email: session.user.email, password: mevcutSifre,
    })
    if (girisHata) {
      setSifreMesaj({ tip: 'hata', metin: 'Mevcut şifre yanlış.' })
      setSifreKaydediliyor(false); return
    }

    // Yeni şifre uygula
    const { error } = await supabase.auth.updateUser({ password: yeniSifre })
    if (error) {
      setSifreMesaj({ tip: 'hata', metin: 'Hata: ' + error.message })
    } else {
      setSifreMesaj({ tip: 'basari', metin: 'Şifre başarıyla güncellendi.' })
      setMevcutSifre(''); setYeniSifre(''); setYeniSifreTekrar('')
    }
    setSifreKaydediliyor(false)
  }

  if (profilYukleniyor) return <div style={s.yukleniyor}>Yükleniyor...</div>

  return (
    <div style={{ ...s.sayfa, padding: mobil ? '0 2px' : undefined }}>

      {/* ── Kullanıcı bilgi kartı ── */}
      <div style={{ ...s.kullaniciBanner, padding: mobil ? '16px' : '24px 28px' }}>
        <div style={s.avatarDaire}>
          {ad ? ad.charAt(0).toUpperCase() : session.user.email.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={s.bannerAd}>
            {ad ? `${ad} ${soyad}`.trim() : '—'}
          </div>
          <div style={s.bannerEmail}>{session.user.email}</div>
          <div style={s.bannerBadge}>Aktif Hesap</div>
        </div>
      </div>

      {/* ── Profil Bilgileri ── */}
      <div style={{ ...s.panel, padding: mobil ? '18px 16px' : '28px' }}>
        <div style={s.panelHeader}>
          <div style={s.panelIkon}><UserRound size={20}/></div>
          <div>
            <h2 style={s.panelBaslik}>Profil Bilgileri</h2>
            <p style={s.panelAlt}>Ad ve soyadını güncel tut</p>
          </div>
        </div>

        {/* E-posta (salt okunur) */}
        <div style={s.epostaKutu}>
          <span style={s.epostaLabel}>E-posta</span>
          <span style={s.epostaText}>{session.user.email}</span>
          <span style={s.epostaBadge}>Değiştirilemez</span>
        </div>

        <div style={{ ...s.ikiliGrid, gridTemplateColumns: mobil ? '1fr' : '1fr 1fr' }}>
          <div>
            <label style={s.label}>Ad</label>
            <input style={s.input} type="text" placeholder="Adınız"
              value={ad} onChange={e => setAd(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Soyad</label>
            <input style={s.input} type="text" placeholder="Soyadınız"
              value={soyad} onChange={e => setSoyad(e.target.value)} />
          </div>
        </div>

        {profilMesaj && <Mesaj tip={profilMesaj.tip} metin={profilMesaj.metin} />}

        <button
          style={profilKaydediliyor ? s.btnDisabled : s.btn}
          onClick={profilGuncelle}
          disabled={profilKaydediliyor}
        >
          {profilKaydediliyor ? <><LoaderCircle size={15}/> Kaydediliyor...</> : <><Save size={15}/> Profili Kaydet</>}
        </button>
      </div>

      {/* ── Şifre Değiştir ── */}
      <div style={{ ...s.panel, padding: mobil ? '18px 16px' : '28px' }}>
        <div style={s.panelHeader}>
          <div style={s.panelIkon}><ShieldCheck size={20}/></div>
          <div>
            <h2 style={s.panelBaslik}>Şifre Değiştir</h2>
            <p style={s.panelAlt}>Güvenliğin için güçlü bir şifre kullan</p>
          </div>
        </div>

        <label style={s.label}>Mevcut Şifre</label>
        <input
          style={{ ...s.input, marginBottom: '18px' }}
          type="password" placeholder="••••••••"
          value={mevcutSifre}
          onChange={e => setMevcutSifre(e.target.value)}
          autoComplete="current-password"
        />

        <div style={{ ...s.ikiliGrid, gridTemplateColumns: mobil ? '1fr' : '1fr 1fr' }}>
          <div>
            <label style={s.label}>Yeni Şifre</label>
            <input style={s.input} type="password" placeholder="En az 6 karakter"
              value={yeniSifre}
              onChange={e => setYeniSifre(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label style={s.label}>Yeni Şifre Tekrar</label>
            <input style={s.input} type="password" placeholder="••••••••"
              value={yeniSifreTekrar}
              onChange={e => setYeniSifreTekrar(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Şifre gücü göstergesi */}
        {yeniSifre && (
          <div style={s.gucSatir}>
            <span style={s.gucLabel}>Şifre gücü:</span>
            <div style={s.gucBarlar}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  ...s.gucBar,
                  background: sifreGucu(yeniSifre) >= i
                    ? sifreGucRenk(yeniSifre)
                    : '#e2e8f0',
                }} />
              ))}
            </div>
            <span style={{ color: sifreGucRenk(yeniSifre), fontSize: '12px', fontWeight: 600 }}>
              {sifreGucLabel(yeniSifre)}
            </span>
          </div>
        )}

        {/* Eşleşme kontrolü */}
        {yeniSifreTekrar && yeniSifre !== yeniSifreTekrar && (
          <div style={s.eslesmeUyari}>⚠️ Şifreler eşleşmiyor</div>
        )}
        {yeniSifreTekrar && yeniSifre === yeniSifreTekrar && yeniSifre.length >= 6 && (
          <div style={s.eslesmeOk}>✅ Şifreler eşleşiyor</div>
        )}

        {sifreMesaj && <Mesaj tip={sifreMesaj.tip} metin={sifreMesaj.metin} />}

        <button
          style={sifreKaydediliyor ? s.btnDisabled : s.btn}
          onClick={sifreGuncelle}
          disabled={sifreKaydediliyor}
        >
          {sifreKaydediliyor ? <><LoaderCircle size={15}/> Güncelleniyor...</> : <><KeyRound size={15}/> Şifreyi Güncelle</>}
        </button>
      </div>

      {/* ── Tehlikeli Bölge ── */}
      <div style={s.tehlikePanel}>
        <div style={s.panelHeader}>
          <div style={{ ...s.panelIkon, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={20}/>
          </div>
          <div>
            <h2 style={{ ...s.panelBaslik, color: '#ef4444' }}>Tehlikeli Bölge</h2>
            <p style={s.panelAlt}>Bu işlemler geri alınamaz</p>
          </div>
        </div>

        <div style={s.tehlikeIcerik}>
          <div>
            <div style={s.tehlikeBaslik}>Hesabımı Kalıcı Olarak Sil</div>
            <div style={s.tehlikeAlt}>
              Tüm finansal verileriniz, işlemleriniz, yatırımlarınız ve hesap bilgileriniz
              <strong style={{ color: '#ef4444' }}> kalıcı olarak</strong> silinecektir. Bu işlem geri alınamaz.
            </div>
          </div>
          <button style={s.silBtn} onClick={() => setSilOnayAcik(true)}>
            <Trash2 size={15}/> Hesabımı Sil
          </button>
        </div>
      </div>

      {/* ── Onay Modalı ── */}
      {silOnayAcik && (
        <div style={s.overlay}>
          <div style={s.silModal}>
            <div style={s.silModalHeader}>
              <div style={{ fontSize: '32px' }}>⚠️</div>
              <h3 style={s.silModalBaslik}>Hesabı Kalıcı Olarak Sil</h3>
              <p style={s.silModalAlt}>
                Bu işlem <strong style={{ color: '#ef4444' }}>geri alınamaz.</strong> Tüm verileriniz kalıcı olarak silinecektir:
              </p>
              <ul style={s.silListe}>
                {['Tüm hesap bakiyeleri', 'Tüm işlem geçmişi', 'Tüm yatırım kayıtları',
                  'Tüm borç kayıtları', 'Tüm hedefler', 'Profil bilgileri'].map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <div style={s.silOnayGrup}>
                <label style={s.silOnayLabel}>
                  Devam etmek için <strong>"SİL"</strong> yazın:
                </label>
                <input
                  style={s.silOnayInput}
                  value={silOnayMetni}
                  onChange={e => setSilOnayMetni(e.target.value)}
                  placeholder='SİL'
                  autoFocus
                />
              </div>
            </div>
            <div style={s.silModalFooter}>
              <button
                style={s.silIptalBtn}
                onClick={() => { setSilOnayAcik(false); setSilOnayMetni('') }}
                disabled={siliniyor}
              >
                İptal
              </button>
              <button
                style={silOnayMetni !== 'SİL' || siliniyor
                  ? { ...s.silOnayla, opacity: 0.4, cursor: 'not-allowed' }
                  : s.silOnayla}
                onClick={hesabiSil}
                disabled={silOnayMetni !== 'SİL' || siliniyor}
              >
                {siliniyor ? '⏳ Siliniyor...' : '🗑️ Evet, Hesabımı Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const s = {
  sayfa: { maxWidth: '960px' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '60px' },

  /* Kullanıcı banner */
  kullaniciBanner: {
    display: 'flex', alignItems: 'center', gap: '20px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px', padding: '22px 24px', marginBottom: '18px',
  },
  avatarDaire: {
    width: 58, height: 58, borderRadius: '50%',
    background: 'linear-gradient(135deg,#7da8ad,#315f75)',
    color: '#ffffff', fontSize: '24px', fontWeight: '800',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: 'none',
  },
  bannerAd: { color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', marginBottom: '2px' },
  bannerEmail: { color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' },
  bannerBadge: {
    display: 'inline-block',
    background: 'var(--surface-soft)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2px 10px',
    color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600',
  },

  /* Panel */
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px', padding: '24px',
    marginBottom: '18px', boxShadow: 'none',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', gap: '13px',
    paddingBottom: '16px', marginBottom: '18px',
    borderBottom: '1px solid var(--border-light)',
  },
  panelIkon: {
    width: 40, height: 40,
    background: 'var(--surface-soft)', border: '1px solid var(--border)', color: '#285b70',
    borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  panelBaslik: { color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: '0 0 3px 0' },
  panelAlt: { color: 'var(--text-muted)', fontSize: '13px', margin: 0 },

  /* E-posta kutusu */
  epostaKutu: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'var(--surface-soft)', border: '1px solid var(--border)',
    borderRadius: '11px', padding: '11px 16px', marginBottom: '18px',
  },
  epostaLabel: { color: 'var(--text-muted)', fontSize: '12px', minWidth: 52 },
  epostaText: { color: 'var(--text-secondary)', fontSize: '13px', flex: 1 },
  epostaBadge: {
    background: 'var(--bg-subtle)', borderRadius: '6px',
    padding: '2px 8px', color: 'var(--text-muted)', fontSize: '10px',
  },

  /* Form */
  ikiliGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '4px' },
  label: {
    display: 'block', color: 'var(--text-secondary)', fontSize: '11px',
    fontWeight: '600', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '7px',
  },
  input: {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: '11px', color: 'var(--text-primary)', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', marginBottom: '14px',
  },

  /* Şifre güç */
  gucSatir: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  gucLabel: { color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' },
  gucBarlar: { display: 'flex', gap: '4px' },
  gucBar: { width: 30, height: 4, borderRadius: 2, transition: 'background 0.3s' },

  eslesmeUyari: { color: '#ef4444', fontSize: '12px', marginBottom: '12px' },
  eslesmeOk: { color: '#0d9488', fontSize: '12px', marginBottom: '12px' },

  /* Buton */
  btn: {
    padding: '13px 28px',
    background: '#234f68', border: 'none', borderRadius: '9px',
    color: '#ffffff', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', boxShadow: 'none', display: 'inline-flex', alignItems: 'center', gap: '7px',
  },
  btnDisabled: {
    padding: '13px 28px',
    background: 'rgba(13,148,136,0.15)', border: 'none', borderRadius: '11px',
    color: 'rgba(13,148,136,0.4)', fontSize: '14px', fontWeight: '700', cursor: 'not-allowed',
  },

  /* Tehlikeli Bölge */
  tehlikePanel: {
    background: 'var(--bg-card)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '14px', padding: '24px',
    marginBottom: '20px',
    boxShadow: 'none',
  },
  tehlikeIcerik: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: '20px', flexWrap: 'wrap',
    padding: '16px',
    background: 'var(--surface-soft)',
    border: '1px solid rgba(239,68,68,0.12)',
    borderRadius: '12px',
  },
  tehlikeBaslik: {
    color: '#ef4444', fontSize: '15px', fontWeight: '600', marginBottom: '6px',
  },
  tehlikeAlt: {
    color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, maxWidth: '480px',
  },
  silBtn: {
    padding: '11px 22px',
    background: 'var(--surface)', border: '1px solid rgba(217,83,95,.35)', borderRadius: '9px',
    color: 'var(--danger)', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '7px',
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    boxShadow: 'none',
  },

  /* Silme onay modalı */
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9000, padding: '20px',
  },
  silModal: {
    background: 'var(--bg-card)',
    borderRadius: '20px',
    width: '100%', maxWidth: '440px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
    border: '1px solid rgba(239,68,68,0.25)',
    overflow: 'hidden',
  },
  silModalHeader: {
    padding: '28px 28px 20px',
    textAlign: 'center',
  },
  silModalBaslik: {
    color: '#ef4444', fontSize: '18px', fontWeight: '700',
    margin: '12px 0 8px',
  },
  silModalAlt: {
    color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6,
    margin: '0 0 14px',
  },
  silListe: {
    textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px',
    lineHeight: 1.8, paddingLeft: '20px',
    margin: '0 0 20px',
    background: 'rgba(239,68,68,0.04)',
    borderRadius: '8px', padding: '12px 12px 12px 28px',
    border: '1px solid rgba(239,68,68,0.1)',
  },
  silOnayGrup: { marginTop: '4px' },
  silOnayLabel: {
    display: 'block', color: 'var(--text-secondary)', fontSize: '13px',
    marginBottom: '8px',
  },
  silOnayInput: {
    width: '100%', padding: '11px 14px',
    background: 'var(--bg-input)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px',
    fontWeight: '700', letterSpacing: '2px', textAlign: 'center',
    outline: 'none', boxSizing: 'border-box',
  },
  silModalFooter: {
    display: 'flex', gap: '12px', padding: '16px 28px 24px',
  },
  silIptalBtn: {
    flex: 1, padding: '12px',
    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
    borderRadius: '10px', color: 'var(--text-secondary)',
    fontSize: '14px', cursor: 'pointer',
  },
  silOnayla: {
    flex: 2, padding: '12px',
    background: '#ef4444', border: 'none',
    borderRadius: '10px', color: '#fff',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
  },
}

export default Hesabim
