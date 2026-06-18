'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createJournalEntry } from '@/lib/journal'

const today = new Date().toISOString().split('T')[0]
const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const emptyItem = { description: '', qty: 1, price: 0, product_id: null, unit: '' }

export default function PurchasePage() {
  const { id: companyId } = useParams()
  const [activeTab, setActiveTab] = useState('po')
  const [company, setCompany] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single()
      setCompany(data)
    }
    init()
  }, [companyId])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => window.location.href = `/company/${companyId}`} className="text-gray-400 hover:text-gray-600">← กลับ</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛒 Module จัดซื้อ</h1>
            <p className="text-gray-400 text-sm">{company?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8 bg-white rounded-2xl p-4 border border-gray-100">
          {[['po','📋 Purchase Order'],['receipt','📦 รับสินค้า'],['journal','📒 บันทึกบัญชี']].map(([k,v], i, arr) => (
            <div key={k} className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setActiveTab(k)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === k ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {v}
              </button>
              {i < arr.length - 1 && <span className="text-gray-300">→</span>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {activeTab === 'po' && <POTab companyId={companyId} company={company} onReceive={() => setActiveTab('receipt')} />}
          {activeTab === 'receipt' && <ReceiptTab companyId={companyId} company={company} />}
          {activeTab === 'journal' && <JournalTab companyId={companyId} />}
        </div>
      </div>
    </div>
  )
}

function ProductSearchInput({ value, onChange, products }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = products.filter(p => p.is_active && (
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.code.toLowerCase().includes(query.toLowerCase())
  )).slice(0, 8)

  const handleSelect = (p) => {
    setQuery(p.name)
    setOpen(false)
    onChange({ description: p.name, price: p.cost_price, product_id: p.id, unit: p.unit })
  }

  return (
    <div ref={ref} className="relative w-full">
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        placeholder="ค้นหาหรือพิมพ์รายละเอียด"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} type="button" onMouseDown={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm flex items-center justify-between border-b border-gray-50 last:border-0">
              <div><span className="font-medium text-gray-800">{p.name}</span><span className="ml-2 text-xs text-gray-400">{p.code}</span></div>
              <div className="text-right"><div className="text-indigo-600 font-semibold text-xs">฿{Number(p.cost_price).toLocaleString('th-TH', {minimumFractionDigits:2})}</div><div className="text-gray-400 text-xs">{p.unit}</div></div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function POTab({ companyId, company, onReceive }) {
  const [orders, setOrders] = useState([])
  const [contacts, setContacts] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [filter, setFilter] = useState('active')
  const [dateFrom, setDateFrom] = useState(firstDay)
  const [dateTo, setDateTo] = useState(today)
  const [form, setForm] = useState({ contact_id: '', date: today, note: '' })
  const [items, setItems] = useState([{ ...emptyItem }])
  const [selectedContact, setSelectedContact] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadOrders(); loadContacts(); loadProducts() }, [companyId, dateFrom, dateTo])

  const loadOrders = async () => {
    const { data } = await supabase.from('purchase_orders').select('*, contacts(code,name)').eq('company_id', companyId).gte('date', dateFrom).lte('date', dateTo).order('date', { ascending: false })
    setOrders(data || [])
  }

  const loadContacts = async () => {
    const { data } = await supabase.from('contacts').select('*').eq('company_id', companyId).in('contact_type', ['supplier','both']).order('code')
    setContacts(data || [])
  }

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('company_id', companyId).eq('is_active', true).order('code')
    setProducts(data || [])
  }

  const genDocNumber = async () => {
    const year = new Date().getFullYear()
    const { data } = await supabase.from('purchase_orders').select('doc_number').eq('company_id', companyId).like('doc_number', `PO-${year}-%`).order('doc_number', { ascending: false }).limit(1)
    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].doc_number.split('-')[2]) || 0
      return `PO-${year}-${String(lastNum + 1).padStart(4, '0')}`
    }
    return `PO-${year}-0001`
  }

  const total = items.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0)
  const addItem = () => setItems([...items, { ...emptyItem }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, k, v) => { const n = [...items]; n[i][k] = v; setItems(n) }
  const handleSelectProduct = (i, selected) => {
    const n = [...items]
    n[i].description = selected.description
    n[i].product_id = selected.product_id || null
    n[i].unit = selected.unit || ''
    if (selected.price !== null) n[i].price = selected.price
    setItems(n)
  }

  const cancelEdit = () => {
    setEditingOrder(null); setShowForm(false)
    setForm({ contact_id: '', date: today, note: '' })
    setItems([{ ...emptyItem }]); setSelectedContact(null)
  }

  const openEdit = (order) => {
    setEditingOrder(order)
    setForm({ contact_id: order.contact_id, date: order.date, note: order.note || '' })
    setSelectedContact(contacts.find(c => c.id === order.contact_id))
    setItems(order.items ? JSON.parse(order.items) : [{ ...emptyItem }])
    setShowForm(true); setExpandedId(null)
  }

  const saveOrder = async () => {
    if (!form.contact_id) return alert('กรุณาเลือกซัพพลายเออร์')
    if (total <= 0) return alert('กรุณากรอกรายการสินค้าและราคา')
    setSaving(true)
    if (editingOrder) {
      await supabase.from('purchase_orders').update({
        date: form.date, contact_id: form.contact_id,
        amount: total, note: form.note, items: JSON.stringify(items),
      }).eq('id', editingOrder.id)
    } else {
      const docNumber = await genDocNumber()
      await supabase.from('purchase_orders').insert([{
        company_id: companyId, doc_number: docNumber,
        date: form.date, contact_id: form.contact_id,
        amount: total, note: form.note, status: 'open',
        items: JSON.stringify(items),
      }])
    }
    setSaving(false); await loadOrders(); cancelEdit()
  }

  const cancelOrder = async (order) => {
    if (!confirm(`ยืนยันยกเลิก ${order.doc_number}?`)) return
    await supabase.from('purchase_orders').update({ status: 'cancelled' }).eq('id', order.id)
    await loadOrders()
  }

  const receiveGoods = async (order) => {
    const year = new Date().getFullYear()
    const { data } = await supabase.from('purchase_receipts').select('doc_number').eq('company_id', companyId).like('doc_number', `GR-${year}-%`).order('doc_number', { ascending: false }).limit(1)
    let docNumber = `GR-${year}-0001`
    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].doc_number.split('-')[2]) || 0
      docNumber = `GR-${year}-${String(lastNum + 1).padStart(4, '0')}`
    }
    const vatEnabled = company?.vat_enabled !== false
    const vat = vatEnabled ? order.amount * 0.07 : 0
    const totalAmt = order.amount + vat
    const contactName = order.contacts?.name || ''
    const orderItems = order.items ? JSON.parse(order.items) : []

    const { error } = await supabase.from('purchase_receipts').insert([{
      company_id: companyId, doc_number: docNumber,
      date: today, contact_id: order.contact_id,
      po_id: order.id, ref_doc: order.doc_number,
      amount: totalAmt, note: order.note,
      status: 'received', items: order.items,
    }])

    if (!error) {
      await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', order.id)

      for (const item of orderItems) {
        if (!item.product_id) continue
        const { data: prod } = await supabase.from('products').select('stock_qty, cost_price').eq('id', item.product_id).single()
        if (!prod) continue
        const newQty = prod.stock_qty + Number(item.qty)
        const newCost = ((prod.stock_qty * prod.cost_price) + (Number(item.qty) * Number(item.price))) / newQty
        await supabase.from('products').update({ stock_qty: newQty, cost_price: newCost }).eq('id', item.product_id)
        await supabase.from('stock_movements').insert({
          company_id: companyId, product_id: item.product_id,
          movement_type: 'in', ref_type: 'purchase', ref_doc: docNumber,
          qty: Number(item.qty), cost_price: Number(item.price),
          balance_qty: newQty, note: `รับสินค้า ${item.description}`,
        })
      }

      const lines = vatEnabled ? [
        { account_code: '1300', account_name: 'สินค้าคงเหลือ', debit: order.amount, credit: 0 },
        { account_code: '2200', account_name: 'ภาษีมูลค่าเพิ่มซื้อ', debit: vat, credit: 0 },
        { account_code: '2100', account_name: `เจ้าหนี้การค้า (${contactName})`, debit: 0, credit: totalAmt },
      ] : [
        { account_code: '1300', account_name: 'สินค้าคงเหลือ', debit: order.amount, credit: 0 },
        { account_code: '2100', account_name: `เจ้าหนี้การค้า (${contactName})`, debit: 0, credit: order.amount },
      ]
      await createJournalEntry({
        companyId, refDoc: docNumber, refType: 'purchase', date: today,
        description: `บันทึกรับสินค้า ตาม ${docNumber} อ้างอิง ${order.doc_number} - ${contactName}`,
        lines,
      })
      await loadOrders(); onReceive()
      alert('รับสินค้า ' + docNumber + ' เรียบร้อยแล้ว')
    }
  }

  const filtered = orders.filter(o => {
    if (filter === 'active') return o.status === 'open'
    if (filter === 'received') return o.status === 'received'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
  })

  const statusLabel = (s) => {
    if (s === 'open') return <span className="text-xs text-green-500 font-medium">● เปิดอยู่</span>
    if (s === 'received') return <span className="text-xs text-gray-400 font-medium">✓ รับสินค้าแล้ว</span>
    if (s === 'cancelled') return <span className="text-xs text-red-400 font-medium">✕ ยกเลิกแล้ว</span>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {[['active','เปิดอยู่'],['received','รับสินค้าแล้ว'],['cancelled','ยกเลิก'],['all','ทั้งหมด']].map(([k,v]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter===k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditingOrder(null); setShowForm(!showForm) }} className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-indigo-700">
          + สร้าง PO ใหม่
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        <span className="text-gray-400">ถึง</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">{editingOrder ? `แก้ไข ${editingOrder.doc_number}` : 'สร้าง Purchase Order'}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ซัพพลายเออร์ *</label>
              <select value={form.contact_id} onChange={e => { setForm({...form, contact_id: e.target.value}); setSelectedContact(contacts.find(c => c.id === e.target.value)) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">-- เลือกซัพพลายเออร์ --</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">วันที่ *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
              <label className="text-sm font-semibold text-gray-700">รายการสินค้า</label>
              <button onClick={addItem} className="text-indigo-600 text-sm hover:underline">+ เพิ่มรายการ</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-semibold" style={{width:'45%'}}>สินค้า</th>
                  <th className="pb-2 font-semibold text-center" style={{width:'10%'}}>หน่วย</th>
                  <th className="pb-2 font-semibold text-center" style={{width:'15%'}}>จำนวน</th>
                  <th className="pb-2 font-semibold text-right" style={{width:'20%'}}>ราคา/หน่วย</th>
                  <th className="pb-2 font-semibold text-right" style={{width:'10%'}}>รวม</th>
                  <th style={{width:'32px'}}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-2"><ProductSearchInput value={item.description} products={products} onChange={s => handleSelectProduct(i, s)} />{item.product_id && <div className="text-xs text-indigo-400 mt-0.5 pl-1">📦 เชื่อมสินค้าแล้ว</div>}</td>
                    <td className="py-2 px-1"><input className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center" value={item.unit||''} onChange={e => updateItem(i,'unit',e.target.value)} placeholder="หน่วย" /></td>
                    <td className="py-2 px-1"><input type="number" min="1" step="any" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center" value={item.qty} onChange={e => updateItem(i,'qty',e.target.value)} /></td>
                    <td className="py-2 pl-1"><input type="number" min="0" step="0.01" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-right" value={item.price} onChange={e => updateItem(i,'price',e.target.value)} /></td>
                    <td className="py-2 pl-2 text-right text-gray-700 font-medium whitespace-nowrap">{(Number(item.qty)*Number(item.price)).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
                    <td className="py-2 pl-1 text-center"><button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 text-xl">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">หมายเหตุ</label>
            <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="หมายเหตุ (ถ้ามี)" />
          </div>
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold text-gray-900">รวม: ฿{total.toLocaleString('th-TH',{minimumFractionDigits:2})}</div>
            <div className="flex gap-3">
              <button onClick={cancelEdit} className="text-gray-500 text-sm hover:text-gray-700">ยกเลิก</button>
              <button onClick={saveOrder} disabled={saving} className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">{saving ? 'กำลังบันทึก...' : editingOrder ? 'บันทึกการแก้ไข' : 'บันทึก PO'}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">📋</div><div>ไม่มีรายการ</div></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className={`rounded-xl border transition-all ${o.status==='cancelled' ? 'bg-gray-50 border-gray-100 opacity-60' : 'border-gray-100 hover:border-indigo-100'}`}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId===o.id ? null : o.id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${o.status==='cancelled' ? 'text-gray-400 line-through' : 'text-indigo-600'}`}>{o.doc_number}</span>
                    <span className="font-semibold text-gray-900">{o.contacts?.name}</span>
                    <span className="text-gray-400 text-xs">{expandedId===o.id ? '▲' : '▼'}</span>
                  </div>
                  <div className="text-sm text-gray-400">{o.date}</div>
                  {o.note && <div className="text-xs text-gray-400 mt-1">หมายเหตุ: {o.note}</div>}
                  <div className="mt-1">{statusLabel(o.status)}</div>
                </div>
                <div className="text-right flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <div className="font-bold text-gray-900">฿{o.amount?.toLocaleString('th-TH',{minimumFractionDigits:2})}</div>
                  {o.status==='open' && (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => receiveGoods(o)} className="bg-green-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-green-600 whitespace-nowrap">📦 รับสินค้า</button>
                      <button onClick={() => openEdit(o)} className="bg-indigo-100 text-indigo-700 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-indigo-200 whitespace-nowrap">✏️ แก้ไข</button>
                      <button onClick={() => cancelOrder(o)} className="bg-red-100 text-red-600 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-red-200 whitespace-nowrap">✕ ยกเลิก</button>
                    </div>
                  )}
                </div>
              </div>
              {expandedId===o.id && o.items && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <table className="w-full text-sm mt-3">
                    <thead><tr className="text-gray-500 border-b border-gray-100"><th className="text-left pb-2">รายการ</th><th className="text-center pb-2">จำนวน</th><th className="text-right pb-2">ราคา/หน่วย</th><th className="text-right pb-2">รวม</th></tr></thead>
                    <tbody>{JSON.parse(o.items).map((item,i) => <tr key={i} className="border-b border-gray-50"><td className="py-2">{item.description}</td><td className="py-2 text-center">{item.qty} {item.unit}</td><td className="py-2 text-right">{Number(item.price).toLocaleString('th-TH',{minimumFractionDigits:2})}</td><td className="py-2 text-right font-medium">{(Number(item.qty)*Number(item.price)).toLocaleString('th-TH',{minimumFractionDigits:2})}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReceiptTab({ companyId }) {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(firstDay)
  const [dateTo, setDateTo] = useState(today)

  useEffect(() => { loadReceipts() }, [companyId, dateFrom, dateTo])

  const loadReceipts = async () => {
    setLoading(true)
    const { data } = await supabase.from('purchase_receipts').select('*, contacts(code,name)').eq('company_id', companyId).gte('date', dateFrom).lte('date', dateTo).order('date', { ascending: false })
    setReceipts(data || [])
    setLoading(false)
  }

  if (loading) return <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="font-bold text-gray-900">📦 รายการรับสินค้า</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
          <span className="text-gray-400">ถึง</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
      </div>
      {receipts.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">📦</div><div>ไม่มีรายการ</div></div>
      ) : (
        <div className="space-y-3">
          {receipts.map(r => (
            <div key={r.id} className="p-4 rounded-xl border border-gray-100 hover:border-indigo-100 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600 text-sm">{r.doc_number}</span>
                    <span className="font-semibold text-gray-900">{r.contacts?.name}</span>
                  </div>
                  <div className="text-sm text-gray-400">{r.date}</div>
                  {r.ref_doc && <div className="text-xs text-gray-400">อ้างอิง PO: {r.ref_doc}</div>}
                  <span className="text-xs text-green-500 font-medium">✓ รับสินค้าแล้ว</span>
                </div>
                <div className="font-bold text-gray-900 text-lg">฿{r.amount?.toLocaleString('th-TH',{minimumFractionDigits:2})}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function JournalTab({ companyId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(firstDay)
  const [dateTo, setDateTo] = useState(today)

  useEffect(() => { loadEntries() }, [companyId, dateFrom, dateTo])

  const loadEntries = async () => {
    setLoading(true)
    const { data } = await supabase.from('journal_entries').select('*, journal_lines(*)').eq('company_id', companyId).eq('ref_type', 'purchase').gte('date', dateFrom).lte('date', dateTo).order('date', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  if (loading) return <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="font-bold text-gray-900">📒 สมุดรายวันจัดซื้อ</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
          <span className="text-gray-400">ถึง</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">📒</div><div>ไม่มีรายการ</div></div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-indigo-50 px-4 py-3 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600 text-sm">{entry.ref_doc}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-100 text-blue-700">จัดซื้อ</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{entry.description}</div>
                </div>
                <div className="text-sm text-gray-400">{entry.date}</div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2 text-left font-semibold">รหัส</th>
                    <th className="px-4 py-2 text-left font-semibold">ชื่อบัญชี</th>
                    <th className="px-4 py-2 text-right font-semibold">เดบิต (Dr)</th>
                    <th className="px-4 py-2 text-right font-semibold">เครดิต (Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.journal_lines?.map((line, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-4 py-2 text-gray-500 font-mono">{line.account_code}</td>
                      <td className={`px-4 py-2 ${line.debit > 0 ? '' : 'pl-8 text-gray-500'}`}>{line.account_name}</td>
                      <td className="px-4 py-2 text-right">{line.debit > 0 ? `฿${line.debit.toLocaleString('th-TH',{minimumFractionDigits:2})}` : '-'}</td>
                      <td className="px-4 py-2 text-right">{line.credit > 0 ? `฿${line.credit.toLocaleString('th-TH',{minimumFractionDigits:2})}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={2} className="px-4 py-2 text-gray-700">รวม</td>
                    <td className="px-4 py-2 text-right text-indigo-600">฿{entry.journal_lines?.reduce((s,l) => s+l.debit,0).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
                    <td className="px-4 py-2 text-right text-indigo-600">฿{entry.journal_lines?.reduce((s,l) => s+l.credit,0).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
