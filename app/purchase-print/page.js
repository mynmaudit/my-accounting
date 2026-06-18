'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useSearchParams } from 'next/navigation'

function PurchasePrint() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const type = searchParams.get('type') || 'po'
  const [doc, setDoc] = useState(null)
  const [company, setCompany] = useState(null)

  useEffect(() => {
    const init = async () => {
      const table = type === 'gr' ? 'purchase_receipts' : 'purchase_orders'
      const { data } = await supabase.from(table).select('*, contacts(*)').eq('id', id).single()
      const { data: comp } = await supabase.from('companies').select('*').eq('id', data?.company_id).single()
      setDoc(data); setCompany(comp)
    }
    if (id) init()
  }, [id, type])

  useEffect(() => { if (doc && company) setTimeout(() => window.print(), 800) }, [doc, company])

  if (!doc || !company) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>กำลังโหลด...</div>

  const items = doc.items ? JSON.parse(doc.items) : []
  const subtotal = items.reduce((s,i) => s + Number(i.qty)*Number(i.price), 0)
  const vatEnabled = company.vat_enabled !== false
  const vat = type === 'gr' && vatEnabled ? subtotal * 0.07 : 0
  const total = subtotal + vat
  const contact = doc.contacts
  const isGR = type === 'gr'
  const color = isGR ? '#10b981' : '#4f46e5'
  const title = isGR ? 'ใบรับสินค้า' : 'ใบสั่งซื้อ'
  const titleEn = isGR ? 'GOODS RECEIPT' : 'PURCHASE ORDER'

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } } * { font-family: 'Sarabun', sans-serif; }`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet" />
      <div className="no-print" style={{position:'fixed',top:16,right:16,zIndex:50,display:'flex',gap:8}}>
        <button onClick={() => window.print()} style={{background:color,color:'white',padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer'}}>🖨️ พิมพ์ / PDF</button>
        <button onClick={() => window.close()} style={{background:'#e5e7eb',color:'#374151',padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer'}}>✕ ปิด</button>
      </div>
      <div style={{maxWidth:794,margin:'0 auto',padding:'40px',fontSize:13}}>
        <div style={{textAlign:'center',marginBottom:24,borderBottom:`2px solid ${color}`,paddingBottom:16}}>
          <div style={{fontSize:22,fontWeight:700,color}}>{title}</div>
          <div style={{fontSize:14,color:'#6b7280'}}>{titleEn}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:24}}>
          <div style={{background:'#f9fafb',borderRadius:8,padding:16}}>
            <div style={{fontWeight:700,color,marginBottom:8}}>{isGR ? 'ผู้รับสินค้า' : 'ผู้สั่งซื้อ'}</div>
            <div style={{fontWeight:600}}>{company.name}</div>
            {company.address && <div style={{color:'#6b7280',marginTop:4}}>{company.address}</div>}
            {company.tax_id && <div style={{marginTop:4}}>เลขผู้เสียภาษี: <b>{company.tax_id}</b></div>}
            {company.phone && <div>โทร: {company.phone}</div>}
          </div>
          <div style={{background:'#f9fafb',borderRadius:8,padding:16}}>
            <div style={{fontWeight:700,color,marginBottom:8}}>{isGR ? 'ผู้ส่งสินค้า' : 'ซัพพลายเออร์'}</div>
            <div style={{fontWeight:600}}>{contact?.name}</div>
            {contact?.address && <div style={{color:'#6b7280',marginTop:4}}>{contact.address}</div>}
            {contact?.tax_id && <div style={{marginTop:4}}>เลขผู้เสียภาษี: <b>{contact.tax_id}</b></div>}
            {contact?.phone && <div>โทร: {contact.phone}</div>}
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16,gap:32}}>
          <div><span style={{color:'#6b7280'}}>เลขที่: </span><b>{doc.doc_number}</b></div>
          <div><span style={{color:'#6b7280'}}>วันที่: </span><b>{doc.date}</b></div>
          {doc.ref_doc && <div><span style={{color:'#6b7280'}}>อ้างอิง PO: </span><b>{doc.ref_doc}</b></div>}
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16}}>
          <thead>
            <tr style={{background:color,color:'white'}}>
              <th style={{padding:'10px 12px',textAlign:'left',width:40}}>#</th>
              <th style={{padding:'10px 12px',textAlign:'left',width:120}}>รหัสซัพพลายเออร์</th>
              <th style={{padding:'10px 12px',textAlign:'left'}}>รายละเอียด</th>
              <th style={{padding:'10px 12px',textAlign:'center',width:80}}>จำนวน</th>
              <th style={{padding:'10px 12px',textAlign:'center',width:60}}>หน่วย</th>
              <th style={{padding:'10px 12px',textAlign:'right',width:120}}>ราคา/หน่วย</th>
              <th style={{padding:'10px 12px',textAlign:'right',width:120}}>รวม</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item,i) => (
              <tr key={i} style={{borderBottom:'1px solid #e5e7eb',background:i%2===0?'#fff':'#f9fafb'}}>
                <td style={{padding:'10px 12px'}}>{i+1}</td>
                <td style={{padding:'10px 12px',color:'#6b7280',fontFamily:'monospace',fontSize:12}}>{item.supplier_code||'-'}</td>
                <td style={{padding:'10px 12px'}}>{item.description}</td>
                <td style={{padding:'10px 12px',textAlign:'center'}}>{item.qty}</td>
                <td style={{padding:'10px 12px',textAlign:'center'}}>{item.unit}</td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>{Number(item.price).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>{(Number(item.qty)*Number(item.price)).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:32}}>
          <div style={{width:280}}>
            {vat > 0 && <>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #e5e7eb'}}><span style={{color:'#6b7280'}}>ราคาก่อนภาษี</span><span>฿{subtotal.toLocaleString('th-TH',{minimumFractionDigits:2})}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #e5e7eb'}}><span style={{color:'#6b7280'}}>ภาษีมูลค่าเพิ่ม 7%</span><span>฿{vat.toLocaleString('th-TH',{minimumFractionDigits:2})}</span></div>
            </>}
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontWeight:700,fontSize:16,color}}><span>รวมทั้งสิ้น</span><span>฿{total.toLocaleString('th-TH',{minimumFractionDigits:2})}</span></div>
          </div>
        </div>
        {doc.note && <div style={{marginBottom:32,padding:12,background:'#f9fafb',borderRadius:8}}><span style={{color:'#6b7280'}}>หมายเหตุ: </span>{doc.note}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginTop:40}}>
          <div style={{textAlign:'center'}}><div style={{borderTop:'1px solid #9ca3af',paddingTop:8,color:'#6b7280'}}>{isGR ? 'ลงชื่อผู้รับสินค้า' : 'ลงชื่อผู้สั่งซื้อ'}</div><div style={{marginTop:4,color:'#9ca3af',fontSize:12}}>วันที่ ................................</div></div>
          <div style={{textAlign:'center'}}><div style={{borderTop:'1px solid #9ca3af',paddingTop:8,color:'#6b7280'}}>{isGR ? 'ลงชื่อผู้ส่งสินค้า' : 'ลงชื่อซัพพลายเออร์'}</div><div style={{marginTop:4,color:'#9ca3af',fontSize:12}}>วันที่ ................................</div></div>
        </div>
      </div>
    </>
  )
}

export default function PurchasePrintPage() {
  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>กำลังโหลด...</div>}>
      <PurchasePrint />
    </Suspense>
  )
}
