import { getDatabase } from '../database';
import type { CashCategory, CashDirection } from '../types/database';

export async function createCashCategory(input:{name:string;type:CashDirection;description?:string|null}) {
 const db=await getDatabase(); const name=input.name.trim(); if(!name) throw new Error('Nama kategori wajib diisi');
 const result=await db.runAsync(`INSERT INTO cash_categories(name,type,description) VALUES(?,?,?)`,name,input.type,input.description?.trim()||null);
 return db.getFirstAsync<CashCategory>(`SELECT * FROM cash_categories WHERE id=?`,result.lastInsertRowId);
}
export async function getCashCategories(type?:CashDirection,activeOnly=true) {
 const db=await getDatabase();
 return db.getAllAsync<CashCategory>(`SELECT * FROM cash_categories WHERE (? IS NULL OR type=?) AND (?=0 OR is_active=1) ORDER BY type,name COLLATE NOCASE`,type??null,type??null,activeOnly?1:0);
}
export async function updateCashCategory(id:number,input:{name:string;type:CashDirection;description?:string|null}) {
 const db=await getDatabase(); if(!input.name.trim()) throw new Error('Nama kategori wajib diisi');
 const r=await db.runAsync(`UPDATE cash_categories SET name=?,type=?,description=? WHERE id=?`,input.name.trim(),input.type,input.description?.trim()||null,id);
 if(!r.changes) throw new Error('Kategori tidak ditemukan'); return true;
}
export async function setCashCategoryActive(id:number,active:boolean) {
 const db=await getDatabase(); const r=await db.runAsync(`UPDATE cash_categories SET is_active=? WHERE id=?`,active?1:0,id); if(!r.changes) throw new Error('Kategori tidak ditemukan'); return true;
}
