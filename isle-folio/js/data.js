/* Portfolio content, loaded from data.json. Other modules import DATA and read it after loadData() resolves. */
export let DATA = null;

export async function loadData(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return DATA = await res.json();
}
