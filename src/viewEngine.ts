import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

/**
 * Minimal Express view engine for Handlebars, replacing express-handlebars.
 *
 * Renders the view, then wraps it in views/layouts/main.hbs as {{{body}}}, trimming
 * templates and output exactly as express-handlebars did. This app uses no helpers or
 * partials. Compiled templates are cached only when Express's "view cache" is on.
 */
const compiled = new Map<string, HandlebarsTemplateDelegate>();

function load(file: string, cache: boolean): HandlebarsTemplateDelegate {
	let template = cache ? compiled.get(file) : undefined;
	if (template === undefined) {
		template = Handlebars.compile(fs.readFileSync(file, "utf8").trim());
		if (cache) {
			compiled.set(file, template);
		}
	}
	return template;
}

export function handlebarsEngine(filePath: string, options: object, callback: (err: unknown, html?: string) => void): void {
	try {
		const cache = (options as {cache?: boolean}).cache === true;
		const body = load(filePath, cache)(options).trim();
		const layout = path.join(path.dirname(filePath), "layouts", "main.hbs");
		callback(null, load(layout, cache)({...options, body}).trim());
	} catch (err) {
		callback(err);
	}
}
