// The slice of Express that server/src/routes/api.js uses — Router() with
// get/post/put/patch/delete, path params, middleware, res.status().json() —
// so the real routes can run in the browser unchanged.
function compile(path) {
  const keys = [];
  const re = new RegExp('^' + path.replace(/\/:([A-Za-z]+)/g, (_, k) => (keys.push(k), '/([^/]+)')) + '/?$');
  return { re, keys };
}

export function Router() {
  const routes = [];
  const add = (method) => (path, ...handlers) => routes.push({ method, ...compile(path), handlers });
  const router = { get: add('GET'), post: add('POST'), put: add('PUT'), patch: add('PATCH'), delete: add('DELETE') };

  /** Run a request through the routes; resolves to { status, body }. */
  router.handle = (method, url, headers = {}, body) =>
    new Promise((resolve, reject) => {
      const path = url.split('?')[0];
      const route = routes.find((r) => r.method === method && r.re.test(path));
      if (!route) return resolve({ status: 404, body: { error: 'not found' } });
      const m = path.match(route.re);
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const req = { method, url, params, headers, body, query: {} };
      let status = 200;
      const res = {
        status(code) {
          status = code;
          return res;
        },
        json(payload) {
          resolve({ status, body: JSON.parse(JSON.stringify(payload ?? null)) });
          return res;
        },
      };
      let i = 0;
      const next = (err) => {
        if (err) return reject(err);
        const h = route.handlers[i++];
        if (!h) return;
        Promise.resolve(h(req, res, next)).catch(reject);
      };
      next();
    });

  return router;
}

export default { Router };
