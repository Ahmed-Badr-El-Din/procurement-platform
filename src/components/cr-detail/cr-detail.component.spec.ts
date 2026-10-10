import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { CrApiService } from '../../api/cr-api.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('hides action buttons entirely for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		// The actions section should not be rendered at all for read-only users
		expect(fixture.nativeElement.querySelector('.cr-actions')).toBeNull();
	});

	it('renders timeline in chronological order (oldest first)', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const entries = fixture.nativeElement.querySelectorAll('.cr-timeline__action');
		const actions = Array.from(entries).map((el: any) => el.textContent.trim());
		// CR-1 audit: CREATE (09:00) → SUBMIT (09:30) → SEND_FOR_APPROVAL (10:00)
		expect(actions).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
	});

	it('shows diff rows with correct kinds for CR-1', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const rows = fixture.nativeElement.querySelectorAll('.cr-diff__row');
		const kinds = Array.from(rows).map((r: any) => r.getAttribute('data-kind'));
		// SKU-A: quantity changed 10→11, SKU-B: unchanged
		expect(kinds).toContain('changed');
		expect(kinds).toContain('unchanged');
	});

	it('enables Approve for an approver on a PENDING_APPROVAL CR', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(btn).not.toBeNull();
		expect(btn.disabled).toBe(false);
	});

	it('does not show reject textarea for read-only viewer', async () => {
		const fixture = await render(users.viewer, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('approve action updates the CR status', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const comp = fixture.componentInstance;

		await comp.approve();
		fixture.detectChanges();

		expect(comp.detail?.status).toBe('APPROVED');
		// After approval, canApprove should be false (no longer PENDING_APPROVAL)
		expect(comp.canApprove).toBe(false);
	});

	it('reject action requires a reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const comp = fixture.componentInstance;

		// Try to reject without reason
		await comp.reject();
		fixture.detectChanges();

		// Status should still be PENDING_APPROVAL (reject was blocked)
		expect(comp.detail?.status).toBe('PENDING_APPROVAL');
	});

	it('reject action works when reason is provided', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const comp = fixture.componentInstance;

		comp.rejectControl.setValue('Too expensive');
		await comp.reject();
		fixture.detectChanges();

		expect(comp.detail?.status).toBe('REJECTED');
	});

	it('shows action error when approve fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const api = TestBed.inject(CrApiService);
		api.failNext = true;

		await fixture.componentInstance.approve();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-actions__error')).not.toBeNull();
	});

	it('shows error state when CR is not found', async () => {
		const fixture = await render(users.approver, 'CR-999');
		expect(fixture.nativeElement.querySelector('.cr-detail__error')).not.toBeNull();
	});

	it('prevents double submit while approve is in progress', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const comp = fixture.componentInstance;

		// Start approve without await
		const p1 = comp.approve();
		expect(comp.submitting).toBe(true);

		// Second call should be guarded
		const p2 = comp.approve();
		await Promise.all([p1, p2]);

		fixture.detectChanges();
		expect(comp.detail?.status).toBe('APPROVED');
	});

	it('displays totals and delta correctly', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const totals = fixture.nativeElement.querySelector('.cr-detail__totals');
		expect(totals.textContent).toContain('8,000.00');
		expect(totals.textContent).toContain('8,500.00');
		const delta = fixture.nativeElement.querySelector('.cr-detail__delta');
		expect(delta.textContent).toContain('500.00');
	});

	it('disables approve button for a non-PENDING_APPROVAL CR', async () => {
		const fixture = await render(users.approver, 'CR-2'); // CR-2 is APPLIED
		const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.cr-actions__approve');
		if (btn) {
			expect(btn.disabled).toBe(true);
		}
	});

	it('shows loading state while fetching', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 500;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentInstance.id = 'CR-1';
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-detail__loading')).not.toBeNull();
		api.latencyMs = 0;
	});
});
