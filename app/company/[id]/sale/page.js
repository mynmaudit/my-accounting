'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'

const STEPS = [
  { id: 'quotation', label: 'ใบเสนอราคา', icon: '📋' },
  { id: 'so', label: 'Sales Order', icon: '🛒' },
  { id: 'invoice', label: 'Invoice', icon: '🧾' },
  { id: 'receipt', label: 'รับเงิน', icon: '💰' },
]

export default function SalePage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('so')
  const [company, setCompany] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data } = await supabase.from('companies').select('*').eq('id', id).single()
      setCompany(data)
    }
    init()
  }, [id])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => window.location.href = `/company/${id}`} className="text-gray-400 hover:text-gray-600">← กลับ</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛒 Module ขาย</h1>
            <p className="text-gray-400 text-sm">{company?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8 bg-white rounded-2xl p-4 border border-gray-100">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button onClick={() => setActiveTab(s.id)}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === s.id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <span>{s.icon}</span><span>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="text-gray-300">→</span>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {activeTab === 'quotation' && <ComingSoon label="ใบเสนอราคา" />}
          {activeTab === 'so' && <SOTab companyId={id} />}
          {activeTab === 'invoice' && <ComingSoon label="Invoice" />}
          {activeTab === 'receipt' && <ComingSoon label="รับเงิน" />}
        </div>
      </div>
    </div>
  )
}

function ComingSoon({ label }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">🚧</div>
      <div className="font-semibold">{label} — กำลังพัฒนา</div>
    </div>
  )
}

function SOTab({ companyId }) {
  const [orders, setOrders] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ contact_name: '', date: new Date().toISOString().split('T')[0], note: '' })
  const [items, setItems] = useState([{ description: '', qty: 1, price: 0 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadOrders() }, [companyId])

  const loadOrders = async () => {
    const { data } = await supabase.from('transactions').select('*').eq('company_id', companyId).eq('type', 'so').order('created_at', { ascending: false })
    setOrders(data || [])
  }

  const genDocNumber = async () => {
    const year = new Date().getFullYear()
    const { data } = await supabase.from('transactions').select('doc_number').eq('company_id', companyId).eq('type', 'so').like('doc_number', `SO-${year}-%`).order('doc_number', { ascending: false }).limit(1)
    if (data && data.length > 0 && data[0].doc_number) {
      const lastNum = parseInt(data[0].doc_number.split('-')[2]) || 0
      return `SO-${year}-${String(lastNum + 1).padStart(4, '0')}`
    }
    return `SO-${year}-0001`
  }

  const addItem = () => setItems([...items, { description: '', qty: 1, price: 0 }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, k, v) => { const n = [...items]; n[i][k] = v; setItems(n) }
  const total = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0)

  const saveOrder = async () => {
    if (!form.contact_name) return alert('กรุณากรอกชื่อลูกค้า')
    if (total <= 0) return alert('กรุณากรอกรายการสินค้าและราคา')
    setSaving(true)
    const docNumber = await genDocNumber()
    const { error } = await supabase.from('transactions').insert([{
      company_id: companyId, type: 'so', date: form.date,
      description: form.contact_name,
      doc_number: docNumber,
      amount: total, category: form.contact_name,
      note: form.note, status: 'open',
    }])
    if (!error) {
      await loadOrders()
      setShowForm(false)
      setForm({ contact_name: '', date: new Date().toISOString().split('T')[0], note: '' })
      setItems([{ description: '', qty: 1, price: 0 }])
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-gray-900">Sales Order</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-indigo-700">
          + สร้าง SO ใหม่
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">สร้าง Sales Order</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อลูกค้า *</label>
              <input type="text" value={form.contact_name} onChange={(e) => setForm({...form, contact_name: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="กรอกชื่อลูกค้า" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">วันที่ *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">รายการสินค้า/บริการ</label>
              <button onClick={addItem} className="text-indigo-600 text-sm hover:underline">+ เพิ่มรายการ</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-semibold w-1/2">รายละเอียดสินค้า/บริการ</th>
                  <th className="pb-2 font-semibold text-center w-1/6">จำนวน (ชิ้น)</th>
                  <th className="pb-2 font-semibold text-right w-1/4">ราคา/หน่วย (บาท)</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-2">
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="รายละเอียด"
                        value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                    </td>
                    <td className="py-2 px-2">
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center" type="number" min="1"
                        value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} />
                    </td>
                    <td className="py-2 pl-2">
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-right" type="number" min="0"
                        value={item.price} onChange={(e) => updateItem(i, 'price', e.target.value)} />
                    </td>
                    <td className="py-2 pl-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 text-xl">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">หมายเหตุ</label>
            <input type="text" value={form.note} onChange={(e) => setForm({...form, note: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="หมายเหตุ (ถ้ามี)" />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xl font-bold text-gray-900">รวม: ฿{total.toLocaleString('th-TH', {minimumFractionDigits: 2})}</div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="text-gray-500 text-sm hover:text-gray-700">ยกเลิก</button>
              <button onClick={saveOrder} disabled={saving} className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึก SO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🛒</div>
          <div>ยังไม่มี Sales Order</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50 transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-600 text-sm">{o.doc_number || 'SO-XXXX'}</span>
                  <span className="font-semibold text-gray-900">{o.description}</span>
                </div>
                <div className="text-sm text-gray-400">{o.date}</div>
                {o.note && <div className="text-xs text-gray-400 mt-1">หมายเหตุ: {o.note}</div>}
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">฿{o.amount?.toLocaleString('th-TH', {minimumFractionDigits: 2})}</div>
                <div className="text-xs text-green-500 font-medium">● เปิดอยู่</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
