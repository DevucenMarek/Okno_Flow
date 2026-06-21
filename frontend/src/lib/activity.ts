import { supabase } from './supabase'

export async function logActivity(
  entita_typ: 'zakazka' | 'ponuka',
  entita_id: string,
  akcia: string,
  popis: string,
  user_meno: string | null | undefined,
) {
  await supabase.from('aktivita_log').insert({
    entita_typ, entita_id, akcia, popis,
    user_meno: user_meno || 'Neznámy',
  })
}
