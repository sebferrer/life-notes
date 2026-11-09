import { test, expect, Phone } from './support/phone';
import { REF, RICH_V2, V037 } from './support/corpus';

// Files accepted and refused at the import: a file the V1 accepts must be accepted by the V2, with the same message
// when it is refused. The V2 only refuses more files with an invalid list of custom types (a list the V1 would ignore,
// but whose types would replace the current ones in V2).

const MESSAGES = {
	accepted: 'accepted',
	NOT_JSON: 'Le fichier doit être un fichier .json.',
	INVALID_JSON: 'Les données ne sont pas au format attendu.',
	EMPTY: 'Le fichier est vide.',
	SCHEMA: 'Les données ne correspondent pas à un fichier de sauvegarde Life Notes.'
};

type Outcome = keyof typeof MESSAGES;

const valid = V037.backup;
const json = (value: any) => JSON.stringify(value);

const CASES: { name: string, file: string, content: string | Buffer, v1: Outcome, v2?: Outcome }[] = [
	{ name: 'reference backup', file: 'life-notes-save.json', content: REF.text, v1: 'accepted' },
	{ name: 'indented JSON (edited by hand)', file: 'backup.json', content: JSON.stringify(valid, null, 2), v1: 'accepted' },
	{ name: 'UTF-8 byte order mark', file: 'backup.json', content: Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(V037.text)]), v1: 'accepted' },
	{ name: 'Windows line endings', file: 'backup.json', content: JSON.stringify(valid, null, 2).replace(/\n/g, '\r\n'), v1: 'accepted' },
	{ name: 'upper case extension', file: 'BACKUP.JSON', content: V037.text, v1: 'accepted' },
	{ name: 'name with spaces and accents', file: 'Sauvegarde été (1).json', content: V037.text, v1: 'accepted' },
	{ name: 'unknown top-level fields', file: 'backup.json', content: json({ ...valid, version: '9.9', foo: [1, 2] }), v1: 'accepted' },
	{ name: 'no day, no symptom', file: 'backup.json', content: json({ days: [], symptoms: [], settings: valid.settings }), v1: 'accepted' },
	{ name: 'empty settings', file: 'backup.json', content: json({ days: [], symptoms: [], settings: {} }), v1: 'accepted' },
	{ name: 'V2 backup with custom types', file: 'backup.json', content: RICH_V2.text, v1: 'accepted' },
	{ name: 'customTypes null', file: 'backup.json', content: json({ ...valid, customTypes: null }), v1: 'accepted' },
	{ name: 'customTypes empty', file: 'backup.json', content: json({ ...valid, customTypes: [] }), v1: 'accepted' },
	{ name: 'customTypes not a list', file: 'backup.json', content: json({ ...valid, customTypes: 'x' }), v1: 'accepted', v2: 'SCHEMA' },
	{ name: 'incomplete custom type', file: 'backup.json', content: json({ ...valid, customTypes: [{ key: 'a' }] }), v1: 'accepted', v2: 'SCHEMA' },
	{ name: 'text file', file: 'backup.txt', content: V037.text, v1: 'NOT_JSON' },
	{ name: 'no extension', file: 'backup', content: V037.text, v1: 'NOT_JSON' },
	{ name: 'empty file', file: 'backup.json', content: '', v1: 'EMPTY' },
	{ name: 'blank file', file: 'backup.json', content: '  \n\t ', v1: 'EMPTY' },
	{ name: 'truncated file', file: 'backup.json', content: V037.text.slice(0, V037.text.length / 2), v1: 'INVALID_JSON' },
	{ name: 'null', file: 'backup.json', content: 'null', v1: 'SCHEMA' },
	{ name: 'a list', file: 'backup.json', content: '[]', v1: 'SCHEMA' },
	{ name: 'a string', file: 'backup.json', content: '"backup"', v1: 'SCHEMA' },
	{ name: 'days not a list', file: 'backup.json', content: json({ ...valid, days: {} }), v1: 'SCHEMA' },
	{ name: 'no symptoms', file: 'backup.json', content: json({ days: valid.days, settings: valid.settings }), v1: 'SCHEMA' },
	{ name: 'no settings', file: 'backup.json', content: json({ days: valid.days, symptoms: valid.symptoms }), v1: 'SCHEMA' },
	{ name: 'settings a list', file: 'backup.json', content: json({ ...valid, settings: [] }), v1: 'SCHEMA' },
	{ name: 'settings null', file: 'backup.json', content: json({ ...valid, settings: null }), v1: 'SCHEMA' }
];

async function outcome(phone: Phone, file: string, content: string | Buffer): Promise<string> {
	const result = await phone.selectBackup(file, content);
	if (result.accepted) {
		await phone.cancelImport();
		return MESSAGES.accepted;
	}
	return result.error;
}

test('the V2 accepts and refuses the same files as the V1, with the same messages', async ({ phone }, testInfo) => {
	const [v1, v2] = await Promise.all([phone('phone-v1', 'v1'), phone('phone-v2', 'v2')]);
	await Promise.all([v1.firstLaunch('fr'), v2.firstLaunch('fr')]);
	const rows: string[] = [];
	for (const c of CASES) {
		const [r1, r2] = await Promise.all([outcome(v1, c.file, c.content), outcome(v2, c.file, c.content)]);
		rows.push(`${c.name} | ${r1} | ${r2}`);
		expect.soft(r1, `V1: ${c.name}`).toBe(MESSAGES[c.v1]);
		expect.soft(r2, `V2: ${c.name}`).toBe(MESSAGES[c.v2 ?? c.v1]);
	}
	await testInfo.attach('outcomes.txt', { body: ['case | V1 | V2', ...rows].join('\n'), contentType: 'text/plain' });

	// Nothing was imported: the phones are still empty
	for (const p of [v1, v2]) {
		const dump = await p.dump();
		expect(dump.days, `${p.name}: days`).toEqual([]);
		expect(dump.symptoms, `${p.name}: symptoms`).toEqual([]);
	}
});
