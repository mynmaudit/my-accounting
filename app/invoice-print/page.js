'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useSearchParams } from 'next/navigation'

function InvoicePrint() {
  const searchParams = useSearchParams()
  const invId = searchParams.get('id')
  const [inv, setInv] = useState(null)
  const [company, setCompany] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: invData } = await supabase.from('transactions').select('*, contacts(*)').eq('id', invId).single()
      const { data: compData } = await supabase.from('companies').select('*').eq('id', invData?.company_id).single()
      setInv(invData)
      setCompany(compData)
    }
    if (invId) init()
  }, [invId])

  useEffect(() => {
    if (inv && company) setTimeout(() => window.print(), 800)
  }, [inv, company])

  if (!inv || !company) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>กำลังโหลด...</div>

  const items = inv.items ? JSON.parse(inv.items) : [{ description: inv.description, qty: 1, price: inv.amount }]
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0)
  const vatEnabled = company.vat_enabled !== false
  const vat = vatEnabled ? subtotal * 0.07 : 0
  const total = subtotal + vat
  const contact = inv.contacts
  const isCancelled = inv.status === 'cancelled'
  const docTitle = vatEnabled ? 'ใบแจ้งหนี้ / ใบกำกับภาษี' : 'ใบแจ้งหนี้'
  const docTitleEn = vatEnabled ? 'TAX INVOICE' : 'INVOICE'

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } } * { font-family: 'Sarabun', sans-serif; }`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet" />

      <div className="no-print" style={{position:'fixed',top:16,right:16,zIndex:50,display:'flex',gap:8}}>
        <button onClick={() => window.print()} style={{background:'#4f46e5',color:'white',padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer'}}>🖨️ พิมพ์ / PDF</button>
        <button onClick={() => window.close()} style={{background:'#e5e7eb',color:'#374151',padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer'}}>✕ ปิด</button>
      </div>

      <div style={{maxWidth:794,margin:'0 auto',padding:'40px',fontSize:13,position:'relative'}}>

        {/* VOID Watermark */}
        {isCancelled && (
          <div style={{
            position:'fixed', top:'50%', left:'50%',
            transform:'translate(-50%, -50%) rotate(-45deg)',
            fontSize:120, fontWeight:900, color:'rgba(239,68,68,0.15)',
            pointerEvents:'none', zIndex:0, whiteSpace:'nowrap',
            userSelect:'none',
          }}>
            ยกเลิก / VOID
          </div>
        )}

        <div style={{position:'relative', zIndex:1}}>
          <div style={{textAlign:'center',marginBottom:24,borderBottom:`2px solid ${isCancelled?'#ef4444':'#4f46e5'}`,paddingBottom:16}}>
            <div style={{fontSize:22,fontWeight:700,color:isCancelled?'#ef4444':'#4f46e5'}}>{docTitle}</div>
            <div style={{fontSize:14,color:'#6b7280'}}>{docTitleEn}</div>
            {isCancelled && <div style={{fontSize:16,fontWeight:700,color:'#ef4444',marginTop:8,border:'2px solid #ef4444',display:'inline-block',padding:'2px 16px',borderRadius:4}}>ยกเลิก / VOID</div>}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:24}}>
            <div style={{background:isCancelled?'#fef2f2':'#f9fafb',borderRadius:8,padding:16}}>
              <div style={{fontWeight:700,color:isCancelled?'#ef4444':'#4f46e5',marginBottom:8}}>ผู้ขาย (Seller)</div>
              <div style={{fontWeight:600}}>{company.name}</div>
              {company.address && <div style={{color:'#6b7280',marginTop:4}}>{company.address}</div>}
              {company.tax_id && <div style={{marginTop:4}}>เลขผู้เสียภาษี: <b>{company.tax_id}</b></div>}
              {company.phone && <div>โทร: {company.phone}</div>}
              {company.email && <div>อีเมล: {company.email}</div>}
            </div>
            <div style={{background:isCancelled?'#fef2f2':'#f9fafb',borderRadius:8,padding:16}}>
              <div style={{fontWeight:700,color:isCancelled?'#ef4444':'#4f46e5',marginBottom:8}}>ผู้ซื้อ (Buyer)</div>
              <div style={{fontWeight:600}}>{contact?.name || inv.description}</div>
              {contact?.address && <div style={{color:'#6b7280',marginTop:4}}>{contact.address}</div>}
              {contact?.tax_id && <div style={{marginTop:4}}>เลขผู้เสียภาษี: <b>{contact.tax_id}</b></div>}
              {contact?.phone && <div>โทร: {contact.phone}</div>}
              {contact?.email && <div>อีเมล: {contact.email}</div>}
            </div>
          </div>

          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16,gap:32}}>
            <div><span style={{color:'#6b7280'}}>เลขที่: </span><b>{inv.doc_number}</b></div>
            <div><span style={{color:'#6b7280'}}>วันที่: </span><b>{inv.date}</b></div>
            {inv.ref_doc && <div><span style={{color:'#6b7280'}}>อ้างอิง SO: </span><b>{inv.ref_doc}</b></div>}
          </div>

          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16}}>
            <thead>
              <tr style={{background:isCancelled?'#ef4444':'#4f46e5',color:'white'}}>
                <th style={{padding:'10px 12px',textAlign:'left',width:40}}>#</th>
                <th style={{padding:'10px 12px',textAlign:'left'}}>รายละเอียดสินค้า/บริการ</th>
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
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontWeight:700,fontSize:16,color:isCancelled?'#ef4444':'#4f46e5'}}>
                <span>รวมทั้งสิ้น</span>
                <span>฿{total.toLocaleString('th-TH',{minimumFractionDigits:2})}</span>
              </div>
            </div>
          </div>

          {inv.note && <div style={{marginBottom:32,padding:12,background:'#f9fafb',borderRadius:8}}><span style={{color:'#6b7280'}}>หมายเหตุ: </span>{inv.note}</div>}

          {!isCancelled && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginTop:40}}>
              <div style={{textAlign:'center'}}>
                <div style={{borderTop:'1px solid #9ca3af',paddingTop:8,color:'#6b7280'}}>ลงชื่อผู้ขาย</div>
                <div style={{marginTop:4,color:'#9ca3af',fontSize:12}}>วันที่ ................................</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{borderTop:'1px solid #9ca3af',paddingTop:8,color:'#6b7280'}}>ลงชื่อผู้ซื้อ</div>
                <div style={{marginTop:4,color:'#9ca3af',fontSize:12}}>วันที่ ................................</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function InvoicePrintPage() {
  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>กำลังโหลด...</div>}>
      <InvoicePrint />
    </Suspense>
  )
}
