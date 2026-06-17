import { supabase } from './supabase'

export async function createJournalEntry({ companyId, refDoc, refType, date, description, lines }) {
  const { data: entry, error } = await supabase.from('journal_entries').insert([{
    company_id: companyId, ref_doc: refDoc, ref_type: refType,
    date, description,
  }]).select().single()

  if (error) { console.error('Journal error:', error); return }

  await supabase.from('journal_lines').insert(
    lines.map(l => ({ journal_id: entry.id, ...l }))
  )
}

export async function cancelJournalEntry({ companyId, refDoc, date, description, lines }) {
  await createJournalEntry({
    companyId, refDoc, refType: 'cancel',
    date, description,
    lines: lines.map(l => ({ ...l, debit: l.credit, credit: l.debit }))
  })
}
