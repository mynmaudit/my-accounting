'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const UNITS = ['ชิ้น', 'กล่อง', 'แพ็ค', 'กก.', 'ลิตร', 'เมตร', 'ชุด', 'อัน', 'ถุง', 'โหล']
const emptyProduct = { code: '', name: '', unit: 'ชิ้น', cost_price: '', sale_price: '', stock_qty: '', min_qty: '', is_active: true }

export default function InventoryPage() {
  const { id: companyId } = useParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLow, setFilterLow] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustType, setAdjustType] = useState('in')
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [movOpen, setMovOpen] = useState(false)
  const [movProduct, setMovProduct] = useState(null)
  const [movements, setMovements] = useState([])
  const [movLoading, setMovLoading] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').eq('company_id', companyId).order('code')
    if (!error) setProducts(data || [])
    setLoading(false)
  }, [companyId])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const filtered = products.filter(p => {
    const matchSearch = p.code.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())
    const matchLow = filterLow ? p.stock_qty <= p.min_qty : true
    return matchSearch && matchLow
  })

  function openAdd() { setEditProduct(null); setForm(emptyProduct); setFormError(''); setModalOpen(true) }

  function openEdit(p) {
    setEditProduct(p)
    setForm({ code: p.code, name: p.name, unit: p.unit || 'ชิ้น', cost_price: p.cost_price, sale_price: p.sale_price, stock_qty: p.stock_qty, min_qty: p.min_qty, is_active: p.is_active })
    setFormError('')
    setModalOpen(true)
  }

  async function saveProduct() {
    setFormError('')
    if (!form.code.trim()) return setFormError('กรุณากรอกรหัสสินค้า')
    if (!form.name.trim()) return setFormError('กรุณากรอกชื่อสินค้า')
    setSaving(true)
    const payload = { company_id: companyId, code: form.code.trim(), name: form.name.trim(), unit: form.unit, cost_price: parseFloat(form.cost_price) || 0, sale_price: parseFloat(form.sale_price) || 0, min_qty: parseFloat(form.min_qty) || 0, is_active: form.is_active }
    let error
    if (editProduct) {
      ;({ error } = await supabase.from('products').update(payload).eq('id', editProduct.id))
    } else {
      payload.stock_qty = parseFloat(form.stock_qty) || 0
      const { data: inserted, error: err } = await supabase.from('products').insert(payload).select().single()
      error = err
      if (!error && payload.stock_qty > 0) {
        await supabase.from('stock_movements').insert({ company_id: companyId, product_id: inserted.id, movement_type: 'in', ref_type: 'initial', ref_doc: 'INIT', qty: payload.stock_qty, cost_price: payload.cost_price, balance_qty: payload.stock_qty, note: 'ยอดเริ่มต้น' })
      }
    }
    setSaving(false)
    if (error) return setFormError(error.message)
    setModalOpen(false)
    fetchProducts()
  }

  function openAdjust(p) { setAdjustProduct(p); setAdjustQty(''); setAdjustNote(''); setAdjustType('in'); setAdjustOpen(true) }

  async function saveAdjust() {
    if (!adjustQty || parseFloat(adjustQty) <= 0) return
    setAdjustSaving(true)
    const delta = adjustType === 'in' ? parseFloat(adjustQty) : -parseFloat(adjustQty)
    const newBalance = adjustProduct.stock_qty + delta
    await supabase.from('products').update({ stock_qty: newBalance }).eq('id', adjustProduct.id)
    await supabase.from('stock_movements').insert({ company_id: companyId, product_id: adjustProduct.id, movement_type: adjustType === 'in' ? 'in' : 'out', ref_type: 'adjust', ref_doc: 'ADJ', qty: delta, cost_price: adjustProduct.cost_price, balance_qty: newBalance, note: adjustNote || 'ปรับสต็อก' })
    setAdjustSaving(false)
    setAdjustOpen(false)
    fetchProducts()
  }

  async function openMovements(p) {
    setMovProduct(p); setMovements([]); setMovOpen(true); setMovLoading(true)
    const { data } = await supabase.from('stock_movements').select('*').eq('product_id', p.id).order('created_at', { ascending: false }).limit(50)
    setMovements(data || [])
    setMovLoading(false)
  }

  async function toggleActive(p) {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    fetchProducts()
  }

  const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtQty = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
  const lowStockCount = products.filter(p => p.is_active && p.stock_qty <= p.min_qty && p.min_qty > 0).length

  return (
    <div className="p-6 max-w-7xl mx-auto"><div className="mb-4"><button onClick={() => window.history.back()} className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</button></div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">คลังสินค้า</h1>
          <p className="text-sm text-gray-500 mt-0.5">จัดการสินค้าและสต็อก</p>
        </div>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          + เพิ่มสินค้า
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-blue-50 text-blue-700"><p className="text-xs mb-1">สินค้าทั้งหมด</p><p className="text-xl font-bold">{products.filter(p => p.is_active).length}</p><p className="text-xs">รายการ</p></div>
        <div className="rounded-xl p-4 bg-red-50 text-red-600"><p className="text-xs mb-1">สต็อกต่ำกว่ากำหนด</p><p className="text-xl font-bold">{lowStockCount}</p><p className="text-xs">รายการ</p></div>
        <div className="rounded-xl p-4 bg-green-50 text-green-700"><p className="text-xs mb-1">มูลค่าต้นทุนรวม</p><p className="text-xl font-bold">{fmt(products.reduce((s,p) => s + p.stock_qty * p.cost_price, 0))}</p><p className="text-xs">บาท</p></div>
        <div className="rounded-xl p-4 bg-purple-50 text-purple-700"><p className="text-xs mb-1">มูลค่าราคาขายรวม</p><p className="text-xl font-bold">{fmt(products.reduce((s,p) => s + p.stock_qty * p.sale_price, 0))}</p><p className="text-xs">บาท</p></div>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="ค้นหารหัส / ชื่อสินค้า..." value={search} onChange={e => setSearch(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
        <button onClick={() => setFilterLow(!filterLow)} className={`px-4 py-2 rounded-lg text-sm font-medium border ${filterLow ? 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-300 text-gray-600'}`}>
          สต็อกต่ำ {lowStockCount > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">{lowStockCount}</span>}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? <div className="text-center py-16 text-gray-400">กำลังโหลด...</div> : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">ยังไม่มีสินค้า กด "+ เพิ่มสินค้า" เพื่อเริ่มต้น</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">รหัส</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">ชื่อสินค้า</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">หน่วย</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">ต้นทุน</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">ราคาขาย</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">คงเหลือ</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">ขั้นต่ำ</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">สถานะ</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const isLow = p.min_qty > 0 && p.stock_qty <= p.min_qty
                  return (
                    <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isLow ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-gray-700">{p.code}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}{isLow && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">สต็อกต่ำ</span>}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{p.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(p.cost_price)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(p.sale_price)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>{fmtQty(p.stock_qty)}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{fmtQty(p.min_qty)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleActive(p)} className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.is_active ? 'ใช้งาน' : 'ปิด'}</button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openMovements(p)} title="ประวัติ" className="p-1.5 rounded-lg hover:bg-gray-100 text-base">📋</button>
                          <button onClick={() => openAdjust(p)} title="ปรับสต็อก" className="p-1.5 rounded-lg hover:bg-yellow-50 text-base">⚖️</button>
                          <button onClick={() => openEdit(p)} title="แก้ไข" className="p-1.5 rounded-lg hover:bg-blue-50 text-base">✏️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{editProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">รหัสสินค้า *</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} placeholder="เช่น P001" disabled={!!editProduct} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">หน่วย</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">ชื่อสินค้า *</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="ชื่อสินค้า" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">ต้นทุน (บาท)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.cost_price} onChange={e => setForm(f => ({...f, cost_price: e.target.value}))} placeholder="0.00" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">ราคาขาย (บาท)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.sale_price} onChange={e => setForm(f => ({...f, sale_price: e.target.value}))} placeholder="0.00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editProduct && <div><label className="block text-xs font-medium text-gray-600 mb-1">สต็อกเริ่มต้น</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.stock_qty} onChange={e => setForm(f => ({...f, stock_qty: e.target.value}))} placeholder="0" /></div>}
                <div><label className="block text-xs font-medium text-gray-600 mb-1">สต็อกขั้นต่ำ</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.min_qty} onChange={e => setForm(f => ({...f, min_qty: e.target.value}))} placeholder="0" /></div>
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600">ยกเลิก</button>
                <button onClick={saveProduct} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adjustOpen && adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">ปรับสต็อก — {adjustProduct.name}</h2>
              <button onClick={() => setAdjustOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">สต็อกปัจจุบัน: <span className="font-bold text-gray-800">{fmtQty(adjustProduct.stock_qty)} {adjustProduct.unit}</span></div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ประเภท</label>
                <div className="flex gap-3">
                  <button onClick={() => setAdjustType('in')} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium ${adjustType === 'in' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'}`}>+ รับเข้า</button>
                  <button onClick={() => setAdjustType('out')} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium ${adjustType === 'out' ? 'bg-red-500 text-white border-red-500' : 'border-gray-300 text-gray-600'}`}>− จ่ายออก</button>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">จำนวน</label><input type="number" min="0.001" step="any" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="0" autoFocus /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">หมายเหตุ</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="เหตุผลการปรับ (ถ้ามี)" /></div>
              {adjustQty && parseFloat(adjustQty) > 0 && (
                <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">สต็อกหลังปรับ: <span className="font-bold">{fmtQty(adjustProduct.stock_qty + (adjustType === 'in' ? 1 : -1) * parseFloat(adjustQty))} {adjustProduct.unit}</span></div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setAdjustOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600">ยกเลิก</button>
                <button onClick={saveAdjust} disabled={adjustSaving || !adjustQty || parseFloat(adjustQty) <= 0} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">{adjustSaving ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {movOpen && movProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">ประวัติสต็อก — {movProduct.name}</h2>
              <button onClick={() => setMovOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="px-6 py-5">
              {movLoading ? <div className="text-center py-8 text-gray-400">กำลังโหลด...</div> : movements.length === 0 ? <div className="text-center py-8 text-gray-400">ยังไม่มีประวัติ</div> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-3 py-2 text-gray-600">วันที่</th>
                      <th className="text-center px-3 py-2 text-gray-600">ประเภท</th>
                      <th className="text-left px-3 py-2 text-gray-600">อ้างอิง</th>
                      <th className="text-right px-3 py-2 text-gray-600">จำนวน</th>
                      <th className="text-right px-3 py-2 text-gray-600">คงเหลือ</th>
                      <th className="text-left px-3 py-2 text-gray-600">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{new Date(m.created_at).toLocaleDateString('th-TH')}</td>
                        <td className="px-3 py-2 text-center"><span className={`font-medium ${m.movement_type === 'in' ? 'text-green-600' : m.movement_type === 'out' ? 'text-red-500' : 'text-yellow-600'}`}>{m.movement_type === 'in' ? 'รับเข้า' : m.movement_type === 'out' ? 'จ่ายออก' : 'ปรับ'}</span></td>
                        <td className="px-3 py-2 text-gray-600"><span className="font-mono">{m.ref_doc}</span></td>
                        <td className={`px-3 py-2 text-right font-bold ${m.qty >= 0 ? 'text-green-600' : 'text-red-500'}`}>{m.qty >= 0 ? '+' : ''}{fmtQty(m.qty)}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{fmtQty(m.balance_qty)}</td>
                        <td className="px-3 py-2 text-gray-500">{m.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, bg, text }) {
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <p className={`text-xs font-medium mb-1 opacity-70 ${text}`}>{label}</p>
      <p className={`text-xl font-bold ${text}`}>{value}</p>
      <p className={`text-xs opacity-60 mt-0.5 ${text}`}>{unit}</p>
    </div>
  )
}
