export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string): string {
  const date: Date = new Date(value);
  if (isNaN(date.getTime())) {
    return value;
  }

  const day: string = ('0' + String(date.getDate())).slice(-2);
  const month: string = ('0' + String(date.getMonth() + 1)).slice(-2);
  const year: number = date.getFullYear();
  const hours: string = ('0' + String(date.getHours())).slice(-2);
  const minutes: string = ('0' + String(date.getMinutes())).slice(-2);
  const seconds: string = ('0' + String(date.getSeconds())).slice(-2);

  return day + '/' + month + '/' + String(year) + ' ' + hours + ':' + minutes + ':' + seconds;
}
