import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuotaService } from '../../core/services/quota.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  quota = inject(QuotaService);
}
