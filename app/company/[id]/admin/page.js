'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useParams } from 'next/navigation'

export default function AdminPage() {
  const { id } = useParams()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: '', tax_id: '', address: '', phone: '', email: '', website: '', vat_enabled: true
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data } = await supabase.from('companies').select('*').eq('id', id).single()
      if (data) setForm({
        name: data.name || '', tax_id: data.tax_id || '',
        address: data.address || '', phone: data.phone || '',
        email: data.email || '', website: data.website || '',
        vat_enabled: data.vat_enabled !== false,
      })
    }
    init()
  }, [id])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('companies').update(form).eq('id', id)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else alert('เกิดข้อผิดพลาด: ' + error.message)
    setSaving(false)
  }

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

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

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <h2 className="font-bold text-gray-900 mb-4">ข้อมูลบริษัท (ผู้ขาย)</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อบริษัท *</label><input className={inp} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="บริษัท xxxxxx จำกัด" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">เลข Tax ID</label><input className={inp} value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} placeholder="0000000000000" maxLength={13} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">ที่อยู่</label><textarea className={inp} rows={3} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="ที่อยู่สำหรับออกเอกสาร" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">เบอร์โทร</label><input className={inp} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="0XX-XXXXXXX" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1">อีเมล</label><input className={inp} value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@company.com" /></div>
            </div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">เว็บไซต์</label><input className={inp} value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="www.company.com" /></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">การตั้งค่าภาษี</h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <div className="font-semibold text-gray-900">ภาษีมูลค่าเพิ่ม (VAT 7%)</div>
              <div className="text-sm text-gray-500 mt-1">
                {form.vat_enabled ? '✅ เปิด — Invoice จะคิด VAT 7% อัตโนมัติ' : '❌ ปิด — ออกแค่ใบเสร็จรับเงิน ไม่มี VAT'}
              </div>
            </div>
            <button onClick={() => setForm({...form, vat_enabled: !form.vat_enabled})}
              style={{width:52,height:28,borderRadius:14,border:'none',cursor:'pointer',background:form.vat_enabled?'#4f46e5':'#d1d5db',position:'relative',transition:'background 0.2s'}}>
              <div style={{width:22,height:22,borderRadius:11,background:'white',position:'absolute',top:3,left:form.vat_enabled?27:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
            </button>
          </div>
          {!form.vat_enabled && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
              ⚠️ เมื่อปิด VAT เอกสารที่ออกจะเป็น <b>ใบเสร็จรับเงิน</b> เท่านั้น
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          {saved && <div className="text-green-600 text-sm font-semibold">✅ บันทึกเรียบร้อยแล้ว</div>}
          <div className="ml-auto">
            <button onClick={save} disabled={saving} className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
