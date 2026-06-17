'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const [companies, setCompanies] = useState([])
  const [user, setUser] = useState(null)
  const [newCompany, setNewCompany] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data } = await supabase.from('companies').select('*').order('created_at')
      setCompanies(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const addCompany = async () => {
    if (!newCompany.trim()) return
    setAdding(true)
    const { data, error } = await supabase.from('companies').insert([{ name: newCompany, owner_id: user.id }]).select()
    if (!error) { setCompanies([...companies, data[0]]); setNewCompany('') }
    else alert('error: ' + error.message)
    setAdding(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📒 My Accounting</h1>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500">ออกจากระบบ</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">➕ เพิ่มบริษัทใหม่</h2>
          <div className="flex gap-3">
            <input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCompany()}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ชื่อบริษัท / ร้านค้า" />
            <button onClick={addCompany} disabled={adding}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {adding ? '...' : 'เพิ่ม'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">🏢 บริษัทของคุณ</h2>
          {companies.length === 0 ? (
            <div className="text-center py-8 text-gray-400">ยังไม่มีบริษัท กรุณาเพิ่มบริษัทแรก</div>
          ) : (
            <div className="space-y-3">
              {companies.map((c) => (
                <button key={c.id} onClick={() => window.location.href = `/company/${c.id}`}
                  className="w-full text-left flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-lg">🏢</div>
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-400">คลิกเพื่อเข้าใช้งาน</div>
                    </div>
                  </div>
                  <span className="text-gray-300">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
