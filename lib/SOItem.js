export function SOItems({ items }) {
  if (!items) return null
  const parsed = typeof items === 'string' ? JSON.parse(items) : items
  const total = parsed.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0)
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <table style={{width:'100%',fontSize:12}}>
        <thead>
          <tr style={{color:'#9ca3af'}}>
            <th style={{textAlign:'left',paddingBottom:4}}>รายการ</th>
            <th style={{textAlign:'center',paddingBottom:4}}>จำนวน</th>
            <th style={{textAlign:'right',paddingBottom:4}}>ราคา/หน่วย</th>
            <th style={{textAlign:'right',paddingBottom:4}}>รวม</th>
          </tr>
        </thead>
        <tbody>
          {parsed.map((item, i) => (
            <tr key={i} style={{borderTop:'1px solid #f3f4f6'}}>
              <td style={{padding:'4px 0'}}>{item.description}</td>
              <td style={{textAlign:'center',color:'#6b7280'}}>{item.qty}</td>
              <td style={{textAlign:'right',color:'#6b7280'}}>฿{Number(item.price).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
              <td style={{textAlign:'right',fontWeight:600}}>฿{(Number(item.qty)*Number(item.price)).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{borderTop:'2px solid #e5e7eb'}}>
            <td colSpan={3} style={{paddingTop:6,fontWeight:700,color:'#374151'}}>รวม</td>
            <td style={{textAlign:'right',fontWeight:700,color:'#4f46e5',paddingTop:6}}>฿{total.toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
