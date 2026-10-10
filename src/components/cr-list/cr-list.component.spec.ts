import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrListComponent } from './cr-list.component';
import { SessionService } from '../../session/session.service';
import { CrApiService } from '../../api/cr-api.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser): Promise<ComponentFixture<CrListComponent>> {
	TestBed.configureTestingModule({
		imports: [CrListComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrListComponent);
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded/empty state
	return fixture;
}

describe('CrListComponent', () => {
	it('renders a row per change request in the user org', async () => {
		const fixture = await render(users.approver);
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3); // org-alpha: CR-1, CR-2, CR-3
	});

	it('shows the empty state when the org has no change requests', async () => {
		const fixture = await render({ id: 'x', orgCode: 'org-empty', policies: ['cr_r_o'] });
		expect(fixture.nativeElement.querySelector('.cr-list__empty')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});

	it('shows the loading state initially', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }],
		});
		await TestBed.compileComponents();
		const fixture = TestBed.createComponent(CrListComponent);
		fixture.detectChanges(); // ngOnInit triggers load() → state = loading
		// Before flush, we should see the loading message
		expect(fixture.nativeElement.querySelector('.cr-list__loading')).not.toBeNull();
	});

	it('filters rows by PENDING_APPROVAL status', async () => {
		const fixture = await render(users.approver);
		const comp = fixture.componentInstance;

		comp.onFilterChange('PENDING_APPROVAL');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(1);
	});

	it('shows all rows when filter is ALL', async () => {
		const fixture = await render(users.approver);
		const comp = fixture.componentInstance;

		comp.onFilterChange('PENDING_APPROVAL');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(1);

		comp.onFilterChange('ALL');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3);
	});

	it('shows 0 rows when filtering by a status with no matching CRs', async () => {
		const fixture = await render(users.approver);
		fixture.componentInstance.onFilterChange('CANCELLED');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(0);
	});

	it('emits select event when a row is clicked', async () => {
		const fixture = await render(users.approver);
		const spy = jest.spyOn(fixture.componentInstance.select, 'emit');
		const firstRow = fixture.nativeElement.querySelector('.cr-list__row');
		firstRow.click();
		expect(spy).toHaveBeenCalledWith('CR-1');
	});

	it('shows the error state when API fails', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.failNext = true;
		const fixture = TestBed.createComponent(CrListComponent);
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-list__error')).not.toBeNull();
	});

	it('only shows CRs from the user org', async () => {
		const fixture = await render(users.otherOrg); // org-beta
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(1); // only CR-9
	});

	it('filters by DRAFT status correctly', async () => {
		const fixture = await render(users.approver);
		fixture.componentInstance.onFilterChange('DRAFT');
		fixture.detectChanges();
		const rows = fixture.nativeElement.querySelectorAll('.cr-list__row');
		expect(rows.length).toBe(1);
		expect(rows[0].textContent).toContain('CR-3');
	});
});
