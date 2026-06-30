import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatBRL(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safeValue)
}

export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (Number.isNaN(d.getTime())) return 'Data inválida'
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatMonth(monthStr: string): string {
  // monthStr is "YYYY-MM"
  const [year, month] = monthStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(d.getTime())) return monthStr
  return format(d, 'MMM/yy', { locale: ptBR })
}

export function formatMonthFull(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(d.getTime())) return monthStr
  return format(d, 'MMMM yyyy', { locale: ptBR })
}

export function formatPercent(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return `${safeValue >= 0 ? '+' : ''}${safeValue.toFixed(2)}%`
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}
