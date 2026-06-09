export const preprocessLinks = (text) =>
  (text || '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[$2](chronicle://$1)');
