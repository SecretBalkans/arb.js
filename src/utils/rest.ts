import fetch from 'node-fetch';

export async function fetchTimeout(url, options = {}, timeout = 25000) {
  if (!url || url.startsWith('undefined')) {
    throw new Error(`Url not resolved - ${url}`);
  }
  let resolved = false;
  const response = await Promise.race([
    fetch(url, { ...options }).then((result) => !resolved && (resolved = true) && result).catch(err => {
      console.error(err, url);
    }),
    new Promise((_, reject) =>
      setTimeout(() => !resolved && (resolved = true) && reject(new Error(`url timeout - ${url}`)), timeout),
    ),
  ]);
  let text;
  try {
    text = await (response as any).text();
    return JSON.parse(text);
  } catch (err) {
    throw text ? new Error(`${text} / ${url}`) : err;
  }
}
