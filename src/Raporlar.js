import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness,
  CalendarDays, CheckCircle2, ChevronLeft, CircleDollarSign, CreditCard,
  Filter, Layers3, Lightbulb, PiggyBank, RotateCcw, TrendingUp,
  WalletCards, X
} from 'lucide-react'

const COLORS = ['#173d5c', '#28657a', '#3e8290', '#61a3aa', '#86bec0', '#a9d4d3', '#6084bd', '#829ed0', '#a9b9dd']
const GROUP_COLORS = {
  Gelir: '#249b7b', Zaruri: '#173d5c', Keyfi: '#438695', Yatırım: '#6084bd',
  'Borç Ödeme': '#8a789c', Transfer: '#8295a7', Diğer: '#aab4c0'
}

const n = value => Number(value || 0)
const norm = value => String(value || '').toLocaleLowerCase('tr-TR')
const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const unique = list => [...new Set(list.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'tr'))

function Raporlar({ session, mobil, gizliMod }) {
  const [data, setData] = useState({ islemler: [], hesaplar: [], kategoriler: [], borclar: [], yatirimlar: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('6')
  const [account, setAccount] = useState('')
  const [type, setType] = useState('')
  const [budget, setBudget] = useState('')
  const [mainCategory, setMainCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [drill, setDrill] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const uid = session.user.id
      const results = await Promise.all([
        supabase.from('islemler').select('*, hesaplar(ad, tur, para_birimi)').eq('user_id', uid).order('tarih', { ascending: true }),
        supabase.from('hesaplar').select('*').eq('user_id', uid),
        supabase.from('kategoriler').select('*').eq('user_id', uid).eq('aktif', true),
        supabase.from('borclar').select('*').eq('user_id', uid).eq('aktif', true),
        supabase.from('yatirimlar').select('*, hesaplar(ad)').eq('user_id', uid)
      ])
      if (!active) return
      const firstError = results.find(result => result.error)?.error
      if (firstError) setError('Bazı rapor verileri alınamadı. Sayfayı yenileyerek tekrar deneyin.')
      setData({
        islemler: results[0].data || [], hesaplar: results[1].data || [],
        kategoriler: results[2].data || [], borclar: results[3].data || [], yatirimlar: results[4].data || []
      })
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [session.user.id])

  const categoryById = useMemo(() => Object.fromEntries(data.kategoriler.map(k => [k.id, k])), [data.kategoriler])
  const enriched = useMemo(() => data.islemler.map(item => {
    const category = categoryById[item.kategori_id] || {}
    return {
      ...item,
      amount: Math.abs(n(item.tutar)),
      ana: item.ana_kategori || category.ana_kategori || item.kategori || 'Diğer',
      alt: item.alt_kategori || category.alt_kategori || '',
      grup: item.butce_grubu || category.butce_grubu || (item.tur === 'gelir' ? 'Gelir' : item.tur === 'transfer' ? 'Transfer' : 'Diğer'),
      isTransfer: item.butce_grubu === 'Transfer' || item.kategori === 'Hesaplar Arası Transfer' || item.tur === 'transfer',
      hesapAdi: item.hesaplar?.ad || 'Hesap bulunamadı'
    }
  }), [data.islemler, categoryById])

  const endMonth = useMemo(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth() + 1, 1)
  }, [])
  const startDate = useMemo(() => {
    const count = Number(period)
    return new Date(endMonth.getFullYear(), endMonth.getMonth() - count, 1)
  }, [period, endMonth])

  const filtered = useMemo(() => enriched.filter(item => {
    const d = new Date(`${item.tarih}T12:00:00`)
    return d >= startDate && d < endMonth &&
      (!account || item.hesap_id === account) &&
      (!type || (type === 'transfer' ? item.isTransfer : item.tur === type && !item.isTransfer)) &&
      (!budget || item.grup === budget) && (!mainCategory || item.ana === mainCategory) &&
      (!subCategory || item.alt === subCategory)
  }), [enriched, startDate, endMonth, account, type, budget, mainCategory, subCategory])

  const drillFiltered = useMemo(() => {
    if (!drill) return filtered
    return filtered.filter(i => drill.level === 'budget' ? i.grup === drill.name : drill.level === 'main' ? i.ana === drill.name : i.alt === drill.name)
  }, [filtered, drill])

  const sumType = (items, target) => items.filter(i => i.tur === target && !i.isTransfer).reduce((sum, i) => sum + i.amount, 0)
  const income = sumType(filtered, 'gelir')
  const expense = sumType(filtered, 'gider')
  const netFlow = income - expense
  const savingsRate = income > 0 ? (netFlow / income) * 100 : 0
  const totalDebt = data.borclar.reduce((sum, item) => sum + n(item.kalan_borc), 0)
  const debtOriginal = data.borclar.reduce((sum, item) => sum + n(item.toplam_borc || item.kalan_borc), 0)
  const monthlyDebt = data.borclar.reduce((sum, item) => sum + n(item.minimum_odeme || item.aylik_taksit), 0)
  const investmentValue = data.yatirimlar.reduce((sum, item) => sum + n(item.guncel_deger), 0)
  const investmentCost = data.yatirimlar.reduce((sum, item) => sum + n(item.miktar) * n(item.birim_maliyet), 0)
  const investmentProfit = investmentValue - investmentCost
  const investmentReturn = investmentCost > 0 ? investmentProfit / investmentCost * 100 : 0
  const cash = data.hesaplar.filter(h => !norm(h.tur).includes('kredi') && norm(h.tur) !== 'borç').reduce((sum, h) => sum + n(h.bakiye), 0)
  const netWorth = cash + investmentValue - totalDebt
  const debtBurden = income > 0 ? monthlyDebt / (income / Number(period)) * 100 : 0

  const months = useMemo(() => {
    const result = []
    for (let i = Number(period) - 1; i >= 0; i--) {
      const d = new Date(endMonth.getFullYear(), endMonth.getMonth() - i - 1, 1)
      const key = monthKey(d)
      const items = enriched.filter(item => item.tarih?.startsWith(key) &&
        (!account || item.hesap_id === account) &&
        (!type || (type === 'transfer' ? item.isTransfer : item.tur === type && !item.isTransfer)) &&
        (!budget || item.grup === budget) && (!mainCategory || item.ana === mainCategory) && (!subCategory || item.alt === subCategory))
      const gelir = sumType(items, 'gelir')
      const gider = sumType(items, 'gider')
      result.push({ key, ay: d.toLocaleDateString('tr-TR', { month: 'short' }), Gelir: gelir, Gider: gider, Net: gelir - gider })
    }
    return result
  }, [period, endMonth, enriched, account, type, budget, mainCategory, subCategory])

  const expenses = filtered.filter(i => i.tur === 'gider' && !i.isTransfer)
  const aggregate = (items, key) => Object.entries(items.reduce((map, item) => {
    const name = item[key] || 'Diğer'
    map[name] = (map[name] || 0) + item.amount
    return map
  }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const budgetData = aggregate(expenses, 'grup')
  const mainData = aggregate(expenses, 'ana')
  const subData = aggregate(expenses.filter(i => i.alt), 'alt')
  const selectedExpenses = drillFiltered.filter(i => i.tur === 'gider')
  const selectedTrend = months.map(month => ({
    ...month,
    Deger: selectedExpenses.filter(i => i.tarih?.startsWith(month.key)).reduce((sum, i) => sum + i.amount, 0)
  }))
  const selectedMain = aggregate(selectedExpenses, 'ana').slice(0, 6)
  const selectedSub = aggregate(selectedExpenses.filter(i => i.alt), 'alt').slice(0, 8)
  const investmentTypes = Object.entries(data.yatirimlar.reduce((map, item) => {
    const key = item.tur || 'Diğer'; map[key] = (map[key] || 0) + n(item.guncel_deger); return map
  }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const budgetOptions = unique(enriched.map(i => i.grup))
  const mainOptions = unique(enriched.filter(i => !budget || i.grup === budget).map(i => i.ana))
  const subOptions = unique(enriched.filter(i => (!budget || i.grup === budget) && (!mainCategory || i.ana === mainCategory)).map(i => i.alt))
  const resetFilters = () => { setAccount(''); setType(''); setBudget(''); setMainCategory(''); setSubCategory(''); setDrill(null) }
  const formatMoney = value => gizliMod ? '₺ ****' : `₺${n(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const formatCompact = value => gizliMod ? '****' : new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(n(value))
  const fmtPct = value => gizliMod ? '***%' : `${value >= 0 ? '+' : ''}%${n(value).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`
  const formatDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('tr-TR') : '—'

  const insightItems = [
    expense > income && { tone: 'danger', text: `Giderleriniz seçilen dönemde gelirinizden ${formatMoney(expense - income)} daha yüksek.` },
    savingsRate >= 20 && { tone: 'success', text: `Tasarruf oranınız %${savingsRate.toFixed(1)} ile güçlü seviyede.` },
    budgetData[0] && { tone: 'info', text: `En yüksek harcama grubu ${budgetData[0].name}; toplam giderin %${expense ? (budgetData[0].value / expense * 100).toFixed(0) : 0}'ini oluşturuyor.` },
    debtBurden > 35 && { tone: 'warning', text: `Aylık borç yükünüz gelirin %${debtBurden.toFixed(0)}'ine ulaşıyor.` },
    investmentReturn !== 0 && { tone: investmentReturn >= 0 ? 'success' : 'danger', text: `Yatırım portföyünüzün toplam getirisi ${fmtPct(investmentReturn)}.` }
  ].filter(Boolean).slice(0, 3)

  if (loading) return <ReportSkeleton />

  return (
    <div className="reports-page">
      <header className="reports-heading">
        <div><h1>Raporlar</h1><p>Finansal hayatınızın tamamını tek ekranda analiz edin.</p></div>
        <div className="reports-period"><CalendarDays size={16}/><select value={period} onChange={e => { setPeriod(e.target.value); setDrill(null) }}><option value="1">Son 1 Ay</option><option value="3">Son 3 Ay</option><option value="6">Son 6 Ay</option><option value="12">Son 12 Ay</option></select></div>
      </header>

      {error && <div className="reports-error">{error}</div>}

      <section className="reports-filterbar">
        <span className="reports-filter-title"><Filter size={15}/> Filtreler</span>
        <FilterSelect label="Hesaplar" value={account} onChange={setAccount} options={data.hesaplar.map(h => ({ value: h.id, label: h.ad }))}/>
        <FilterSelect label="İşlem Türü" value={type} onChange={setType} options={[{ value: 'gelir', label: 'Gelir' }, { value: 'gider', label: 'Gider' }, { value: 'transfer', label: 'Transfer' }]}/>
        <FilterSelect label="Bütçe Grubu" value={budget} onChange={v => { setBudget(v); setMainCategory(''); setSubCategory(''); setDrill(null) }} options={budgetOptions}/>
        <FilterSelect label="Ana Kategori" value={mainCategory} onChange={v => { setMainCategory(v); setSubCategory(''); setDrill(null) }} options={mainOptions}/>
        <FilterSelect label="Alt Kategori" value={subCategory} onChange={v => { setSubCategory(v); setDrill(null) }} options={subOptions}/>
        <button className="reports-reset" onClick={resetFilters}><RotateCcw size={14}/> Temizle</button>
      </section>

      <section className="reports-kpis">
        <Kpi title="Net Varlık" value={formatMoney(netWorth)} subtitle="Nakit + yatırım − borç" icon={<WalletCards/>} featured/>
        <Kpi title="Gelir" value={formatMoney(income)} subtitle={`${period} aylık toplam`} icon={<ArrowUpRight/>} tone="positive"/>
        <Kpi title="Gider" value={formatMoney(expense)} subtitle={`${filtered.filter(i => i.tur === 'gider').length} işlem`} icon={<ArrowDownRight/>} tone="negative"/>
        <Kpi title="Tasarruf Oranı" value={fmtPct(savingsRate)} subtitle={netFlow >= 0 ? 'Pozitif nakit akışı' : 'Negatif nakit akışı'} icon={<PiggyBank/>}/>
        <Kpi title="Borç Yükü" value={`%${Math.max(0, debtBurden).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`} subtitle={`${formatMoney(monthlyDebt)} aylık`} icon={<CreditCard/>}/>
        <Kpi title="Yatırım Getirisi" value={fmtPct(investmentReturn)} subtitle={formatMoney(investmentProfit)} icon={<TrendingUp/>} tone={investmentReturn >= 0 ? 'positive' : 'negative'}/>
      </section>

      <section className="reports-primary-grid">
        <Panel title="Nakit Akışı ve Net Değişim" subtitle="Gelir, gider ve dönemsel net hareket" className="reports-cashflow">
          <ResponsiveContainer width="100%" height={310}>
            <ComposedChart data={months} margin={{ top: 12, right: 8, bottom: 0, left: -8 }}>
              <defs><linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2e8793" stopOpacity=".24"/><stop offset="1" stopColor="#2e8793" stopOpacity="0"/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--border-light)" strokeDasharray="3 5"/>
              <XAxis dataKey="ay" tickLine={false} axisLine={false} tick={{ fill: '#8792a6', fontSize: 11 }}/>
              <YAxis tickLine={false} axisLine={false} tickFormatter={formatCompact} tick={{ fill: '#8792a6', fontSize: 10 }}/>
              <Tooltip content={<ReportTooltip formatMoney={formatMoney}/>}/>
              <Area type="monotone" dataKey="Net" stroke="#2e8793" fill="url(#netFill)" strokeWidth={2}/>
              <Line type="monotone" dataKey="Gelir" stroke="#249b7b" strokeWidth={2.2} dot={false}/>
              <Line type="monotone" dataKey="Gider" stroke="#d9535f" strokeWidth={2.2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
          <div className="reports-chart-legend"><span className="income">Gelir</span><span className="expense">Gider</span><span className="net">Net akış</span></div>
        </Panel>

        <Panel title="Harcama Hiyerarşisi" subtitle="Bütçe grubu → ana kategori → alt kategori" className="reports-hierarchy" action={<span className="reports-click-hint">Dilimlere tıklayın</span>}>
          {expenses.length ? <>
            <ResponsiveContainer width="100%" height={310}>
              <PieChart>
                <Tooltip formatter={value => formatMoney(value)}/>
                <Pie data={budgetData} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={1} onClick={entry => setDrill({ level: 'budget', name: entry.name })}>
                  {budgetData.map((entry, i) => <Cell key={entry.name} fill={GROUP_COLORS[entry.name] || COLORS[i % COLORS.length]} className="reports-chart-cell"/>)}
                </Pie>
                <Pie data={mainData} dataKey="value" cx="50%" cy="50%" innerRadius={80} outerRadius={105} paddingAngle={1} onClick={entry => setDrill({ level: 'main', name: entry.name })}>
                  {mainData.map((entry, i) => <Cell key={entry.name} fill={COLORS[(i + 1) % COLORS.length]} className="reports-chart-cell"/>)}
                </Pie>
                <Pie data={subData} dataKey="value" cx="50%" cy="50%" innerRadius={109} outerRadius={128} paddingAngle={1} onClick={entry => setDrill({ level: 'sub', name: entry.name })}>
                  {subData.map((entry, i) => <Cell key={entry.name} fill={COLORS[(i + 3) % COLORS.length]} className="reports-chart-cell"/>)}
                </Pie>
                <text x="50%" y="48%" textAnchor="middle" fill="var(--text-muted)" fontSize="11">Toplam gider</text>
                <text x="50%" y="56%" textAnchor="middle" fill="var(--text-primary)" fontSize="15" fontWeight="700">{formatMoney(expense)}</text>
              </PieChart>
            </ResponsiveContainer>
            <div className="reports-hierarchy-legend">{budgetData.slice(0, 5).map((item, i) => <button key={item.name} onClick={() => setDrill({ level: 'budget', name: item.name })}><i style={{ background: GROUP_COLORS[item.name] || COLORS[i] }}/><span>{item.name}</span><strong>%{expense ? (item.value / expense * 100).toFixed(0) : 0}</strong></button>)}</div>
          </> : <Empty text="Bu dönemde gider kaydı bulunmuyor."/>}
        </Panel>
      </section>

      {drill && (
        <Drilldown drill={drill} setDrill={setDrill} items={drillFiltered} trend={selectedTrend}
          mainData={selectedMain} subData={selectedSub} total={selectedExpenses.reduce((s, i) => s + i.amount, 0)}
          expense={expense} formatMoney={formatMoney} formatDate={formatDate} mobil={mobil}/>
      )}

      <section className="reports-secondary-grid">
        <Panel title="Bütçe Sağlığı" subtitle="Harcama gruplarının toplam içindeki payı" icon={<Layers3 size={17}/> }>
          <div className="reports-budget-list">{budgetData.slice(0, 6).map((item, i) => { const pct = expense ? item.value / expense * 100 : 0; return <button key={item.name} onClick={() => setDrill({ level: 'budget', name: item.name })}><span className="budget-name"><i style={{ background: GROUP_COLORS[item.name] || COLORS[i] }}/>{item.name}</span><span className="budget-bar"><i style={{ width: `${Math.min(100, pct)}%`, background: GROUP_COLORS[item.name] || COLORS[i] }}/></span><strong>{formatMoney(item.value)}</strong><small>%{pct.toFixed(0)}</small><ArrowRight size={14}/></button> })}{!budgetData.length && <Empty text="Bütçe dağılımı için gider verisi gerekli."/>}</div>
        </Panel>

        <Panel title="Borç Durumu" subtitle={`${data.borclar.length} aktif borç`} icon={<CreditCard size={17}/> }>
          <div className="reports-debt-summary"><div><span>Kalan borç</span><strong>{formatMoney(totalDebt)}</strong></div><div><span>Aylık ödeme</span><strong>{formatMoney(monthlyDebt)}</strong></div></div>
          <div className="reports-debt-progress"><span><b>Ödenen</b><b>%{debtOriginal ? Math.max(0, (debtOriginal - totalDebt) / debtOriginal * 100).toFixed(0) : 0}</b></span><i><em style={{ width: `${debtOriginal ? Math.min(100, Math.max(0, (debtOriginal - totalDebt) / debtOriginal * 100)) : 0}%` }}/></i></div>
          <div className="reports-mini-list">{data.borclar.slice(0, 3).map(item => <div key={item.id}><span><CreditCard size={14}/>{item.ad}</span><strong>{formatMoney(item.kalan_borc)}</strong><small>{formatDate(item.son_odeme_tarihi)}</small></div>)}{!data.borclar.length && <Empty text="Aktif borç bulunmuyor."/>}</div>
        </Panel>

        <Panel title="Yatırım Performansı" subtitle={`${data.yatirimlar.length} varlık`} icon={<BriefcaseBusiness size={17}/> }>
          <div className="reports-invest-head"><div><span>Portföy değeri</span><strong>{formatMoney(investmentValue)}</strong><small className={investmentProfit >= 0 ? 'positive' : 'negative'}>{fmtPct(investmentReturn)} toplam getiri</small></div>{investmentTypes.length > 0 && <div className="reports-mini-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={investmentTypes} dataKey="value" innerRadius={25} outerRadius={40} paddingAngle={2}>{investmentTypes.map((x, i) => <Cell key={x.name} fill={COLORS[i % COLORS.length]}/>)}</Pie></PieChart></ResponsiveContainer></div>}</div>
          <div className="reports-mini-list">{investmentTypes.slice(0, 4).map((item, i) => <div key={item.name}><span><i style={{ background: COLORS[i % COLORS.length] }}/>{item.name}</span><strong>{formatMoney(item.value)}</strong><small>%{investmentValue ? (item.value / investmentValue * 100).toFixed(0) : 0}</small></div>)}{!investmentTypes.length && <Empty text="Yatırım kaydı bulunmuyor."/>}</div>
        </Panel>

        <Panel title="Finansal İçgörüler" subtitle="Verilerinize göre öne çıkanlar" icon={<Lightbulb size={17}/> }>
          <div className="reports-insights">{insightItems.map((item, i) => <div key={i} className={item.tone}><span>{item.tone === 'success' ? <CheckCircle2/> : item.tone === 'danger' ? <ArrowDownRight/> : <Activity/>}</span><p>{item.text}</p></div>)}{!insightItems.length && <Empty text="İçgörü oluşturmak için daha fazla işlem ekleyin."/>}</div>
        </Panel>
      </section>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  const normalized = (options || []).map(item => typeof item === 'string' ? { value: item, label: item } : item)
  return <label className="reports-filter"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}><option value="">Tümü</option>{normalized.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
}

function Kpi({ title, value, subtitle, icon, featured, tone }) {
  return <article className={`reports-kpi${featured ? ' featured' : ''}${tone ? ` ${tone}` : ''}`}><span className="reports-kpi-icon">{icon}</span><div><small>{title}</small><strong>{value}</strong><p>{subtitle}</p></div></article>
}

function Panel({ title, subtitle, icon, action, className = '', children }) {
  return <article className={`reports-panel ${className}`}><header><div><h2>{icon}{title}</h2><p>{subtitle}</p></div>{action}</header>{children}</article>
}

function Drilldown({ drill, setDrill, items, trend, mainData, subData, total, expense, formatMoney, formatDate, mobil }) {
  const typeLabel = { budget: 'Bütçe Grubu', main: 'Ana Kategori', sub: 'Alt Kategori' }[drill.level]
  return <section className="reports-drilldown">
    <header><div className="reports-drill-title"><button onClick={() => setDrill(null)}><ChevronLeft size={18}/></button><div><span>Raporlar / {typeLabel}</span><h2>{drill.name} Analizi</h2><p>Grafik seçiminize bağlı tüm detaylar</p></div></div><button className="reports-drill-close" onClick={() => setDrill(null)}><X size={17}/> Kapat</button></header>
    <div className="reports-drill-kpis"><div><span>Toplam harcama</span><strong>{formatMoney(total)}</strong></div><div><span>Toplam gider içindeki pay</span><strong>%{expense ? (total / expense * 100).toFixed(1) : 0}</strong></div><div><span>İşlem sayısı</span><strong>{items.filter(i => i.tur === 'gider').length}</strong></div><div><span>İşlem ortalaması</span><strong>{formatMoney(items.length ? total / items.length : 0)}</strong></div></div>
    <div className="reports-drill-charts">
      <div><h3>Aylık trend</h3><ResponsiveContainer width="100%" height={220}><AreaChart data={trend}><defs><linearGradient id="drillFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#28657a" stopOpacity=".28"/><stop offset="1" stopColor="#28657a" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border-light)"/><XAxis dataKey="ay" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8792a6' }}/><YAxis hide/><Tooltip formatter={formatMoney}/><Area type="monotone" dataKey="Deger" stroke="#28657a" fill="url(#drillFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
      <div><h3>Ana kategori dağılımı</h3><ResponsiveContainer width="100%" height={220}><BarChart data={mainData} layout="vertical" margin={{ left: 5, right: 12 }}><XAxis type="number" hide/><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={mobil ? 80 : 105} tick={{ fontSize: 10, fill: '#53617a' }}/><Tooltip formatter={formatMoney}/><Bar dataKey="value" fill="#438695" radius={[0, 6, 6, 0]} barSize={13}/></BarChart></ResponsiveContainer></div>
      <div><h3>Alt kategori kırılımı</h3>{subData.length ? <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={subData} dataKey="value" innerRadius={45} outerRadius={76} paddingAngle={2}>{subData.map((x, i) => <Cell key={x.name} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip formatter={formatMoney}/></PieChart></ResponsiveContainer> : <Empty text="Alt kategori verisi yok."/>}</div>
    </div>
    <div className="reports-table-wrap"><h3>İşlem listesi</h3><div className="reports-table-scroll"><table><thead><tr><th>Ana Kategori</th><th>Alt Kategori</th><th>Açıklama</th><th>Hesap</th><th>Tutar</th><th>Tarih</th></tr></thead><tbody>{items.filter(i => i.tur === 'gider').slice().reverse().slice(0, 12).map(i => <tr key={i.id}><td><b>{i.ana}</b></td><td>{i.alt || '—'}</td><td>{i.aciklama || '—'}</td><td>{i.hesapAdi}</td><td className="amount">-{formatMoney(i.amount)}</td><td>{formatDate(i.tarih)}</td></tr>)}</tbody></table></div>{!items.length && <Empty text="Bu kırılımda işlem bulunamadı."/>}</div>
  </section>
}

function ReportTooltip({ active, payload, label, formatMoney }) {
  if (!active || !payload?.length) return null
  return <div className="reports-tooltip"><strong>{label}</strong>{payload.map(item => <span key={item.dataKey} style={{ color: item.color }}>{item.name}: {formatMoney(item.value)}</span>)}</div>
}

function Empty({ text }) { return <div className="reports-empty"><CircleDollarSign size={20}/><span>{text}</span></div> }
function ReportSkeleton() { return <div className="reports-skeleton"><div/><section>{Array.from({ length: 6 }).map((_, i) => <i key={i}/>)}</section><main><i/><i/></main></div> }

export default Raporlar
