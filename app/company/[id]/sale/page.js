'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'

const STEPS = [
  { id: 'so', label: 'Sales Order', icon: '🛒' },
  { id: 'invoice', label: 'ใบแจ้งหนี้/ใบกำกับภาษี', icon: '🧾' },
  { id: 'receipt', label: 'ใบเสร็จรับเงิน', icon: '💰' },
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
          {activeTab === 'so' && <SOTab companyId={id} onCreateInvoice={() => setActiveTab('invoice')} />}
          {activeTab === 'invoice' && <InvoiceTab companyId={id} company={company} onReceived={() => setActiveTab('receipt')} />}
          {activeTab === 'receipt' && <ReceiptTab companyId={id} company={company} />}
        </div>
      </div>
    </div>
  )
}

function SOTab({ companyId, onCreateInvoice }) {
  const [orders, setOrders] = useState([])
  const [contacts, setContacts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [filter, setFilter] = useState('active')
  const [selectedContact, setSelectedContact] = useState(null)
  const [form, setForm] = useState({ contact_id: '', date: new Date().toISOString().split('T')[0], note: '' })
  const [items, setItems] = useState([{ description: '', qty: 1, price: 0 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadOrders(); loadContacts() }, [companyId])

  const loadOrders = async () => {
    const { data } = await supabase.from('transactions').select('*, contacts(code, name)').eq('company_id', companyId).eq('type', 'so').order('created_at', { ascending: false })
    setOrders(data || [])
  }

  const loadContacts = async () => {
    const { data } = await supabase.from('contacts').select('*').eq('company_id', companyId).in('contact_type', ['customer', 'both']).order('code')
    setContacts(data || [])
  }

  const genDocNumber = async (type) => {
    const year = new Date().getFullYear()
    const prefixes = { so: 'SO', invoice: 'INV', receipt: 'REC' }
    const prefix = prefixes[type]
    const { data } = await supabase.from('transactions').select('doc_number').eq('company_id', companyId).eq('type', type).like('doc_number', `${prefix}-${year}-%`).order('doc_number', { ascending: false }).limit(1)
    if (data && data.length > 0 && data[0].doc_number) {
      const lastNum = parseInt(data[0].doc_number.split('-')[2]) || 0
      return `${prefix}-${year}-${String(lastNum + 1).padStart(4, '0')}`
    }
    return `${prefix}-${year}-0001`
  }

  const addItem = () => setItems([...items, { description: '', qty: 1, price: 0 }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, k, v) => { const n = [...items]; n[i][k] = v; setItems(n) }
  const total = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0)

  const handleSelectContact = (contactId) => {
    setSelectedContact(contacts.find(c => c.id === contactId))
    setForm({...form, contact_id: contactId})
  }

  const openEdit = (order) => {
    setEditingOrder(order)
    setForm({ contact_id: order.contact_id, date: order.date, note: order.note || '' })
    setSelectedContact(contacts.find(c => c.id === order.contact_id))
    setItems(order.items ? JSON.parse(order.items) : [{ description: '', qty: 1, price: 0 }])
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingOrder(null)
    setShowForm(false)
    setForm({ contact_id: '', date: new Date().toISOString().split('T')[0], note: '' })
    setItems([{ description: '', qty: 1, price: 0 }])
    setSelectedContact(null)
  }

  const saveOrder = async () => {
    if (!form.contact_id) return alert('กรุณาเลือกลูกค้า')
    if (total <= 0) return alert('กรุณากรอกรายการสินค้าและราคา')
    setSaving(true)

    if (editingOrder) {
      const { error } = await supabase.from('transactions').update({
        date: form.date, description: selectedContact?.name,
        contact_id: form.contact_id, amount: total,
        category: selectedContact?.name, note: form.note,
        items: JSON.stringify(items),
      }).eq('id', editingOrder.id)
      if (!error) { await loadOrders(); cancelEdit() }
      else alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      const docNumber = await genDocNumber('so')
      const { error } = await supabase.from('transactions').insert([{
        company_id: companyId, type: 'so', date: form.date,
        description: selectedContact?.name, doc_number: docNumber,
        contact_id: form.contact_id, amount: total,
        category: selectedContact?.name, note: form.note,
        status: 'open', items: JSON.stringify(items),
      }])
      if (!error) { await loadOrders(); cancelEdit() }
      else alert('เกิดข้อผิดพลาด: ' + error.message)
    }
    setSaving(false)
  }

  const cancelOrder = async (order) => {
    if (!confirm(`ยืนยันยกเลิก ${order.doc_number}?`)) return
    await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', order.id)
    await loadOrders()
  }

  const createInvoice = async (order) => {
    const docNumber = await genDocNumber('invoice')
    const { error } = await supabase.from('transactions').insert([{
      company_id: companyId, type: 'invoice',
      date: new Date().toISOString().split('T')[0],
      description: order.description, doc_number: docNumber,
      contact_id: order.contact_id, amount: order.amount,
      category: order.category, note: order.note,
      status: 'open', ref_doc: order.doc_number, items: order.items,
    }])
    if (!error) {
      await supabase.from('transactions').update({ status: 'invoiced' }).eq('id', order.id)
      await loadOrders()
      onCreateInvoice()
      alert('สร้างใบแจ้งหนี้ ' + docNumber + ' เรียบร้อยแล้ว')
    } else alert('เกิดข้อผิดพลาด: ' + error.message)
  }

  const filtered = orders.filter(o => {
    if (filter === 'active') return o.status === 'open'
    if (filter === 'invoiced') return o.status === 'invoiced'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const statusLabel = (s) => {
    if (s === 'open') return <span className="text-xs text-green-500 font-medium">● เปิดอยู่</span>
    if (s === 'invoiced') return <span className="text-xs text-gray-400 font-medium">✓ ออกใบแจ้งหนี้แล้ว</span>
    if (s === 'cancelled') return <span className="text-xs text-red-400 font-medium">✕ ยกเลิกแล้ว</span>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {[['active','เปิดอยู่'],['invoiced','ออกใบแจ้งหนี้แล้ว'],['cancelled','ยกเลิก'],['all','ทั้งหมด']].map(([k,v]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter===k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditingOrder(null); setShowForm(!showForm) }} className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-indigo-700">
          + สร้าง SO ใหม่
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">{editingOrder ? `แก้ไข ${editingOrder.doc_number}` : 'สร้าง Sales Order'}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ลูกค้า *</label>
              <select value={form.contact_id} onChange={(e) => handleSelectContact(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">-- เลือกลูกค้า --</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">วันที่ *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {selectedContact && (
            <div className="bg-indigo-50 rounded-lg p-3 mb-4 text-sm">
              <div className="font-semibold text-indigo-900">{selectedContact.name}</div>
              {selectedContact.tax_id && <div className="text-indigo-600">Tax ID: {selectedContact.tax_id}</div>}
              {selectedContact.address && <div className="text-indigo-600">{selectedContact.address}</div>}
            </div>
          )}

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">รายการสินค้า/บริการ</label>
              <button onClick={addItem} className="text-indigo-600 text-sm hover:underline">+ เพิ่มรายการ</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-semibold w-1/2">รายละเอียด</th>
                  <th className="pb-2 font-semibold text-center w-1/6">จำนวน (ชิ้น)</th>
                  <th className="pb-2 font-semibold text-right w-1/4">ราคา/หน่วย (บาท)</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-2"><input className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="รายละเอียด" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} /></td>
                    <td className="py-2 px-2"><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center" type="number" min="1" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} /></td>
                    <td className="py-2 pl-2"><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-right" type="number" min="0" value={item.price} onChange={(e) => updateItem(i, 'price', e.target.value)} /></td>
                    <td className="py-2 pl-2 text-center"><button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 text-xl">×</button></td>
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
              <button onClick={cancelEdit} className="text-gray-500 text-sm hover:text-gray-700">ยกเลิก</button>
              <button onClick={saveOrder} disabled={saving} className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : editingOrder ? 'บันทึกการแก้ไข' : 'บันทึก SO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">🛒</div><div>ไม่มีรายการ</div></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${o.status === 'cancelled' ? 'bg-gray-50 border-gray-100 opacity-60' : 'border-gray-100 hover:border-indigo-100 hover:bg-indigo-50'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${o.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-indigo-600'}`}>{o.doc_number}</span>
                  <span className="font-semibold text-gray-900">{o.description}</span>
                </div>
                <div className="text-sm text-gray-400">{o.date}</div>
                {o.note && <div className="text-xs text-gray-400 mt-1">หมายเหตุ: {o.note}</div>}
                <div className="mt-1">{statusLabel(o.status)}</div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className="font-bold text-gray-900">฿{o.amount?.toLocaleString('th-TH', {minimumFractionDigits: 2})}</div>
                {o.status === 'open' && (
                  <div className="flex flex-col gap-1">
                    <button onClick={() => createInvoice(o)} className="bg-green-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-green-600 whitespace-nowrap">ออกใบแจ้งหนี้</button>
                    <button onClick={() => openEdit(o)} className="bg-indigo-100 text-indigo-700 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-indigo-200 whitespace-nowrap">✏️ แก้ไข</button>
                    <button onClick={() => cancelOrder(o)} className="bg-red-100 text-red-600 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-red-200 whitespace-nowrap">✕ ยกเลิก</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InvoiceTab({ companyId, company, onReceived }) {
  const [invoices, setInvoices] = useState([])
  const [filter, setFilter] = useState('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadInvoices() }, [companyId])

  const loadInvoices = async () => {
    const { data } = await supabase.from('transactions').select('*, contacts(*)').eq('company_id', companyId).eq('type', 'invoice').order('created_at', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }

  const genDocNumber = async () => {
    const year = new Date().getFullYear()
    const { data } = await supabase.from('transactions').select('doc_number').eq('company_id', companyId).eq('type', 'receipt').like('doc_number', `REC-${year}-%`).order('doc_number', { ascending: false }).limit(1)
    if (data && data.length > 0 && data[0].doc_number) {
      const lastNum = parseInt(data[0].doc_number.split('-')[2]) || 0
      return `REC-${year}-${String(lastNum + 1).padStart(4, '0')}`
    }
    return `REC-${year}-0001`
  }

  const cancelInvoice = async (inv) => {
    if (!confirm(`ยืนยันยกเลิก ${inv.doc_number}?\nSO ที่อ้างอิงจะกลับเป็น "เปิดอยู่" เพื่อออกใบใหม่ได้`)) return
    await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', inv.id)
    if (inv.ref_doc) {
      await supabase.from('transactions').update({ status: 'open' }).eq('company_id', companyId).eq('doc_number', inv.ref_doc)
    }
    await loadInvoices()
  }

  const receivePayment = async (inv) => {
    if (!confirm(`ยืนยันรับเงิน ฿${inv.amount?.toLocaleString('th-TH')} จาก ${inv.description}?`)) return
    const docNumber = await genDocNumber()
    const { error } = await supabase.from('transactions').insert([{
      company_id: companyId, type: 'receipt',
      date: new Date().toISOString().split('T')[0],
      description: inv.description, doc_number: docNumber,
      contact_id: inv.contact_id, amount: inv.amount,
      category: inv.category, note: inv.note,
      status: 'paid', ref_doc: inv.doc_number, items: inv.items,
    }])
    if (!error) {
      await supabase.from('transactions').update({ status: 'paid' }).eq('id', inv.id)
      await loadInvoices()
      onReceived()
      alert('บันทึกรับเงิน ' + docNumber + ' เรียบร้อยแล้ว')
    } else alert('เกิดข้อผิดพลาด: ' + error.message)
  }

  const openPrint = (inv) => window.open(`/invoice-print?id=${inv.id}`, '_blank')

  const filtered = invoices.filter(o => {
    if (filter === 'active') return o.status === 'open'
    if (filter === 'paid') return o.status === 'paid'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const statusLabel = (s) => {
    if (s === 'open') return <span className="text-xs text-orange-500 font-medium">● รอรับเงิน</span>
    if (s === 'paid') return <span className="text-xs text-green-500 font-medium">✓ รับเงินแล้ว</span>
    if (s === 'cancelled') return <span className="text-xs text-red-400 font-medium">✕ ยกเลิกแล้ว</span>
  }

  if (loading) return <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {[['active','รอรับเงิน'],['paid','รับเงินแล้ว'],['cancelled','ยกเลิก'],['all','ทั้งหมด']].map(([k,v]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter===k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-400">ออกจาก SO ได้เลย</div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🧾</div>
          <div>ไม่มีรายการ</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className={`p-4 rounded-xl border transition-all ${inv.status === 'cancelled' ? 'bg-gray-50 border-gray-100 opacity-60' : 'border-gray-100 hover:border-green-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${inv.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-green-600'}`}>{inv.doc_number}</span>
                    <span className="font-semibold text-gray-900">{inv.contacts?.name || inv.description}</span>
                    {inv.status === 'cancelled' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">VOID</span>}
                  </div>
                  {inv.contacts?.tax_id && <div className="text-xs text-gray-400">Tax ID: {inv.contacts.tax_id}</div>}
                  <div className="text-sm text-gray-400">{inv.date}</div>
                  {inv.ref_doc && <div className="text-xs text-gray-400">อ้างอิง: {inv.ref_doc}</div>}
                  <div className="mt-1">{statusLabel(inv.status)}</div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="font-bold text-gray-900 text-lg">฿{inv.amount?.toLocaleString('th-TH', {minimumFractionDigits: 2})}</div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => openPrint(inv)} className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-indigo-700 whitespace-nowrap">📄 พิมพ์</button>
                    {inv.status === 'open' && (
                      <>
                        <button onClick={() => receivePayment(inv)} className="bg-green-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-green-600 whitespace-nowrap">💰 รับเงิน</button>
                        <button onClick={() => cancelInvoice(inv)} className="bg-red-100 text-red-600 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-red-200 whitespace-nowrap">✕ ยกเลิก</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReceiptTab({ companyId, company }) {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('transactions').select('*, contacts(*)').eq('company_id', companyId).eq('type', 'receipt').order('created_at', { ascending: false })
      .then(({ data }) => { setReceipts(data || []); setLoading(false) })
  }, [companyId])

  const openPrint = (rec) => window.open(`/receipt-print?id=${rec.id}`, '_blank')

  if (loading) return <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-gray-900">ใบเสร็จรับเงิน</h2>
        <div className="text-sm text-gray-400">ออกอัตโนมัติเมื่อรับเงินแล้ว</div>
      </div>
      {receipts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">💰</div>
          <div>ยังไม่มีใบเสร็จ</div>
          <div className="text-sm mt-1">กด "รับเงิน" จากใบแจ้งหนี้ได้เลย</div>
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map((rec) => (
            <div key={rec.id} className="p-4 rounded-xl border border-gray-100 hover:border-indigo-100 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600 text-sm">{rec.doc_number}</span>
                    <span className="font-semibold text-gray-900">{rec.contacts?.name || rec.description}</span>
                  </div>
                  <div className="text-sm text-gray-400">{rec.date}</div>
                  {rec.ref_doc && <div className="text-xs text-gray-400">อ้างอิง: {rec.ref_doc}</div>}
                  <span className="text-xs text-green-500 font-medium">✓ รับเงินแล้ว</span>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="font-bold text-gray-900 text-lg">฿{rec.amount?.toLocaleString('th-TH', {minimumFractionDigits: 2})}</div>
                  <button onClick={() => openPrint(rec)} className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-indigo-700 whitespace-nowrap">📄 พิมพ์</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
