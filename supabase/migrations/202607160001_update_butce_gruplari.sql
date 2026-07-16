-- Bütçe gruplarını uygulamadaki güncel sınıflandırmayla hizala.
alter table public.kategoriler
drop constraint if exists kategoriler_butce_grubu_check;

-- Migration daha önce veri bulunan bir ortamda da güvenle çalışabilsin.
update public.kategoriler
set butce_grubu = case butce_grubu
  when 'İhtiyaç' then 'Zaruri'
  when 'İstek' then 'Keyfi'
  when 'Birikim' then 'Yatırım'
  when 'Borç Azaltma' then 'Borç Ödeme'
  else butce_grubu
end
where butce_grubu in ('İhtiyaç', 'İstek', 'Birikim', 'Borç Azaltma');

alter table public.kategoriler
add constraint kategoriler_butce_grubu_check
check (
  butce_grubu is null or butce_grubu in (
    'Gelir',
    'Zaruri',
    'Keyfi',
    'Yatırım',
    'Borç Ödeme',
    'Transfer',
    'Diğer'
  )
);
