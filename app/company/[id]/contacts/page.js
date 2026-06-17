'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'

export default function ContactsPage() {
  const { id } = useParams()
  const [contacts, setContacts] = useState([])
  const [company, setCompany] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', tax_id: '', address: '', phone: '', email: '',
    contact_type: 'customer', credit_limit: 0, credit_days: 30
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data } = await supabase.from('companies').select('*').eq('id', id).single()
      setCompany(data)
      loadContacts()
    }
    init()
  }, [id])

  const loadContacts = async () => {
    const { data } = await supabase.from('contacts').select('*').eq('company_id', id).order('code')
    setContacts(data || [])
  }

  const genCode = async (type) => {
    const prefix = type === 'customer' ? 'C' : 'V'
    const { data } = await supabase.from('contacts').select('code').eq('company_id', id).eq('contact_type', type).like('code', `${prefix}-%`).order('code', { ascending: false }).limit(1)
    if (data && data.length > 0 && data[0].code) {
      const lastNum = parseInt(data[0].code.split('-')[1]) || 0
      return `${prefix}-${String(lastNum + 1).padStart(4, '0')}`
    }
    return `${prefix}-0001`
  }

  const saveContact = async () => {
    if (!form.name) return alert('กรุณากรอกชื่อ')
    setSaving(true)
    const code = await genCode(form.contact_type)
    const { error } = await supabase.from('contacts').insert([{ ...form, company_id: id, code }])
    if (!error) {
      await loadContacts()
      setShowForm(false)
      setForm({ name: '', tax_id: '', address: '', phone: '', email: '', contact_type: 'customer', credit_limit: 0, credit_days: 30 })
    } else alert('เกิดข้อผิดพลาด: ' + error.message)
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => window.location.href = `/company/${id}`} className="text-gray-400 hover:text-gray-600">← กลับ</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">👥 คู่ค้า</h1>
            <p className="text-gray-400 text-sm">{company?.name}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-gray-900">รายชื่อคู่ค้า</h2>
            <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-indigo-700">
              + เพิ่มคู่ค้าใหม่
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">เพิ่มคู่ค้าใหม่</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ประเภท</label>
                  <select value={form.contact_type} onChange={(e) => setForm({...form, contact_type: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="customer">ลูกค้า</option>
                    <option value="supplier">ซัพพลายเออร์</option>
                    <option value="both">ทั้งสองอย่าง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อบริษัท/บุคคล *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ชื่อ" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">เลขผู้เสียภาษี (Tax ID)</label>
                  <input type="text" value={form.tax_id} onChange={(e) => setForm({...form, tax_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0000000000000" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">เบอร์โทร</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0XX-XXXXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">อีเมล</label>
                  <input type="text" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Credit Limit (บาท)</label>
                  <input type="number" value={form.credit_limit} onChange={(e) => setForm({...form, credit_limit: +e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Credit Days (วัน)</label>
                  <input type="number" value={form.credit_days} onChange={(e) => setForm({...form, credit_days: +e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">ที่อยู่</label>
                <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="ที่อยู่สำหรับออกเอกสาร" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowForm(false)} className="text-gray-500 text-sm hover:text-gray-700">ยกเลิก</button>
                <button onClick={saveContact} disabled={saving} className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">👥</div>
              <div>ยังไม่มีคู่ค้า</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-3 font-semibold">รหัส</th>
                    <th className="pb-3 font-semibold">ชื่อ</th>
                    <th className="pb-3 font-semibold">ประเภท</th>
                    <th className="pb-3 font-semibold">Tax ID</th>
                    <th className="pb-3 font-semibold">เบอร์โทร</th>
                    <th className="pb-3 font-semibold text-right">Credit Limit</th>
                    <th className="pb-3 font-semibold text-center">Credit Days</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-mono text-indigo-600">{c.code}</td>
                      <td className="py-3 font-semibold text-gray-900">{c.name}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.contact_type === 'customer' ? 'bg-blue-100 text-blue-700' : c.contact_type === 'supplier' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                          {c.contact_type === 'customer' ? 'ลูกค้า' : c.contact_type === 'supplier' ? 'ซัพพลายเออร์' : 'ทั้งสองอย่าง'}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">{c.tax_id || '-'}</td>
                      <td className="py-3 text-gray-500">{c.phone || '-'}</td>
                      <td className="py-3 text-right text-gray-900">฿{c.credit_limit?.toLocaleString('th-TH')}</td>
                      <td className="py-3 text-center text-gray-500">{c.credit_days} วัน</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
