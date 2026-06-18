'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useSearchParams } from 'next/navigation'

function DebitNotePrint() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [doc, setDoc] = useState(null)
  const [company, setCompany] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('purchase_returns').select('*, contacts(*)').eq('id', id).single()
      const { data: comp } = await supabase.from('companies').select('*').eq('id', data?.company_id).single()
      setDoc(data); setCompany(comp)
    }
    if (id) init()
  }, [id])

  useEffect(() => { if (doc && company) setTimeout(() => window.print(), 800) }, [doc, company])

  if (!doc || !company) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>กำลังโหลด...</div>

  const items = doc.items ? JSON.parse(doc.items) : []
  const vatEnabled = company.vat_enabled !== false
  const contact = doc.contacts
  const color = '#4f46e5'
  const title = vatEnabled ? 'ใบเพิ่มหนี้' : 'ใบคืนสินค้า'
  const titleEn = vatEnabled ? 'DEBIT NOTE' : 'PURCHASE RETURN'

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
          {vatEnabled && <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>ตามมาตรา 86/2 แห่งประมวลรัษฎากร</div>}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:24}}>
          <div style={{background:'#f9fafb',borderRadius:8,padding:16}}>
            <div style={{fontWeight:700,color,marginBottom:8}}>ผู้ออกเอกสาร (ผู้ซื้อ)</div>
            <div style={{fontWeight:600}}>{company.name}</div>
            {company.address && <div style={{color:'#6b7280',marginTop:4}}>{company.address}</div>}
            {company.tax_id && <div style={{marginTop:4}}>เลขประจำตัวผู้เสียภาษี: <b>{company.tax_id}</b></div>}
            {company.phone && <div>โทร: {company.phone}</div>}
            {company.email && <div>อีเมล: {company.email}</div>}
          </div>
          <div style={{background:'#f9fafb',borderRadius:8,padding:16}}>
            <div style={{fontWeight:700,color,marginBottom:8}}>ผู้รับเอกสาร (ซัพพลายเออร์)</div>
            <div style={{fontWeight:600}}>{contact?.name}</div>
            {contact?.address && <div style={{color:'#6b7280',marginTop:4}}>{contact.address}</div>}
            {contact?.tax_id && <div style={{marginTop:4}}>เลขประจำตัวผู้เสียภาษี: <b>{contact.tax_id}</b></div>}
            {contact?.phone && <div>โทร: {contact.phone}</div>}
            {contact?.email && <div>อีเมล: {contact.email}</div>}
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16,gap:32}}>
          <div><span style={{color:'#6b7280'}}>เลขที่: </span><b>{doc.doc_number}</b></div>
          <div><span style={{color:'#6b7280'}}>วันที่: </span><b>{doc.date}</b></div>
          <div><span style={{color:'#6b7280'}}>อ้างอิง GR: </span><b>{doc.ref_doc}</b></div>
        </div>

        <div style={{marginBottom:16,padding:'10px 16px',background:'#fef9c3',borderRadius:8,border:'1px solid #fde047'}}>
          <span style={{color:'#854d0e',fontWeight:600}}>เหตุผลการคืนสินค้า: </span>
          <span style={{color:'#713f12'}}>{doc.reason}</span>
        </div>

        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16}}>
          <thead>
            <tr style={{background:color,color:'white'}}>
              <th style={{padding:'10px 12px',textAlign:'left',width:40}}>#</th>
              <th style={{padding:'10px 12px',textAlign:'left',width:120}}>รหัสซัพพลายเออร์</th>
              <th style={{padding:'10px 12px',textAlign:'left'}}>รายละเอียดสินค้า</th>
              <th style={{padding:'10px 12px',textAlign:'center',width:80}}>จำนวนคืน</th>
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
                <td style={{padding:'10px 12px',textAlign:'center'}}>{item.return_qty}</td>
                <td style={{padding:'10px 12px',textAlign:'center'}}>{item.unit}</td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>{Number(item.price).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>{(Number(item.return_qty)*Number(item.price)).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:32}}>
          <div style={{width:300}}>
            {vatEnabled && <>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #e5e7eb'}}>
                <span style={{color:'#6b7280'}}>มูลค่าสินค้าที่คืน (ก่อน VAT)</span>
                <span>฿{Number(doc.amount).toLocaleString('th-TH',{minimumFractionDigits:2})}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #e5e7eb'}}>
                <span style={{color:'#6b7280'}}>ภาษีมูลค่าเพิ่ม 7%</span>
                <span>฿{Number(doc.vat).toLocaleString('th-TH',{minimumFractionDigits:2})}</span>
              </div>
            </>}
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontWeight:700,fontSize:16,color}}>
              <span>รวมทั้งสิ้น</span>
              <span>฿{Number(doc.total).toLocaleString('th-TH',{minimumFractionDigits:2})}</span>
            </div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginTop:40}}>
          <div style={{textAlign:'center'}}>
            <div style={{borderTop:'1px solid #9ca3af',paddingTop:8,color:'#6b7280'}}>ลงชื่อผู้ออกเอกสาร</div>
            <div style={{marginTop:4,color:'#9ca3af',fontSize:12}}>วันที่ ................................</div>
            <div style={{marginTop:8,color:'#9ca3af',fontSize:12}}>({company.name})</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{borderTop:'1px solid #9ca3af',paddingTop:8,color:'#6b7280'}}>ลงชื่อผู้รับเอกสาร</div>
            <div style={{marginTop:4,color:'#9ca3af',fontSize:12}}>วันที่ ................................</div>
            <div style={{marginTop:8,color:'#9ca3af',fontSize:12}}>({contact?.name})</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function DebitNotePrintPage() {
  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>กำลังโหลด...</div>}>
      <DebitNotePrint />
    </Suspense>
  )
}
