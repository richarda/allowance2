import { Marked } from 'marked';
import interestDoc from '../../../docs/interest-for-families.md?raw';
import type { PageServerLoad } from './$types';

// Links in the doc that point at repo files (e.g. ../supabase/migrations/...) don't exist in the
// app, so show their text without a link. Anchors and absolute URLs are kept.
const marked = new Marked({
	renderer: {
		link({ href, tokens }) {
			const text = this.parser.parseInline(tokens);
			return /^(#|https?:)/.test(href) ? `<a href="${href}">${text}</a>` : text;
		}
	}
});

// GitHub-style heading ids so in-page links like #changing-the-rate work.
marked.use({
	renderer: {
		heading({ tokens, depth, text }) {
			const id = text
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.trim()
				.replace(/\s+/g, '-');
			return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
		}
	}
});

// The doc ships with the app and is trusted content, so rendering it with {@html} is safe.
const html = marked.parse(interestDoc) as string;

export const load: PageServerLoad = async () => ({ html });
