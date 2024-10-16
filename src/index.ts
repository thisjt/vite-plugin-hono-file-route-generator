import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

type Options = {
	generate: Record<string, string>;
	autoformat?: boolean;
	autoformatCommand?: string;
	quotes?: '"' | "'";
};

/**
 * ## Vite Plugin - Hono File Route Generator
 * A vite plugin that scans a folder, grabs all default exports, and generates a js/ts file that exports an array for mounting.
 * You can loop through this array and mount it to your Hono application.
 * @example
 * First, you need to enable and configure the plugin in vite.
 * ```js
export default defineConfig({
    plugins: [
        honoFileRouteGenerator({
            generate: {
              './routes': './routes/api.ts',
            },
        }),
    ],
});
 * ```
 * Then create your endpoints.
 * ```js
 * // routes/hi/get.ts
 * export default const app = new Hono().get('/hi', (c) => c.text('Hi!'));
 * ```
 * .
 * ```js
 * // routes/hello/get.ts
 * export default const app = new Hono().get('/hello', (c) => c.text('Hello!'));
 * ```
 * .
 * ```js
 * // routes/index.ts
 * import routes from './api.ts';
 * const app = new Hono();
 * routes.forEach((route) => app.route('/', route));
 * export default app;
 * ```
 * During saving, this plugin will generate `./routes/api.ts` that will look like this.
 * ```js
 * import route1 from './routes/update/more';
 * import route2 from './routes/update/routes.update';
 *
 * export default [route1, route2];
 * ```
 *
 * @param {object} options
 * @param {Object<string, string>} options.generate Source folder to scan and destination to put the generated import in.
 * @example
 * ```js
export default defineConfig({
    plugins: [
        honoFileRouteGenerator({
            generate: {
              './routes': './routes/api.ts',
            },
        }),
    ],
});
 * ```
 * @param {boolean} [options.autoformat] Whether or not to run `prettier [destination] --write` or the specified autoformatCommand after generation.
 * @param {string} [options.autoformatCommand] If `autoformat` is enabled, this command will be executed using `child_process.exec`. If undefined, default command is `prettier [destination] --write`.
 * @param {"\"" | "'"} [options.quotes] Most formatting issues are caused by preference on whether to use double or single quotes. You don't have to enable `autoformat` and instead use this option
 * to pick your preferred quote.
 */
export default function honoFileRouteGenerator(options: Options) {
	const { generate, autoformat, autoformatCommand, quotes } = options;

	return {
		name: 'hono-file-route-generator',
		handleHotUpdate() {
			Object.keys(generate).forEach(async (folder) => {
				const listOfImports: string[] = [];
				const destination = cleanupPath(generate[folder]);
				const dPathArray = destination.split('/');
				dPathArray.pop();
				const destinationPath = dPathArray.join('/');

				const files = (await fs.readdir(folder, { recursive: true, withFileTypes: true }))
					.map((folders) => ({
						name: folders.name,
						path: cleanupPath(folders.parentPath),
						directory: folders.isDirectory(),
					}))
					.filter((paths) => !paths.directory);

				files.forEach((file) => {
					const filenameNoExtension = file.name.split('.');
					const fileExtension = filenameNoExtension.pop()?.toLowerCase();
					if (!fileExtension) return;
					if (fileExtension !== 'js' && fileExtension !== 'ts') return;
					const normalizedPath = cleanupPath(path.relative(destinationPath, file.path));
					listOfImports.push(`./${normalizedPath}/${filenameNoExtension.join('.')}`);
				});

				const importsListFormatted = listOfImports.map((importation, i) => `import route${i + 1} from ${quotes || "'"}${importation}${quotes || "'"};`);
				importsListFormatted.push('');
				importsListFormatted.push(`export default [${listOfImports.map((i, j) => `route${j + 1}`).join(', ')}];`);
				importsListFormatted.push('');

				const generatedJsTsFile = importsListFormatted.join('\n');

				await fs.writeFile(destination, generatedJsTsFile, { encoding: 'utf-8' });

				if (!autoformat) return;

				exec(autoformatCommand || `prettier "${destination}" --write`, (err) => {
					if (!err) return;
					throw err;
				});
			});
		},
	};
}

function cleanupPath(path: string) {
	return path.replaceAll('/./', '/').replaceAll('\\', '/');
}
