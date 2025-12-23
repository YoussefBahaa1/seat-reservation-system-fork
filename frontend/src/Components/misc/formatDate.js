function formatDate_yyyymmdd_to_ddmmyyyy(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

function formatDate_ddmmyyyy_to_yyyymmdd(europeanDate) {
  const [day, month, year] = europeanDate.split(".");
  return `${year}-${month}-${day}`;
}

export {formatDate_yyyymmdd_to_ddmmyyyy, formatDate_ddmmyyyy_to_yyyymmdd};