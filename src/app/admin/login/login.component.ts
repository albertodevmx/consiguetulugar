import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  errorMessage = signal('');
  loading = signal(false);

  async onSubmit() {
    this.errorMessage.set('');
    this.loading.set(true);

    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch {
      this.errorMessage.set('Correo o contrasena incorrectos.');
    } finally {
      this.loading.set(false);
    }
  }
}
