import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { AdBannerComponent } from '../../shared/components/ad-banner/ad-banner.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, AdBannerComponent],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayoutComponent {}
