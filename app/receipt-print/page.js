'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useSearchParams } from 'next/navigation'

function ReceiptPrint() {
  const searchParams = useSearchParams()
  const recId = searchParams.get('id')
  const [rec, setRec] = useState(null)
  const [company, setCompany] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: recData } = await supabase.from('transactions').select('*, contacts(*)').eq('id', recId).single()
      const { data: compData } = await supabase.from('companies').select('*').eq('id', recData?.company_id).single()
      setRec(recData)
      setCompany(compData)
    }
    if (recId) init()
  }, [recId])

  useEffect(() => {
    if (rec && company) setTimeout(() => window.print(), 800)
  }, [rec, company])

  if (!rec || !company) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>กำลังโหลด...</div>

  const items = rec.items ? JSON.parse(rec.items) : [{ description: rec.description, qty: 1, price: rec.amount }]
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0)
  const vatEnabled = company.vat_enabled !== false
  const vat = vatEnabled ? subtotal * 0.07 : 0
  const total = subtotal + vat
  const contact = rec.contacts

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } } * { font-family: 'Sarabun', sans-serif; }`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet" />

      <div className="no-print" style={{position:'fixed',top:16,right:16,zIndex:50,display:'flex',gap:8}}>
        <button onClick={() => window.print()} style={{background:'#4f46e5',color:'white',padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer'}}>🖨️ พิมพ์ / PDF</button>
        <button onClick={() => window.close()} style={{background:'#e5e7eb',color:'#374151',padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer'}}>✕ ปิด</button>
      </div>

      <div style={{maxWidth:794,margin:'0 auto',padding:'40px',fontSize:13}}>
        <div style={{textAlign:'center',marginBottom:24,borderBottom:'2px solid #10b981',paddingBottom:16}}>
          <div style={{fontSize:22,fontWeight:700,color:'#10b981'}}>ใบเสร็จรับเงิน</div>
          <div style={{fontSize:14,color:'#6b7280'}}>RECEIPT</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:24}}>
          <div style={{background:'#f0fdf4',borderRadius:8,padding:16}}>
            <div style={{fontWeight:700,color:'#10b981',marginBottom:8}}>ผู้รับเงิน</div>
            <div style={{fontWeight:600}}>{company.name}</div>
            {company.address && <div style={{color:'#6b7280',marginTop:4}}>{company.address}</div>}
            {company.tax_id && <div style={{marginTop:4}}>เลขผู้เสียภาษี: <b>{company.tax_id}</b></div>}
            {company.phone && <div>โทร: {company.phone}</div>}
          </div>
          <div style={{background:'#f0fdf4',borderRadius:8,padding:16}}>
            <div style={{fontWeight:700,color:'#10b981',marginBottom:8}}>ผู้จ่ายเงิน</div>
            <div style={{fontWeight:600}}>{contact?.name || rec.description}</div>
            {contact?.address && <div style={{color:'#6b7280',marginTop:4}}>{contact.address}</div>}
            {contact?.tax_id && <div style={{marginTop:4}}>เลขผู้เสียภาษี: <b>{contact.tax_id}</b></div>}
            {contact?.phone && <div>โทร: {contact.phone}</div>}
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16,gap:32}}>
          <div><span style={{color:'#6b7280'}}>เลขที่: </span><b>{rec.doc_number}</b></div>
          <div><span style={{color:'#6b7280'}}>วันที่: </span><b>{rec.date}</b></div>
          {rec.ref_doc && <div><span style={{color:'#6b7280'}}>อ้างอิง: </span><b>{rec.ref_doc}</b></div>}
        </div>

        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16}}>
          <thead>
            <tr style={{background:'#10b981',color:'white'}}>
              <th style={{padding:'10px 12px',textAlign:'left',width:40}}>#</th>
              <th style={{padding:'10px 12px',textAlign:'left'}}>รายละเอียด</th>
              <th style={{padding:'10px 12px',textAlign:'center',width:80}}>จำนวน</th>
              <th style={{padding:'10px 12px',textAlign:'right',width:120}}>ราคา/หน่วย</th>
              <th style={{padding:'10px 12px',textAlign:'right',width:120}}>รวม</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{borderBottom:'1px solid #e5e7eb',background:i%2===0?'#fff':'#f9fafb'}}>
                <td style={{padding:'10px 12px'}}>{i+1}</td>
                <td style={{padding:'10px 12px'}}>{item.description}</td>
                <td style={{padding:'10px 12px',textAlign:'center'}}>{item.qty}</td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>{Number(item.price).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>{(Number(item.qty)*Number(item.price)).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:32}}>
          <div style={{width:280}}>
            {vatEnabled && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #e5e7eb'}}>
                  <span style={{color:'#6b7280'}}>ราคาก่อนภาษี</span>
                  <span>฿{subtotal.toLocaleString('th-TH',{minimumFractionDigits:2})}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #e5e7eb'}}>
                  <span style={{color:'#6b7280'}}>ภาษีมูลค่าเพิ่ม 7%</span>
                  <span>฿{vat.toLocaleString('th-TH',{minimumFractionDigits:2})}</span>
                </div>
              </>
            )}
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontWeight:700,fontSize:16,color:'#10b981'}}>
              <span>รวมทั้งสิ้น</span>
              <span>฿{total.toLocaleString('th-TH',{minimumFractionDigits:2})}</span>
            </div>
          </div>
        </div>

        {rec.note && <div style={{marginBottom:32,padding:12,background:'#f9fafb',borderRadius:8}}><span style={{color:'#6b7280'}}>หมายเหตุ: </span>{rec.note}</div>}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginTop:40}}>
          <div style={{textAlign:'center'}}>
            <div style={{borderTop:'1px solid #9ca3af',paddingTop:8,color:'#6b7280'}}>ลงชื่อผู้รับเงิน</div>
            <div style={{marginTop:4,color:'#9ca3af',fontSize:12}}>วันที่ ................................</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{borderTop:'1px solid #9ca3af',paddingTop:8,color:'#6b7280'}}>ลงชื่อผู้จ่ายเงิน</div>
            <div style={{marginTop:4,color:'#9ca3af',fontSize:12}}>วันที่ ................................</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ReceiptPrintPage() {
  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>กำลังโหลด...</div>}>
      <ReceiptPrint />
    </Suspense>
  )
}
