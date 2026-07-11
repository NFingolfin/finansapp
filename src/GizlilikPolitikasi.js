function GizlilikPolitikasi({ acik, onKapat }) {
  if (!acik) return null

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onKapat() }}>
      <div style={s.modal}>
        {/* Başlık */}
        <div style={s.header}>
          <div style={s.headerSol}>
            <div style={s.logoCircle}>🛡️</div>
            <div>
              <div style={s.baslik}>Gizlilik Politikası</div>
              <div style={s.altBaslik}>NKode Solutions · Finkod Cüzdan</div>
            </div>
          </div>
          <button style={s.kapat} onClick={onKapat}>✕</button>
        </div>

        {/* İçerik */}
        <div style={s.icerik}>
          <div style={s.guncelleme}>📅 Son güncelleme: Haziran 2026</div>

          <Bolum no="1" baslik="VERİ SORUMLUSU">
            <p>NKode Solutions olarak kişisel verilerinizin güvenliği konusunda azami hassasiyet göstermekteyiz.
            6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) Madde 10 kapsamında, veri sahibi olarak
            sizi aydınlatmakla yükümlüyüz.</p>
          </Bolum>

          <Bolum no="2" baslik="TOPLANAN VERİLER">
            <SatirListesi items={[
              'Kimlik bilgileri: Ad, soyad, e-posta adresi',
              'Finansal veriler: Hesap bakiyeleri, gelir/gider işlemleri, yatırım bilgileri, borç kayıtları, tasarruf hedefleri',
              'Kullanım verileri: Uygulama içi işlem geçmişi ve tercihler',
              'Teknik veriler: Oturum bilgileri (Supabase Auth tarafından yönetilir)',
            ]} />
          </Bolum>

          <Bolum no="3" baslik="VERİLERİN İŞLENME AMACI">
            <p>Verileriniz yalnızca aşağıdaki amaçlarla işlenmektedir:</p>
            <SatirListesi items={[
              'Kişisel finans takip hizmeti sunmak',
              'Hesap kimlik doğrulaması yapmak',
              'Uygulama özelliklerini kişiselleştirmek',
              'Teknik destek sağlamak',
            ]} />
            <p style={s.vurgu}>
              ⚠️ Verileriniz reklam, pazarlama veya profil oluşturma amacıyla kesinlikle kullanılmamaktadır.
            </p>
          </Bolum>

          <Bolum no="4" baslik="VERİLERİN SAKLANMASI">
            <p>Verileriniz <strong>Supabase</strong> altyapısında <strong>Avrupa (İrlanda, AWS eu-west-1)</strong> sunucularında
            saklanmaktadır. Supabase, SOC 2 Type 2 sertifikalı bir altyapı sağlayıcısıdır.</p>
            <SatirListesi items={[
              'Tüm veriler aktarım sırasında SSL/TLS şifreleme ile korunur',
              'Veriler depolamada AES-256 şifreleme ile saklanır',
              'Her kullanıcı yalnızca kendi verilerine erişebilir (Row Level Security)',
            ]} />
          </Bolum>

          <Bolum no="5" baslik="ÜÇÜNCÜ TARAFLARLA PAYLAŞIM">
            <p style={s.vurgu}>
              🔒 Kişisel verileriniz <strong>hiçbir üçüncü tarafla, reklam ağıyla veya analitik hizmetiyle
              paylaşılmamaktadır.</strong> Supabase, teknik altyapı sağlayıcısı olarak yalnızca veri depolama
              hizmeti sunmaktadır.
            </p>
          </Bolum>

          <Bolum no="6" baslik="VERİ GÜVENLİĞİ">
            <SatirListesi items={[
              'SSL/TLS şifreleme ile güvenli aktarım',
              'Row Level Security (RLS) — her kullanıcı yalnızca kendi verilerine erişir',
              'Supabase Auth ile güvenli kimlik doğrulama',
              'Şifreler hiçbir zaman düz metin olarak saklanmaz',
            ]} />
          </Bolum>

          <Bolum no="7" baslik="HAKLARINIZ (KVKK Madde 11)">
            <p>6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
            <SatirListesi items={[
              'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
              'İşlenmişse buna ilişkin bilgi talep etme',
              'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme',
              'Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme',
              'Eksik veya yanlış işlenmişse düzeltilmesini isteme',
              'Silinmesini veya yok edilmesini isteme',
              'İşlemeye itiraz etme hakkı',
            ]} />
            <p>Haklarınızı kullanmak için <strong>Hesabım → Hesabımı Sil</strong> seçeneğini kullanabilirsiniz.
            Bu işlem tüm verilerinizi kalıcı olarak siler.</p>
          </Bolum>

          <Bolum no="8" baslik="VERİ SAKLAMA SÜRESİ">
            <p>Verileriniz hesabınızı silene kadar saklanır. Hesap silme işlemi ile birlikte tüm
            kişisel verileriniz kalıcı olarak silinir ve bu işlem geri alınamaz.</p>
          </Bolum>

          <Bolum no="9" baslik="ÇEREZLER VE YEREL DEPOLAMA">
            <p>Uygulama yalnızca zorunlu işlevsellik için tarayıcı localStorage'ını kullanır
            (oturum bilgileri, tema ve dil tercihleri). Reklam veya izleme çerezi kullanılmamaktadır.</p>
          </Bolum>

          <Bolum no="10" baslik="POLİTİKA DEĞİŞİKLİKLERİ">
            <p>Bu politika güncellendiğinde uygulama içinde bildirim yapılacaktır.
            Değişiklikler yayınlandığı tarihten itibaren geçerlidir.</p>
          </Bolum>

          <div style={s.altBilgi}>
            <strong>NKode Solutions</strong> · Finkod Cüzdan Uygulaması<br />
            KVKK Madde 10 kapsamında Aydınlatma Yükümlülüğü
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
    background: 'rgba(13,148,136,0.06)',
    border: '1px solid rgba(13,148,136,0.15)',
    borderRadius: '8px', padding: '10px 14px',
    margin: '10px 0', lineHeight: 1.6,
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

export default GizlilikPolitikasi
