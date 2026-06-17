'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useParams } from 'next/navigation'

const MODULES = [
  { id: 'sale', icon: '🛒', label: 'ขาย', desc: 'SO / Invoice / รับเงิน' },
  { id: 'purchase', icon: '📦', label: 'จัดซื้อ', desc: 'PO / รับสินค้า / จ่ายเงิน' },
  { id: 'inventory', icon: '🏭', label: 'คลังสินค้า', desc: 'สต็อก / รับเข้า / จ่ายออก' },
  { id: 'ar', icon: '💰', label: 'ลูกหนี้', desc: 'AR / รับเงิน / Aging' },
  { id: 'ap', icon: '💳', label: 'เจ้าหนี้', desc: 'AP / จ่ายเงิน / Aging' },
  { id: 'accounting', icon: '📊', label: 'บัญชี', desc: 'Journal / งบการเงิน' },
  { id: 'ppe', icon: '🏗️', label: 'สินทรัพย์ถาวร', desc: 'PPE / ค่าเสื่อมราคา' },
  { id: 'report', icon: '📈', label: 'รายงาน', desc: 'งบการเงิน / Export' },
  { id: 'admin', icon: '⚙️', label: 'ตั้งค่า', desc: 'User / สิทธิ์ / ข้อมูลบริษัท' },
]

export default function CompanyPage() {
  const { id } = useParams()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data } = await supabase.from('companies').select('*').eq('id', id).single()
      if (!data) { window.location.href = '/dashboard'; return }
      setCompany(data)
      setLoading(false)
    }
    init()
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => window.location.href = '/dashboard'} className="text-gray-400 hover:text-gray-600">← กลับ</button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏢 {company?.name}</h1>
              <p className="text-gray-400 text-sm">เลือก Module ที่ต้องการใช้งาน</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => window.location.href = `/company/${id}/${m.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 text-left hover:border-indigo-200 hover:shadow-md transition-all group"
            >
              <div className="text-3xl mb-3">{m.icon}</div>
              <div className="font-bold text-gray-900 group-hover:text-indigo-600">{m.label}</div>
              <div className="text-xs text-gray-400 mt-1">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
