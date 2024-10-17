# Vite Plugin - Hono File Route Generator

A vite plugin that scans a folder, grabs all default exports, and generates a js/ts file that exports an array for mounting.
You can loop through this array and mount it to your Hono application.

First, you need to enable and configure the plugin in vite.

```js
export default defineConfig({
	plugins: [
		honoFileRouteGenerator({
			generate: {
				'./routes': './routes/api.ts',
			},
		}),
	],
});
```

Then create your endpoints.

```js
// routes/hi/get.ts
export default const app = new Hono().get('/hi', (c) => c.text('Hi!'));
```

```js
// routes/hello/get.ts
export default const app = new Hono().get('/hello', (c) => c.text('Hello!'));
```

```js
// routes/index.ts
import routes from './api.ts';
const app = new Hono();
routes.forEach((route) => app.route('/', route));
export default app;
```

During saving, this plugin will generate `./routes/api.ts` that will look like this.

```js
import route1 from './routes/update/more';
import route2 from './routes/update/routes.update';
*
export default [route1, route2];
export type Route = typeof route1 & typeof route2;
```
