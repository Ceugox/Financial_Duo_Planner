import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatMonth(monthStr: string): string {
  // monthStr is "YYYY-MM"
  const [year, month] = monthStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return format(d, 'MMM/yy', { locale: ptBR })
}

export function formatMonthFull(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return format(d, 'MMMM yyyy', { locale: ptBR })
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}
