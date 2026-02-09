import { Component, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

@Component({
  selector: 'app-ad-banner',
  standalone: true,
  template: `
    <div class="ad-banner">
      <ins class="adsbygoogle"
        style="display:block"
        data-ad-client="ca-pub-4782179178791391"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      ></ins>
    </div>
  `,
  styles: [`
    .ad-banner {
      position: sticky;
      top: 0;
      z-index: 1040;
      background: #f8f9fa;
      text-align: center;
      min-height: 50px;
      overflow: hidden;
    }
  `],
})
export class AdBannerComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // AdSense not loaded (ad blocker or dev environment)
      }
    }
  }
}
