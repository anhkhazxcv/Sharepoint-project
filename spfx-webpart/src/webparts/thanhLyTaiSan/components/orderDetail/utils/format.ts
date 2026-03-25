export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string): string {
  var date: Date = new Date(value);
  var day: string = ('0' + String(date.getDate())).slice(-2);
  var month: string = ('0' + String(date.getMonth() + 1)).slice(-2);
  var year: number = date.getFullYear();

  return day + '/' + month + '/' + String(year);
}
