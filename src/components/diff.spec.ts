import { computeDiff } from './diff.util';
import { LineItem } from '../models/cr.models';

const base: LineItem[] = [
	{ sku: 'SKU-A', description: 'Widget A', quantity: 10, unitPrice: 500 },
	{ sku: 'SKU-B', description: 'Widget B', quantity: 30, unitPrice: 100 },
];

describe('computeDiff', () => {
	it('detects a removed sku', () => {
		expect(computeDiff(base, [base[0]]).find((r) => r.sku === 'SKU-B')?.kind).toBe('removed');
	});

	it('detects an added sku', () => {
		const rows = computeDiff(base, [...base, { sku: 'SKU-C', description: 'C', quantity: 1, unitPrice: 5 }]);
		expect(rows.find((r) => r.sku === 'SKU-C')?.kind).toBe('added');
	});

	it('detects a quantity-only change as changed', () => {
		// SKU-A quantity 10 -> 11 (same unit price) is a real change.
		const rows = computeDiff(base, [{ ...base[0], quantity: 11 }, base[1]]);
		expect(rows.find((r) => r.sku === 'SKU-A')?.kind).toBe('changed');
	});

	it('detects a description-only change as changed', () => {
		const rows = computeDiff(base, [{ ...base[0], description: 'Updated Widget A' }, base[1]]);
		expect(rows.find((r) => r.sku === 'SKU-A')?.kind).toBe('changed');
	});

	it('detects a price change as changed', () => {
		const rows = computeDiff(base, [{ ...base[0], unitPrice: 600 }, base[1]]);
		expect(rows.find((r) => r.sku === 'SKU-A')?.kind).toBe('changed');
	});

	it('marks unchanged lines as unchanged', () => {
		const rows = computeDiff(base, [...base]);
		expect(rows.every((r) => r.kind === 'unchanged')).toBe(true);
	});

	it('returns empty array for empty inputs', () => {
		expect(computeDiff([], []).length).toBe(0);
	});

	it('includes baseline and proposed in changed rows', () => {
		const rows = computeDiff(base, [{ ...base[0], quantity: 99 }, base[1]]);
		const row = rows.find((r) => r.sku === 'SKU-A');
		expect(row?.baseline?.quantity).toBe(10);
		expect(row?.proposed?.quantity).toBe(99);
	});

	it('sets proposed to undefined for removed rows', () => {
		const rows = computeDiff(base, [base[0]]);
		const removed = rows.find((r) => r.sku === 'SKU-B');
		expect(removed?.proposed).toBeUndefined();
		expect(removed?.baseline).toBeDefined();
	});

	it('sets baseline to undefined for added rows', () => {
		const rows = computeDiff([], [{ sku: 'SKU-X', description: 'X', quantity: 1, unitPrice: 10 }]);
		const added = rows.find((r) => r.sku === 'SKU-X');
		expect(added?.baseline).toBeUndefined();
		expect(added?.proposed).toBeDefined();
	});
});
