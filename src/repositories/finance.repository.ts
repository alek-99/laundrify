import { getDatabase } from "../database";

export async function getFinanceSummary(startDate: string, endDate: string) {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{
    income: number;
    expense: number;
    total_transactions: number;
  }>(
    `SELECT
      COALESCE(
        SUM(CASE WHEN direction = 'income'
          THEN amount ELSE 0 END), 0
      ) AS income,

      COALESCE(
        SUM(CASE WHEN direction = 'expense'
          THEN amount ELSE 0 END), 0
      ) AS expense,

      COUNT(*) AS total_transactions

     FROM cash_transactions
     WHERE is_void = 0
       AND transaction_date >= ?
       AND transaction_date < ?`,
    startDate,
    endDate,
  );

  const income = result?.income ?? 0;
  const expense = result?.expense ?? 0;

  return {
    income,
    expense,
    netCashFlow: income - expense,
    totalTransactions: result?.total_transactions ?? 0,
  };
}

export async function getFinanceByCategory(startDate: string, endDate: string) {
  const db = await getDatabase();

  return db.getAllAsync(
    `SELECT
      c.id,
      c.name,
      t.direction,
      SUM(t.amount) AS total
     FROM cash_transactions t
     JOIN cash_categories c ON c.id = t.category_id
     WHERE t.is_void = 0
       AND t.transaction_date >= ?
       AND t.transaction_date < ?
     GROUP BY c.id, c.name, t.direction
     ORDER BY total DESC`,
    startDate,
    endDate,
  );
}

export async function getMonthlyFinance(year: number) {
  const db = await getDatabase();

  return db.getAllAsync(
    `SELECT
      strftime('%m', transaction_date) AS month,
      SUM(CASE WHEN direction = 'income'
        THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN direction = 'expense'
        THEN amount ELSE 0 END) AS expense
     FROM cash_transactions
     WHERE is_void = 0
       AND strftime('%Y', transaction_date) = ?
     GROUP BY strftime('%m', transaction_date)
     ORDER BY month ASC`,
    String(year),
  );
}
