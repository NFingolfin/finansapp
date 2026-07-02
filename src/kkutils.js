// Kredi kartı kesim / son ödeme tarihi hesaplamaları
// Tüm dosyalarda (Islemler.js, Borclar.js) AYNI mantık kullanılmalı.
//
// Kural:
// - İşlem, kesim gününde veya öncesinde yapılmışsa O AYIN kesim dönemine girer.
// - İşlem, kesim gününden SONRA yapılmışsa BİR SONRAKİ AYIN kesim dönemine girer.
// - Son ödeme tarihi = kesim tarihi + 10 gün (sabit takvim günü, ay içi gün değil).

// Belirli bir tarih için, o tarihin ait olduğu kesim tarihini hesaplar.
export function kesimTarihiHesapla(tarih, kesimGunu) {
  const t = new Date(tarih)
  let kesim = new Date(t)
  kesim.setDate(kesimGunu)
  if (t.getDate() > kesimGunu) {
    kesim.setMonth(kesim.getMonth() + 1)
  }
  return kesim
}

// Kesim tarihinden son ödeme tarihini hesaplar (kesim + 10 gün).
export function sonOdemeHesapla(kesimTarihi) {
  const sonOdeme = new Date(kesimTarihi)
  sonOdeme.setDate(sonOdeme.getDate() + 10)
  return sonOdeme
}

// Bir işlem tarihinden direkt son ödeme tarihini hesaplar.
export function islemdenSonOdemeHesapla(tarih, kesimGunu) {
  const kesim = kesimTarihiHesapla(tarih, kesimGunu)
  return sonOdemeHesapla(kesim)
}

// Son ödeme tarihinden, bu dönemin başlangıç ve bitiş (kesim) tarihlerini geri hesaplar.
// Dönem: (önceki kesim tarihi + 1 gün)  ...  (bu dönemin kesim tarihi)
export function donemAraligiHesapla(sonOdemeTarihi) {
  const kesim = new Date(sonOdemeTarihi)
  kesim.setDate(kesim.getDate() - 10)
  const oncekiKesim = new Date(kesim)
  oncekiKesim.setMonth(oncekiKesim.getMonth() - 1)
  const donemBaslangic = new Date(oncekiKesim)
  donemBaslangic.setDate(donemBaslangic.getDate() + 1)
  return { donemBaslangic, donemBitis: kesim }
}

export function tarihStr(d) {
  return new Date(d).toISOString().split('T')[0]
}

export function borcAdiOlustur(bankaAdi, sonOdemeTarihi) {
  return `${bankaAdi} - ${new Date(sonOdemeTarihi).toLocaleDateString('tr-TR')}`
}