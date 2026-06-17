# My Accounting — Project Context

## Stack
- Frontend: Next.js 16 + Tailwind CSS v4
- Database: Supabase (PostgreSQL)
- Hosting: Vercel
- URL: https://my-accounting-six.vercel.app

## Database Tables
- companies (name, tax_id, address, phone, email, website, vat_enabled, created_at)
- contacts (code, name, tax_id, address, phone, email, contact_type, credit_limit, credit_days, company_id)
- transactions (type: so/invoice/receipt, doc_number, date, description, amount, status, contact_id, company_id, items, note, ref_doc)
- journal_entries (company_id, ref_doc, ref_type, date, description)
- journal_lines (journal_id, account_code, account_name, debit, credit)

## Account Codes
- 1000 = เงินสด/ธนาคาร
- 1100 = ลูกหนี้การค้า
- 2100 = ภาษีมูลค่าเพิ่มขาย
- 4000 = รายได้จากการขาย

## Modules ที่ทำแล้ว
- Login / สมัครสมาชิก / รีเซ็ตรหัสผ่าน
- Dashboard เลือกบริษัท
- ตั้งค่า ข้อมูลบริษัท + VAT toggle
- คู่ค้า ลูกค้า/ซัพพลายเออร์ + Credit Limit/Days
- Module ขาย: SO / Invoice / ใบเสร็จ / Journal อัตโนมัติ / PDF / Excel / กดขยายดูสินค้า
- Module รายงาน: รายงานการขาย / รายงานสินค้า / P&L เบื้องต้น

## Modules ที่ยังต้องทำ
- Module จัดซื้อ (PO / รับสินค้า / จ่ายเงิน)
- Module ลูกหนี้ / เจ้าหนี้ (Aging Report)
- Module คลังสินค้า (สต็อก / ต้นทุนถัวเฉลี่ย)
- Module PPE (ค่าเสื่อมราคา)
- งบดุล / งบกระแสเงินสด
- ระบบ User / สิทธิ์
- Dashboard ภาพรวม

## Business Logic
- VAT ตั้งค่าต่อบริษัท เปิด = คิด 7% อัตโนมัติ
- เลขเอกสาร: SO-YYYY-XXXX / INV-YYYY-XXXX / REC-YYYY-XXXX
- Workflow: SO → Invoice → รับเงิน → ใบเสร็จ
- ยกเลิก Invoice → SO กลับเป็น open
- Journal Entry อัตโนมัติทุก Invoice / รับเงิน / ยกเลิก
- ใบที่ยกเลิกประทับ VOID สีแดงบน PDF

## Files สำคัญ
- lib/supabase.js
- lib/journal.js
- lib/excel.js
- lib/SOItem.js
- app/company/[id]/sale/page.js
- app/company/[id]/contacts/page.js
- app/company/[id]/admin/page.js
- app/company/[id]/report/page.js
- app/invoice-print/page.js
- app/receipt-print/page.js
