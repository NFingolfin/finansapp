import { createContext, useContext, useState } from 'react'

const LangContext = createContext()

export const çeviriler = {
  tr: {
    /* Menü */
    genelOzet: 'Genel Özet', hesaplar: 'Hesaplar', islemler: 'İşlemler',
    yatirimlar: 'Yatırımlar', hedefler: 'Hedefler', borclar: 'Borçlar',
    raporlar: 'Raporlar', hesabim: 'Hesabım', cikisYap: 'Çıkış Yap',
    /* Özet kartlar */
    toplamVarlik: 'Toplam Varlık', toplamNakit: 'Toplam Nakit',
    toplamYatirim: 'Toplam Yatırım', toplamBorc: 'Toplam Borç', netVarlik: 'Net Varlık',
    /* Butonlar */
    yeniIslemEkle: '+ Yeni İşlem Ekle', yeniHesapEkle: '+ Yeni Hesap Ekle',
    kaydet: 'Kaydet', iptal: 'İptal', sil: 'Sil', duzenle: 'Düzenle', guncelle: 'Güncelle',
    /* Auth */
    girisYap: 'Giriş Yap', kayitOl: 'Kayıt Ol',
    /* İşlemler */
    toplamGelir: 'Toplam Gelir', toplamGider: 'Toplam Gider', net: 'Net', transfer: 'Transfer',
    gelir: 'Gelir', gider: 'Gider', tumIslemler: 'Tümü',
    yeniIslem: 'Yeni İşlem Ekle', islemTuru: 'İşlem Türü',
    tarih: 'Tarih', hesap: 'Hesap', tutar: 'Tutar (₺)', kategori: 'Kategori',
    aciklama: 'Açıklama (isteğe bağlı)',
    /* Genel */
    yukleniyor: 'Yükleniyor...', kaydediliyor: 'Kaydediliyor...',
    hicIslemYok: 'Henüz işlem yok.', hicHesapYok: 'Henüz hesap yok.',
    sonIslemler: 'Son İşlemler', hesapBakiyeleri: 'Hesap Bakiyeleri',
    /* Hesaplar */
    hesapAdi: 'Hesap Adı', hesapTuru: 'Hesap Türü', guncelBakiye: 'Güncel Bakiye',
    paraBirimi: 'Para Birimi', yeniHesap: 'Yeni Hesap Ekle',
    toplamVarlikTRY: 'Toplam Varlık (TRY)', netDurum: 'Net Durum', hesapSayisi: 'Hesap Sayısı',
    /* Yatırımlar */
    toplamMaliyet: 'Toplam Maliyet', guncelDeger: 'Güncel Değer', karZarar: 'Kar / Zarar',
    toplamGetiri: 'Toplam Getiri', yeniYatirim: 'Yeni Yatırım Ekle',
    fiyatlariGuncelle: '🔄 Fiyatları Güncelle',
    /* Borçlar */
    toplamKalanBorc: 'Toplam Kalan Borç', aylikToplamOdeme: 'Aylık Toplam Ödeme',
    buAyOdenecek: 'Bu Ay Ödenecek', kritikBorc: '7 Günde Vadesi Gelen',
    yeniBorc: '+ Yeni Borç Ekle',
    /* Raporlar */
    raporDonemi: 'Rapor dönemi:', aylikGelir: 'Aylık Gelir', aylikGider: 'Aylık Gider',
    netAkis: 'Net Akış', tasarrufOrani: 'Tasarruf Oranı',
    /* Hedefler */
    hedefEkle: '+ Hedef Ekle',
    /* Gizlilik */
    degerleriGizle: '🙈 Değerleri Gizle', degerleriGoster: '👁️ Değerleri Göster',
  },
  en: {
    /* Menu */
    genelOzet: 'Overview', hesaplar: 'Accounts', islemler: 'Transactions',
    yatirimlar: 'Investments', hedefler: 'Goals', borclar: 'Debts',
    raporlar: 'Reports', hesabim: 'My Account', cikisYap: 'Sign Out',
    /* Summary cards */
    toplamVarlik: 'Total Assets', toplamNakit: 'Total Cash',
    toplamYatirim: 'Total Investments', toplamBorc: 'Total Debt', netVarlik: 'Net Worth',
    /* Buttons */
    yeniIslemEkle: '+ Add Transaction', yeniHesapEkle: '+ Add Account',
    kaydet: 'Save', iptal: 'Cancel', sil: 'Delete', duzenle: 'Edit', guncelle: 'Update',
    /* Auth */
    girisYap: 'Sign In', kayitOl: 'Sign Up',
    /* Transactions */
    toplamGelir: 'Total Income', toplamGider: 'Total Expense', net: 'Net', transfer: 'Transfer',
    gelir: 'Income', gider: 'Expense', tumIslemler: 'All',
    yeniIslem: 'Add Transaction', islemTuru: 'Transaction Type',
    tarih: 'Date', hesap: 'Account', tutar: 'Amount (₺)', kategori: 'Category',
    aciklama: 'Description (optional)',
    /* General */
    yukleniyor: 'Loading...', kaydediliyor: 'Saving...',
    hicIslemYok: 'No transactions yet.', hicHesapYok: 'No accounts yet.',
    sonIslemler: 'Recent Transactions', hesapBakiyeleri: 'Account Balances',
    /* Accounts */
    hesapAdi: 'Account Name', hesapTuru: 'Account Type', guncelBakiye: 'Current Balance',
    paraBirimi: 'Currency', yeniHesap: 'Add New Account',
    toplamVarlikTRY: 'Total Assets (TRY)', netDurum: 'Net Balance', hesapSayisi: 'No. of Accounts',
    /* Investments */
    toplamMaliyet: 'Total Cost', guncelDeger: 'Current Value', karZarar: 'Profit / Loss',
    toplamGetiri: 'Total Return', yeniYatirim: 'Add Investment',
    fiyatlariGuncelle: '🔄 Update Prices',
    /* Debts */
    toplamKalanBorc: 'Total Remaining Debt', aylikToplamOdeme: 'Monthly Total Payment',
    buAyOdenecek: 'Due This Month', kritikBorc: 'Due in 7 Days',
    yeniBorc: '+ Add Debt',
    /* Reports */
    raporDonemi: 'Report period:', aylikGelir: 'Monthly Income', aylikGider: 'Monthly Expense',
    netAkis: 'Net Flow', tasarrufOrani: 'Savings Rate',
    /* Goals */
    hedefEkle: '+ Add Goal',
    /* Privacy */
    degerleriGizle: '🙈 Hide Values', degerleriGoster: '👁️ Show Values',
  }
}

export const LangProvider = ({ children }) => {
  const [dil, setDil] = useState(() => localStorage.getItem('dil') || 'tr')
  const dilDegistir = (yeniDil) => { setDil(yeniDil); localStorage.setItem('dil', yeniDil) }
  const t = (key) => çeviriler[dil]?.[key] ?? key

  return (
    <LangContext.Provider value={{ dil, dilDegistir, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
