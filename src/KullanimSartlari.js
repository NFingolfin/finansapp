function KullanimSartlari({ acik, onKapat }) {
  if (!acik) return null

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onKapat() }}>
      <div style={s.modal}>
        {/* Başlık */}
        <div style={s.header}>
          <div style={s.headerSol}>
            <div style={s.logoCircle}>📋</div>
            <div>
              <div style={s.baslik}>Kullanım Şartları</div>
              <div style={s.altBaslik}>NKode Solutions · Finkod Cüzdan</div>
            </div>
          </div>
          <button style={s.kapat} onClick={onKapat}>✕</button>
        </div>

        {/* İçerik */}
        <div style={s.icerik}>
          <div style={s.guncelleme}>📅 Son güncelleme: Haziran 2026</div>

          <Bolum no="1" baslik="HİZMET TANIMI">
            <p>Finkod Cüzdan, <strong>NKode Solutions</strong> tarafından sunulan kişisel finans takibi
            için tasarlanmış bir web uygulamasıdır. Uygulama, gelir/gider takibi, hesap yönetimi,
            yatırım takibi, borç yönetimi ve tasarruf hedefi belirleme özelliklerini kapsamaktadır.</p>
          </Bolum>

          <Bolum no="2" baslik="KULLANICI YÜKÜMLÜLÜKLERİ">
            <p>Uygulamayı kullanarak aşağıdaki yükümlülükleri kabul etmiş sayılırsınız:</p>
            <SatirListesi items={[
              'Kayıt sırasında doğru ve güncel bilgi sağlamak',
              'Hesap güvenliğini ve şifrenizi korumak; şifrenizi üçüncü kişilerle paylaşmamak',
              'Uygulamayı yalnızca kişisel finans takibi amacıyla kullanmak',
              'Başkalarının hesaplarına veya verilerine erişmeye çalışmamak',
              'Uygulamayı kötü amaçlı yazılım veya zararlı içerik yaymak için kullanmamak',
              'Otomatik araçlar, botlar veya scraper\'lar kullanmamak',
            ]} />
          </Bolum>

          <Bolum no="3" baslik="HİZMET KAPSAMI VE SINIRLAMALARI">
            <SatirListesi items={[
              'Uygulama kişisel finans takibi amacıyla sunulmaktadır',
              'Herhangi bir yatırım tavsiyesi, finansal danışmanlık veya profesyonel hizmet verilmemektedir',
              'Finansal kararlarınızın sorumluluğu tamamen size aittir',
              'Uygulama ticari veya kurumsal amaçlarla kullanılamaz',
              'Uygulama üzerinden üçüncü şahıslar adına işlem yapılamaz',
            ]} />
          </Bolum>

          <Bolum no="4" baslik="VERİ DOĞRULUĞU VE SORUMLULUK">
            <p style={s.vurgu}>
              ⚠️ Uygulamaya girdiğiniz finansal verilerin doğruluğu ve güncelliğinden tamamen siz
              sorumlusunuz. NKode Solutions, yanlış veya eksik veri girişinden kaynaklanabilecek
              finansal kararlar için sorumluluk kabul etmez.
            </p>
          </Bolum>

          <Bolum no="5" baslik="GARANTİ REDDİ">
            <SatirListesi items={[
              'Kesintisiz ve hatasız hizmet garanti edilmemektedir',
              'Bakım, güncelleme veya teknik sorunlar nedeniyle geçici kesintiler yaşanabilir',
              'Veri kaybı durumunda NKode Solutions sorumluluk kabul etmez',
              'Düzenli olarak verilerinizin yedeğini almanız tavsiye edilir',
              'Üçüncü taraf hizmetler (Supabase vb.) kaynaklı kesintilerden sorumluluk kabul edilmez',
            ]} />
          </Bolum>

          <Bolum no="6" baslik="FİKRİ MÜLKİYET">
            <p>Finkod Cüzdan uygulaması, arayüz tasarımı ve kaynak kodu NKode Solutions'a aittir.
            Uygulamanın kopyalanması, dağıtılması veya tersine mühendislik yapılması yasaktır.</p>
          </Bolum>

          <Bolum no="7" baslik="HİZMET DEĞİŞİKLİKLERİ">
            <p>NKode Solutions aşağıdaki hakları saklı tutar:</p>
            <SatirListesi items={[
              'Hizmeti önceden bildirmeksizin değiştirme veya sonlandırma',
              'Kullanım şartlarını güncelleme (bildirim yapılacaktır)',
              'Şartları ihlal eden hesapları askıya alma veya silme',
            ]} />
          </Bolum>

          <Bolum no="8" baslik="HESAP SONLANDIRMA">
            <p>Hesabınızı ve tüm verilerinizi istediğiniz zaman <strong>Hesabım → Hesabımı Sil</strong> seçeneğini
            kullanarak kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.</p>
          </Bolum>

          <Bolum no="9" baslik="UYGULANACAK HUKUK">
            <p>Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Anlaşmazlıklarda Türkiye mahkemeleri yetkilidir.</p>
          </Bolum>

          <div style={s.altBilgi}>
            <strong>NKode Solutions</strong> · Finkod Cüzdan Uygulaması<br />
            Bu şartları kabul ederek uygulamayı kullanmaya devam edebilirsiniz.
          </div>
        </div>

        {/* Alt buton */}
        <div style={s.footer}>
          <button style={s.kapatBtn} onClick={onKapat}>
            ✅ Okudum, Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

function Bolum({ no, baslik, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent, #0d9488)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ background: 'rgba(13,148,136,0.12)', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>{no}</span>
        {baslik}
      </h3>
      <div style={{ color: 'var(--text-secondary, #475569)', fontSize: '14px', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}

function SatirListesi({ items }) {
  return (
    <ul style={{ margin: '8px 0', paddingLeft: '20px', color: 'var(--text-secondary, #475569)', fontSize: '14px', lineHeight: 1.8 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9000, padding: '16px',
  },
  modal: {
    background: 'var(--bg-card, #ffffff)',
    borderRadius: '20px',
    width: '100%', maxWidth: '680px',
    maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
    border: '1px solid var(--border, #e2e8f0)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border, #e2e8f0)',
    background: 'var(--bg-subtle, #f8fafc)',
    flexShrink: 0,
  },
  headerSol: { display: 'flex', alignItems: 'center', gap: '14px' },
  logoCircle: {
    width: 44, height: 44, borderRadius: '12px',
    background: 'rgba(13,148,136,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px', flexShrink: 0,
  },
  baslik: { color: 'var(--text-primary, #0f172a)', fontSize: '17px', fontWeight: '700' },
  altBaslik: { color: 'var(--text-muted, #94a3b8)', fontSize: '12px', marginTop: '2px' },
  kapat: {
    background: 'none', border: 'none',
    color: 'var(--text-muted, #94a3b8)',
    fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
    borderRadius: '8px', lineHeight: 1,
  },
  icerik: {
    flex: 1, overflowY: 'auto',
    padding: '24px',
  },
  guncelleme: {
    color: 'var(--text-muted, #94a3b8)',
    fontSize: '12px', marginBottom: '20px',
    padding: '8px 12px',
    background: 'var(--bg-subtle, #f8fafc)',
    borderRadius: '8px', display: 'inline-block',
  },
  vurgu: {
    background: 'rgba(234,179,8,0.06)',
    border: '1px solid rgba(234,179,8,0.2)',
    borderRadius: '8px', padding: '10px 14px',
    margin: '10px 0', lineHeight: 1.6,
    color: '#92400e',
  },
  altBilgi: {
    marginTop: '24px', padding: '16px',
    background: 'var(--bg-subtle, #f8fafc)',
    borderRadius: '10px',
    color: 'var(--text-muted, #94a3b8)',
    fontSize: '12px', lineHeight: 1.7,
    textAlign: 'center',
    border: '1px solid var(--border, #e2e8f0)',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border, #e2e8f0)',
    background: 'var(--bg-subtle, #f8fafc)',
    flexShrink: 0,
  },
  kapatBtn: {
    width: '100%', padding: '13px',
    background: 'var(--primary)',
    border: 'none', borderRadius: '10px',
    color: '#fff', fontSize: '15px', fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(13,148,136,0.3)',
  },
}

export default KullanimSartlari
