'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'

export default function AdminPage() {
  const { id } = useParams()
  const [company, setCompany] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: '', tax_id: '', address: '', phone: '', email: '', website: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data } = await supabase.from('companies').select('*').eq('id', id).single()
      if (data) {
        setCompany(data)
        setForm({
          name: data.name || '',
          tax_id: data.tax_id || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
        })
      }
    }
    init()
  }, [id])

  const saveSettings = async () => {
    setSaving(true)
    const { error } = await supabase.from('companies').update({
      name: form.name,
      tax_id: form.tax_id,
      address: form.address,
      phone: form.phone,
      email: form.email,
      website: form.website,
    }).eq('id', id)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else alert('เกิดข้อผิดพลาด: ' + error.message)
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => window.location.href = `/company/${id}`} className="text-gray-400 hover:text-gray-600">← กลับ</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚙️ ตั้งค่า</h1>
            <p className="text-gray-400 text-sm">ข้อมูลบริษัทสำหรับออกเอกสาร</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-6">ข้อมูลบริษัท (ผู้ขาย)</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อบริษัท *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="บริษัท xxxxxx จำกัด" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
              <input type="text" value={form.tax_id} onChange={(e) => setForm({...form, tax_id: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0000000000000 (13 หลัก)" maxLength={13} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ที่อยู่</label>
              <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3} placeholder="ที่อยู่สำหรับออกเอกสาร" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">เบอร์โทร</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0XX-XXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">อีเมล</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="email@company.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">เว็บไซต์</label>
              <input type="text" value={form.website} onChange={(e) => setForm({...form, website: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="www.company.com" />
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            {saved && <div className="text-green-600 text-sm font-semibold">✅ บันทึกเรียบร้อยแล้ว</div>}
            <div className="ml-auto">
              <button onClick={saveSettings} disabled={saving}
                className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
