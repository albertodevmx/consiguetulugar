import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { QuotaService } from '../../../core/services/quota.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  auth = inject(AuthService);
  private quota = inject(QuotaService);

  /** Premium users go to /practicar, others go to /explore */
  practiceLink = computed(() => this.quota.isFree() ? '/explore' : '/practicar');
}
