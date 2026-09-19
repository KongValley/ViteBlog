// 日期的中文格式化(三个主题的首页与文章页共用)
export function formatDate(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split(' ')[0].split('-');
  if (!m) return y;
  const day = d ? ` ${Number(d)} 日` : '';
  return `${y} 年 ${Number(m)} 月${day}`;
}

// 只要年月(编辑排版主题的"最新文章"栏目用)
export function formatMonth(date: string): string {
  if (!date) return '';
  const [y, m] = date.split(' ')[0].split('-');
  if (!m) return y;
  return `${y} 年 ${Number(m)} 月`;
}

// 紧凑日期(编辑排版主题的列表右栏用,避免窄列换行):2026.09.19
export function formatDateCompact(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split(' ')[0].split('-');
  if (!m) return y;
  return d ? `${y}.${m}.${d}` : `${y}.${m}`;
}
