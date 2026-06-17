import * as XLSX from 'xlsx'

export function exportExcel({ filename, sheets }) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws, name)
  })
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
