import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuotaService } from '../../core/services/quota.service';
import { FeedbackBoxComponent } from '../../shared/components/feedback-box/feedback-box.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FeedbackBoxComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  quota = inject(QuotaService);
}
